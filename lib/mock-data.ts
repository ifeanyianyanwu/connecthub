import type { Notification } from "./types";

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    userId: "user-1",
    type: "connection_request",
    title: "New Connection Request",
    message: "Emily Johnson wants to connect with you",
    isRead: false,
    createdAt: "2024-03-14T11:00:00Z",
    data: { userId: "user-4" },
  },
  {
    id: "notif-2",
    userId: "user-1",
    type: "message",
    title: "New Message",
    message: "Sarah Wilson sent you a message",
    isRead: false,
    createdAt: "2024-03-14T10:30:00Z",
    data: { conversationId: "conv-1" },
  },
  {
    id: "notif-3",
    userId: "user-1",
    type: "post_like",
    title: "Post Liked",
    message: "Mike Chen liked your post",
    isRead: true,
    createdAt: "2024-03-14T09:00:00Z",
    data: { postId: "post-1" },
  },
  {
    id: "notif-4",
    userId: "user-1",
    type: "community_invite",
    title: "Community Invitation",
    message: "You have been invited to join Startup Founders",
    isRead: true,
    createdAt: "2024-03-13T18:00:00Z",
    data: { communityId: "comm-3" },
  },
];
