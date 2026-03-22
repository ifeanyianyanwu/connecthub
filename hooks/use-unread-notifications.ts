import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "./use-current-user";
import { useEffect, useMemo, useState } from "react";

export function useUnreadNotifications() {
  const { user } = useCurrentUser();
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }) => setCount(count ?? 0));
  }, [user?.id, supabase]);

  return count;
}
