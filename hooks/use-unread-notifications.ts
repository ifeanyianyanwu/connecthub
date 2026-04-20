import { useCurrentUser } from "@/components/providers/current-user-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useUnreadNotifications() {
  const { user } = useCurrentUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    const fetchCount = async () => {
      const { count: n } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      setCount(n ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`unread-count:${user.id}`)
      // New notification inserted → increment optimistically
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Only increment if the new row is unread (it always should be, but guard anyway)
          if (!payload.new.read) {
            setCount((n) => n + 1);
          }
        },
      )
      // Notification updated (marked as read) → re-fetch accurate count
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCount();
        },
      )
      // Notification deleted → re-fetch
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return count;
}
