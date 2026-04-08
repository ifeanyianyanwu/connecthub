import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/types";

export function useCurrentUser() {
  const [user, setUser] = useState<(User & { profile: Profile | null }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchUserWithProfile = useCallback(async (authUser: User) => {
    const supabase = createClient();

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser({
        ...authUser,
        profile,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUser({
        ...authUser,
        profile: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get initial user
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        fetchUserWithProfile(authUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserWithProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserWithProfile]);

  return { user, loading };
}
