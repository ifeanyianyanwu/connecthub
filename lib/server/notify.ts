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
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  url?: string;
};

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
    read: false,
  });

  if (error) {
    console.error("[notifyUser] Failed to insert notification:", error);
    return;
  }

  // Send push to all of the recipient's subscribed devices.
  sendPushToUser(recipientId, { title, body: message, url }).catch((err) => {
    console.error("[notifyUser] Push send failed:", err);
  });
}

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
