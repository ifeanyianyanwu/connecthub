// lib/server/notify.ts
// Single entry point for creating a notification + sending a push.
// Call this from API routes or Server Actions instead of inserting into
// the notifications table directly.
//
// Because this replaces the DB trigger approach, you should drop the
// existing notification triggers from Step 13 of the PWA guide:
//
//   drop trigger if exists trg_notify_connection_request on connections;
//   drop trigger if exists trg_notify_connection_accepted on connections;
//   drop trigger if exists trg_notify_new_message        on messages;
//   drop trigger if exists trg_notify_post_liked         on likes;
//   drop trigger if exists trg_notify_new_comment        on comments;
//   drop function if exists create_notification(uuid, text, text, text);
//   drop function if exists notify_connection_request();
//   drop function if exists notify_connection_accepted();
//   drop function if exists notify_new_message();
//   drop function if exists notify_post_liked();
//   drop function if exists notify_new_comment();

import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "./push";

type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "message"
  | "post_like"
  | "comment"
  | "community_invite";

type NotifyOptions = {
  /** The user who should receive the notification. */
  recipientId: string;
  /** The user performing the action — used to prevent self-notifications. */
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Optional deep-link URL opened when the user taps the push notification. */
  url?: string;
};

/**
 * Inserts a row into the notifications table and sends a push notification
 * to all of the recipient's registered devices.
 *
 * Returns silently if the actor and recipient are the same user.
 */
export async function notifyUser({
  recipientId,
  actorId,
  type,
  title,
  message,
  url,
}: NotifyOptions): Promise<void> {
  // Never notify users of their own actions
  if (recipientId === actorId) return;

  const supabase = await createClient();

  // Insert the in-app notification row (shown in NotificationPanel)
  const { error } = await supabase.from("notifications").insert({
    user_id: recipientId,
    type,
    title,
    message,
    is_read: false,
  });

  if (error) {
    console.error("[notifyUser] Failed to insert notification:", error);
    return;
  }

  // Send push to all of the recipient's subscribed devices.
  // This is fire-and-forget — a push failure should never break the
  // primary action (e.g. sending a message).
  sendPushToUser(recipientId, { title, body: message, url }).catch((err) => {
    console.error("[notifyUser] Push send failed:", err);
  });
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────
// These match the same notification shapes the old DB triggers produced,
// so the NotificationPanel renders them identically.

export async function notifyConnectionRequest(
  recipientId: string,
  actorId: string,
  actorName: string,
) {
  await notifyUser({
    recipientId,
    actorId,
    type: "connection_request",
    title: "New connection request",
    message: `${actorName} wants to connect with you`,
    url: `/user/${actorId}`,
  });
}

export async function notifyConnectionAccepted(
  recipientId: string,
  actorId: string,
  actorName: string,
) {
  await notifyUser({
    recipientId,
    actorId,
    type: "connection_accepted",
    title: "Connection accepted",
    message: `${actorName} accepted your connection request`,
    url: `/user/${actorId}`,
  });
}

export async function notifyNewMessage(
  recipientId: string,
  actorId: string,
  actorName: string,
) {
  await notifyUser({
    recipientId,
    actorId,
    type: "message",
    title: "New message",
    message: `${actorName} sent you a message`,
    url: `/messages?conversation=${actorId}`,
  });
}

export async function notifyPostLiked(
  postOwnerId: string,
  actorId: string,
  actorName: string,
  communityId: string,
) {
  await notifyUser({
    recipientId: postOwnerId,
    actorId,
    type: "post_like",
    title: "New like",
    message: `${actorName} liked your post`,
    url: `/communities/${communityId}`,
  });
}

export async function notifyNewComment(
  postOwnerId: string,
  actorId: string,
  actorName: string,
  communityId: string,
) {
  await notifyUser({
    recipientId: postOwnerId,
    actorId,
    type: "comment",
    title: "New comment",
    message: `${actorName} commented on your post`,
    url: `/communities/${communityId}`,
  });
}
