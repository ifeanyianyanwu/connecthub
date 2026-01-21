"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Notification, Connection, Conversation, Message, Community, Post } from './types';
import { currentUser, mockNotifications, mockConnections, mockConversations, mockMessages, mockCommunities, mockPosts, mockUsers } from './mock-data';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Notification) => void;
}

interface ConnectionState {
  connections: Connection[];
  pendingRequests: Connection[];
  sendRequest: (userId: string) => void;
  acceptRequest: (connectionId: string) => void;
  rejectRequest: (connectionId: string) => void;
  removeConnection: (connectionId: string) => void;
}

interface MessageState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversation: string | null;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markConversationAsRead: (conversationId: string) => void;
  startConversation: (userId: string) => string;
}

interface CommunityState {
  communities: Community[];
  joinCommunity: (communityId: string) => void;
  leaveCommunity: (communityId: string) => void;
  createCommunity: (data: Partial<Community>) => void;
}

interface PostState {
  posts: Post[];
  createPost: (data: { content: string; communityId?: string; images?: string[] }) => void;
  likePost: (postId: string) => void;
  deletePost: (postId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (email: string, _password: string) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (email) {
          set({ user: currentUser, isAuthenticated: true, isLoading: false });
          return true;
        }
        set({ isLoading: false });
        return false;
      },
      register: async (data) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const newUser: User = {
          ...currentUser,
          id: `user-${Date.now()}`,
          name: data.name,
          email: data.email,
          username: data.email.split('@')[0],
          connectionsCount: 0,
          communitiesCount: 0,
          joinedAt: new Date().toISOString(),
        };
        set({ user: newUser, isAuthenticated: true, isLoading: false });
        return true;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },
    }),
    {
      name: 'connecthub-auth',
    }
  )
);

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter((n) => !n.isRead).length,
  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    });
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: mockConnections.filter((c) => c.status === 'accepted'),
  pendingRequests: mockConnections.filter((c) => c.status === 'pending'),
  sendRequest: (userId) => {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return;
    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      userId: currentUser.id,
      connectedUserId: userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      user,
    };
    set((state) => ({
      pendingRequests: [...state.pendingRequests, newConnection],
    }));
  },
  acceptRequest: (connectionId) => {
    set((state) => {
      const request = state.pendingRequests.find((c) => c.id === connectionId);
      if (!request) return state;
      return {
        connections: [...state.connections, { ...request, status: 'accepted' }],
        pendingRequests: state.pendingRequests.filter((c) => c.id !== connectionId),
      };
    });
  },
  rejectRequest: (connectionId) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((c) => c.id !== connectionId),
    }));
  },
  removeConnection: (connectionId) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
    }));
  },
}));

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: mockConversations,
  messages: mockMessages,
  activeConversation: null,
  setActiveConversation: (id) => {
    set({ activeConversation: id });
    if (id) {
      get().markConversationAsRead(id);
    }
  },
  sendMessage: (conversationId, content) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      isRead: true,
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), newMessage],
      },
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, lastMessage: newMessage, updatedAt: newMessage.createdAt }
          : conv
      ),
    }));
  },
  markConversationAsRead: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) => ({
          ...msg,
          isRead: true,
        })),
      },
    }));
  },
  startConversation: (userId) => {
    const existingConv = get().conversations.find((c) =>
      c.participants.some((p) => p.id === userId)
    );
    if (existingConv) return existingConv.id;
    
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return '';
    
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      participants: [currentUser, user],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      messages: { ...state.messages, [newConversation.id]: [] },
    }));
    return newConversation.id;
  },
}));

export const useCommunityStore = create<CommunityState>((set) => ({
  communities: mockCommunities,
  joinCommunity: (communityId) => {
    set((state) => ({
      communities: state.communities.map((c) =>
        c.id === communityId
          ? { ...c, isMember: true, memberCount: c.memberCount + 1 }
          : c
      ),
    }));
  },
  leaveCommunity: (communityId) => {
    set((state) => ({
      communities: state.communities.map((c) =>
        c.id === communityId
          ? { ...c, isMember: false, memberCount: c.memberCount - 1 }
          : c
      ),
    }));
  },
  createCommunity: (data) => {
    const newCommunity: Community = {
      id: `comm-${Date.now()}`,
      name: data.name || 'New Community',
      description: data.description || '',
      category: data.category || 'General',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop',
      coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=400&fit=crop',
      memberCount: 1,
      postCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      isPrivate: data.isPrivate || false,
      rules: data.rules || [],
      admins: [currentUser.id],
      isMember: true,
    };
    set((state) => ({
      communities: [newCommunity, ...state.communities],
    }));
  },
}));

export const usePostStore = create<PostState>((set) => ({
  posts: mockPosts,
  createPost: (data) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      communityId: data.communityId,
      authorId: currentUser.id,
      author: currentUser,
      content: data.content,
      images: data.images,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isLiked: false,
    };
    set((state) => ({
      posts: [newPost, ...state.posts],
    }));
  },
  likePost: (postId) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      ),
    }));
  },
  deletePost: (postId) => {
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));
  },
}));

// Combined store hook for components that need access to multiple stores
export function useStore() {
  const auth = useAuthStore();
  const notifications = useNotificationStore();
  const connectionStore = useConnectionStore();
  const messages = useMessageStore();
  const communityStore = useCommunityStore();
  const postStore = usePostStore();

  return {
    // Auth
    currentUser: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    updateUser: auth.updateUser,

    // Users (mock data)
    users: mockUsers,

    // Notifications
    notifications: notifications.notifications,
    unreadNotificationCount: notifications.unreadCount,
    markNotificationAsRead: notifications.markAsRead,
    markAllNotificationsAsRead: notifications.markAllAsRead,

    // Connections
    connections: connectionStore.connections,
    pendingRequests: connectionStore.pendingRequests,
    sendConnectionRequest: async (senderId: string, receiverId: string) => {
      connectionStore.sendRequest(receiverId);
    },
    acceptConnection: connectionStore.acceptRequest,
    rejectConnection: connectionStore.rejectRequest,
    removeConnection: connectionStore.removeConnection,

    // Messages
    conversations: messages.conversations,
    messages: messages.messages,
    activeConversation: messages.activeConversation,
    setActiveConversation: messages.setActiveConversation,
    sendMessage: messages.sendMessage,
    markConversationAsRead: messages.markConversationAsRead,
    startConversation: messages.startConversation,

    // Communities
    communities: communityStore.communities,
    joinCommunity: communityStore.joinCommunity,
    leaveCommunity: communityStore.leaveCommunity,
    createCommunity: communityStore.createCommunity,

    // Posts
    posts: postStore.posts,
    createPost: postStore.createPost,
    likePost: postStore.likePost,
    deletePost: postStore.deletePost,

    // Reports and Admin Actions (mock data)
    reports: [] as Array<{
      id: string;
      reporterId: string;
      type: string;
      reason: string;
      status: string;
      createdAt: string;
    }>,
    adminActions: [] as Array<{
      id: string;
      adminId: string;
      actionType: string;
      targetType: string;
      reason: string;
      createdAt: string;
    }>,
  };
}
