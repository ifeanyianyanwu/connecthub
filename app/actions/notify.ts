"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  notifyConnectionRequest,
  notifyConnectionAccepted,
  notifyPostLiked,
  notifyNewComment,
} from "@/lib/server/notify";

// These actions are callable from the browser, so they must never trust
// client-supplied actor IDs, names or recipients. Each one takes only the ID
// of the event that happened, reads the actor from the session, confirms the
// event exists and belongs to that actor, and derives the recipient server-side.

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    name: profile?.display_name || profile?.username || "Someone",
    admin,
  };
}

export async function sendConnectionRequestNotification(targetUserId: string) {
  const actor = await getActor();
  if (!actor) return;

  const { data: connection } = await actor.admin
    .from("connections")
    .select("id")
    .eq("user1_id", actor.id)
    .eq("user2_id", targetUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (!connection) return;

  await notifyConnectionRequest(targetUserId, actor.id, actor.name);
}

export async function sendConnectionAcceptedNotification(connectionId: string) {
  const actor = await getActor();
  if (!actor) return;

  // Only the recipient of the request (user2) can accept it.
  const { data: connection } = await actor.admin
    .from("connections")
    .select("user1_id")
    .eq("id", connectionId)
    .eq("user2_id", actor.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!connection) return;

  await notifyConnectionAccepted(connection.user1_id, actor.id, actor.name);
}

export async function sendPostLikedNotification(postId: string) {
  const actor = await getActor();
  if (!actor) return;

  const { data: like } = await actor.admin
    .from("likes")
    .select("posts(user_id, community_id)")
    .eq("post_id", postId)
    .eq("user_id", actor.id)
    .maybeSingle();
  const post = like?.posts;
  if (!post) return;

  await notifyPostLiked(post.user_id, actor.id, actor.name, post.community_id);
}

export async function sendNewCommentNotification(commentId: string) {
  const actor = await getActor();
  if (!actor) return;

  const { data: comment } = await actor.admin
    .from("comments")
    .select("posts(user_id, community_id)")
    .eq("id", commentId)
    .eq("user_id", actor.id)
    .maybeSingle();
  const post = comment?.posts;
  if (!post) return;

  await notifyNewComment(post.user_id, actor.id, actor.name, post.community_id);
}
