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
  X,
  Loader2,
  CheckCheck as DoubleCheck,
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

  // Pulls the live count from the shared hook — keeps the badge in the header
  // in sync when we mark items as read inside the panel.
  const unreadCount = useUnreadNotifications();

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

  // ── Real-time: push new notifications while panel is open ────────────────

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-panel:${user.id}`)
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user!.id);
  };

  // ── Mark all as read ─────────────────────────────────────────────────────

  const markAllAsRead = async () => {
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
    // flex column that fills whatever height its Sheet container gives it
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-foreground" />
          <h2 className="text-xs md:text-sm font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-medium text-background">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={markAllAsRead}
            >
              <DoubleCheck className="h-3 w-3" />
              <span className="hidden md:block">Mark all read</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      {/* ScrollArea fills remaining height — critical on mobile where
          the Sheet is 100vh and the header/footer are fixed-height. */}
      <ScrollArea className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">All caught up</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You have no notifications yet
              </p>
            </div>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] ?? Bell;
              return (
                <button
                  key={notification.id}
                  onClick={() =>
                    !notification.read && markAsRead(notification.id)
                  }
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/50 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    !notification.read && "bg-muted/30",
                  )}
                >
                  {/* Icon circle */}
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      notification.read
                        ? "bg-muted text-muted-foreground"
                        : "bg-foreground text-background",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !notification.read && "font-medium",
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70">
                      {notification.created_at &&
                        formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notification.read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
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
