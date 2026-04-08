"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import {
  Bell,
  UserPlus,
  MessageCircle,
  Heart,
  Users,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

type Notification = Tables<"notifications">;

const iconMap: Record<string, React.ElementType> = {
  connection_request: UserPlus,
  connection_accepted: UserPlus,
  message: MessageCircle,
  community_invite: Users,
  post_like: Heart,
  comment: MessageCircle,
};

interface NotificationPanelProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { user } = useCurrentUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = useUnreadNotifications();

  // const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Fetch notifications ──────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) setNotifications(data);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchNotifications();
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchNotifications]);

  // ── Real-time: new notifications pushed while panel is open ─────────────

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:user:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Mark single notification as read ────────────────────────────────────

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const supabase = createClient();

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user!.id); // RLS guard
  };

  // ── Mark all as read ─────────────────────────────────────────────────────

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const supabase = createClient();

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user!.id)
      .eq("read", false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="mr-1 h-4 w-4" />
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] ?? Bell;
              return (
                <button
                  key={notification.id}
                  onClick={() =>
                    !notification.read && markAsRead(notification.id)
                  }
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted",
                    !notification.read && "bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      notification.read ? "bg-muted" : "bg-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        notification.read
                          ? "text-muted-foreground"
                          : "text-background",
                      )}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at!), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
