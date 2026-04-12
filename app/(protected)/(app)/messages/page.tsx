"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { Message } from "@/lib/types";

type Conversation = {
  partner_id: string;
  partner_display_name: string;
  partner_username: string;
  partner_profile_picture: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_is_mine: boolean;
  unread_count: number;
};

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();

  const partnerIdFromUrl = searchParams.get("conversation");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(
    partnerIdFromUrl,
  );
  const [activePartner, setActivePartner] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConversationList, setShowConversationList] =
    useState(!partnerIdFromUrl);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_user_conversations", {
      user_id: user.id,
    });
    if (!error && data) {
      setConversations(data as Conversation[]);
    }
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      await fetchConversations();
      setLoadingConversations(false);
    };
    load();
  }, [fetchConversations]);

  // ── Keep activePartner in sync with conversation list ────────────────────

  useEffect(() => {
    if (!activePartnerId) {
      setActivePartner(null);
      return;
    }
    const found = conversations.find((c) => c.partner_id === activePartnerId);
    if (found) setActivePartner(found);
  }, [activePartnerId, conversations]);

  // ── Fetch messages between current user and active partner ───────────────

  useEffect(() => {
    const fetchMessagesAsync = async () => {
      if (!user?.id || !activePartnerId) return;
      setLoadingMessages(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${activePartnerId}),` +
            `and(sender_id.eq.${activePartnerId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });
      if (!error && data) setMessages(data);
      setLoadingMessages(false);
    };
    fetchMessagesAsync();
  }, [user?.id, activePartnerId]);

  // ── Mark incoming messages as read ──────────────────────────────────────

  useEffect(() => {
    if (!user?.id || !activePartnerId) return;
    const supabase = createClient();
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", activePartnerId)
      .eq("receiver_id", user.id)
      .is("read_at", null)
      .then(async () => {
        await fetchConversations();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartnerId, user?.id]);

  // ── Realtime: subscribe to new messages ─────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:user:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          if (incoming.sender_id === activePartnerId) {
            setMessages((prev) => [...prev, incoming]);
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id)
              .then(async () => {
                await fetchConversations();
              });
          } else {
            fetchConversations();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activePartnerId, fetchConversations]);

  // ── Auto-scroll to latest message ───────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send a message ───────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activePartnerId || !user?.id || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: activePartnerId,
        content,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      fetchConversations();
    } else {
      setNewMessage(content);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Select a conversation ────────────────────────────────────────────────

  const handleSelectConversation = (conv: Conversation) => {
    setActivePartnerId(conv.partner_id);
    setActivePartner(conv);
    setShowConversationList(false);
    router.replace(`/messages?conversation=${conv.partner_id}`, {
      scroll: false,
    });
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setActivePartnerId(null);
    setMessages([]);
    router.replace("/messages", { scroll: false });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatMessageTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isToday(date)
      ? format(date, "h:mm a")
      : format(date, "MMM d, h:mm a");
  };

  const getInitial = (conv: Conversation) =>
    (conv.partner_display_name || conv.partner_username || "?")
      .charAt(0)
      .toUpperCase();

  const getDisplayName = (conv: Conversation) =>
    conv.partner_display_name || conv.partner_username;

  const filteredConversations = conversations.filter((conv) => {
    const name = getDisplayName(conv) ?? "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden">
      {/* ── Conversation Sidebar ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card min-h-0 w-full shrink-0",
          "md:w-72 lg:w-80",
          !showConversationList && "hidden md:flex",
        )}
      >
        {/* Header */}
        <div className="border-b border-border p-4 shrink-0">
          <h1 className="mb-4 text-xl font-bold text-foreground">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect with people to start chatting
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => {
                  const isActive = conv.partner_id === activePartnerId;
                  return (
                    <button
                      key={conv.partner_id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted",
                        isActive && "bg-muted",
                      )}
                    >
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage
                          src={
                            conv.partner_profile_picture || "/placeholder.svg"
                          }
                          alt={getDisplayName(conv) ?? ""}
                        />
                        <AvatarFallback>{getInitial(conv)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">
                            {getDisplayName(conv)}
                          </h3>
                          {conv.last_message_at && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(conv.last_message_at),
                                { addSuffix: false },
                              )}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {conv.last_message_is_mine && "You: "}
                            {conv.last_message}
                          </p>
                        )}
                      </div>

                      {conv.unread_count > 0 && (
                        <Badge className="shrink-0 h-5 min-w-5 px-1.5 text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div
        className={cn(
          "flex flex-1 flex-col bg-background min-w-0 min-h-0",
          showConversationList && "hidden md:flex",
        )}
      >
        {activePartnerId && activePartner ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                  <AvatarImage
                    src={
                      activePartner.partner_profile_picture ||
                      "/placeholder.svg"
                    }
                    alt={getDisplayName(activePartner) ?? ""}
                  />
                  <AvatarFallback>{getInitial(activePartner)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate text-sm sm:text-base">
                    {getDisplayName(activePartner)}
                  </h2>
                  {activePartner.partner_username && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{activePartner.partner_username}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:inline-flex"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:inline-flex"
                >
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full px-3 sm:px-4">
                <div className="py-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Say hello to {getDisplayName(activePartner)}!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user?.id;
                        const prev = messages[index - 1];
                        const showAvatar =
                          !isOwn &&
                          (!prev || prev.sender_id !== message.sender_id);

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex items-end gap-2",
                              isOwn && "flex-row-reverse",
                            )}
                          >
                            {!isOwn && (
                              <Avatar
                                className={cn(
                                  "h-8 w-8 shrink-0",
                                  !showAvatar && "invisible",
                                )}
                              >
                                <AvatarImage
                                  src={
                                    activePartner.partner_profile_picture ||
                                    "/placeholder.svg"
                                  }
                                  alt={getDisplayName(activePartner) ?? ""}
                                />
                                <AvatarFallback>
                                  {getInitial(activePartner)}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div
                              className={cn(
                                "max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2",
                                isOwn
                                  ? "rounded-br-sm bg-foreground text-background"
                                  : "rounded-bl-sm bg-muted text-foreground",
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap wrap-break-word">
                                {message.content}
                              </p>
                              <p
                                className={cn(
                                  "mt-1 text-xs",
                                  isOwn
                                    ? "text-background/60"
                                    : "text-muted-foreground",
                                )}
                              >
                                {formatMessageTime(message.created_at)}
                                {isOwn && message.read_at && (
                                  <span className="ml-1">· Read</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Message Input */}
            <div className="border-t border-border p-3 sm:p-4 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hidden sm:inline-flex"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0"
                  disabled={sending}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hidden sm:inline-flex"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                  className="shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Your Messages</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
