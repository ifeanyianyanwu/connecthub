import { Database } from "./database.types";
import type { User } from "@supabase/supabase-js";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Hobby = Database["public"]["Tables"]["hobbies"]["Row"];

export type ProfileWithUser = Profile & {
  user: User;
};

// Mock Data Types
// export interface User {
//   id: string;
//   email: string;
//   name: string;
//   username: string;
//   avatar: string;
//   bio: string;
//   location: string;
//   interests: string[];
//   goals: string[];
//   joinedAt: string;
//   isOnline: boolean;
//   lastActive: string;
//   connectionsCount: number;
//   communitiesCount: number;
//   role: 'user' | 'admin';
//   isVerified: boolean;
//   privacySettings: PrivacySettings;
// }

export interface PrivacySettings {
  profileVisibility: "public" | "connections" | "private";
  showOnlineStatus: boolean;
  allowMessages: "everyone" | "connections" | "none";
  showLocation: boolean;
}

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: "image" | "file";
  url: string;
  name: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  avatar: string;
  coverImage: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  createdBy: string;
  isPrivate: boolean;
  rules: string[];
  admins: string[];
  isMember?: boolean;
}

export interface Post {
  id: string;
  communityId?: string;
  authorId: string;
  author?: User;
  content: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author?: User;
  content: string;
  createdAt: string;
  likesCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "connection_request"
    | "connection_accepted"
    | "message"
    | "community_invite"
    | "post_like"
    | "comment";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface RecommendedUser extends User {
  matchScore: number;
  sharedInterests: string[];
  mutualConnections: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCommunities: number;
  totalMessages: number;
  totalConnections: number;
  reportedContent: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedPostId?: string;
  reportedCommunityId?: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}
