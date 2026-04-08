import { useCurrentUser } from "@/components/providers/current-user-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useUnreadNotifications() {
  const { user } = useCurrentUser();

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }) => setCount(count ?? 0));
  }, [user?.id]);

  return count;
}
