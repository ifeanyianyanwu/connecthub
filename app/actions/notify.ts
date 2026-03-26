"use server";

import {
  notifyConnectionRequest,
  notifyConnectionAccepted,
  notifyNewMessage,
  notifyPostLiked,
  notifyNewComment,
} from "@/lib/server/notify";

export async function sendConnectionRequestNotification(
  recipientId: string,
  actorId: string,
  actorName: string,
) {
  return notifyConnectionRequest(recipientId, actorId, actorName);
}

export async function sendConnectionAcceptedNotification(
  recipientId: string,
  actorId: string,
  actorName: string,
) {
  return notifyConnectionAccepted(recipientId, actorId, actorName);
}

export async function sendNewMessageNotification(
  recipientId: string,
  actorId: string,
  actorName: string,
) {
  return notifyNewMessage(recipientId, actorId, actorName);
}

export async function sendPostLikedNotification(
  postOwnerId: string,
  actorId: string,
  actorName: string,
  communityId: string,
) {
  return notifyPostLiked(postOwnerId, actorId, actorName, communityId);
}

export async function sendNewCommentNotification(
  postOwnerId: string,
  actorId: string,
  actorName: string,
  communityId: string,
) {
  return notifyNewComment(postOwnerId, actorId, actorName, communityId);
}
