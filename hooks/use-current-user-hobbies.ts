import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "./use-current-user";
import { PostgrestError } from "@supabase/supabase-js";

export function useCurrentUserHobbies() {
  const [hobbies, setHobbies] = useState<{ name: string; id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError>();
  const supabase = createClient();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    const fetchHobbies = async () => {
      const { data, error } = await supabase
        .from("user_hobbies")
        .select("hobbies(name,id)")
        .eq("user_id", user.id);

      if (error) {
        setError(error);
      } else {
        setHobbies(
          data.map((h) => ({ name: h.hobbies.name, id: h.hobbies.id })) || [],
        );
      }
      setLoading(false);
    };

    fetchHobbies();
  }, [user, supabase]);

  return { hobbies, loading, error };
}
