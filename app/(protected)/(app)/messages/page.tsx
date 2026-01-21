"use client";

import React from "react"

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useMessageStore } from '@/lib/store';
import { formatDistanceToNow, format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import Loading from './loading';

function MessagesContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    sendMessage,
  } = useMessageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setActiveConversation(conversationId);
      setShowConversationList(false);
    }
  }, [searchParams, setActiveConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversation]);

  const activeConv = conversations.find((c) => c.id === activeConversation);
  const otherParticipant = activeConv?.participants.find((p) => p.id !== user?.id);
  const activeMessages = activeConversation ? messages[activeConversation] || [] : [];

  const filteredConversations = conversations.filter((conv) => {
    const other = conv.participants.find((p) => p.id !== user?.id);
    return other?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;
    sendMessage(activeConversation, newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Conversation List */}
      <div
        className={cn(
          'w-full border-r border-border bg-card lg:w-80',
          !showConversationList && 'hidden lg:block'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-4">
            <h1 className="mb-4 text-xl font-bold">Messages</h1>
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

          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => {
                  const other = conv.participants.find((p) => p.id !== user?.id);
                  const isActive = conv.id === activeConversation;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConversation(conv.id);
                        setShowConversationList(false);
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted',
                        isActive && 'bg-muted'
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={other?.avatar || "/placeholder.svg"} alt={other?.name} />
                          <AvatarFallback>{other?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {other?.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">{other?.name}</h3>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {conv.lastMessage.senderId === user?.id && 'You: '}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="shrink-0">{conv.unreadCount}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          'flex flex-1 flex-col bg-background',
          showConversationList && 'hidden lg:flex'
        )}
      >
        {activeConversation && otherParticipant ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => {
                    setShowConversationList(true);
                    setActiveConversation(null);
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant.avatar || "/placeholder.svg"} alt={otherParticipant.name} />
                  <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{otherParticipant.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {otherParticipant.isOnline
                      ? 'Online'
                      : `Last seen ${formatDistanceToNow(new Date(otherParticipant.lastActive), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {activeMessages.map((message, index) => {
                  const isOwn = message.senderId === user?.id;
                  const showAvatar =
                    !isOwn &&
                    (index === 0 || activeMessages[index - 1].senderId !== message.senderId);
                  return (
                    <div
                      key={message.id}
                      className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}
                    >
                      {!isOwn && (
                        <Avatar className={cn('h-8 w-8', !showAvatar && 'invisible')}>
                          <AvatarImage src={otherParticipant.avatar || "/placeholder.svg"} alt={otherParticipant.name} />
                          <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          isOwn
                            ? 'rounded-br-sm bg-foreground text-background'
                            : 'rounded-bl-sm bg-muted text-foreground'
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={cn(
                            'mt-1 text-xs',
                            isOwn ? 'text-background/70' : 'text-muted-foreground'
                          )}
                        >
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Your Messages</h2>
              <p className="mt-2 text-muted-foreground">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
