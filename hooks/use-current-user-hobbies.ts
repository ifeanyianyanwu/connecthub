import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { useCurrentUser } from "@/components/providers/current-user-provider";

export function useCurrentUserHobbies() {
  const [hobbies, setHobbies] = useState<{ name: string; id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError>();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    const fetchHobbies = async () => {
      const supabase = createClient();

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
    // eslint-disable-next-line
  }, [user?.id]);

  return { hobbies, loading, error };
}
