import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type UsernameCheckState = {
  checking: boolean;
  isTaken: boolean;
  isAvailable: boolean;
};

export function useUsernameCheck(
  username: string,
  currentUserId?: string,
): UsernameCheckState {
  const [state, setState] = useState<UsernameCheckState>({
    checking: false,
    isTaken: false,
    isAvailable: false,
  });

  useEffect(() => {
    const trimmed = username.trim();

    // All setState calls live inside the timer — none are synchronous
    // in the effect body, which avoids cascading render warnings.
    const delay = trimmed.length >= 3 ? 500 : 0;

    const timer = setTimeout(async () => {
      if (!trimmed || trimmed.length < 3) {
        setState({ checking: false, isTaken: false, isAvailable: false });
        return;
      }

      setState({ checking: true, isTaken: false, isAvailable: false });

      try {
        const supabase = createClient();
        let query = supabase
          .from("profiles")
          .select("id")
          .eq("username", trimmed);

        // Exclude the current user so they can keep their own username
        if (currentUserId) {
          query = query.neq("id", currentUserId);
        }

        const { data } = await query.maybeSingle();
        const taken = !!data;
        setState({ checking: false, isTaken: taken, isAvailable: !taken });
      } catch {
        setState({ checking: false, isTaken: false, isAvailable: false });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [username, currentUserId]);

  return state;
}
