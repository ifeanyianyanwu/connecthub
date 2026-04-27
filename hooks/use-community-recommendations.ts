import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/providers/current-user-provider";

export type CommunityRecommendation = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string | null;
  member_count: number;
  shared_hobby_count: number;
  shared_hobbies: string[];
  exact_match_score: number;
  ai_match_score: number;
  total_score: number;
};

export function useCommunityRecommendations() {
  const { user } = useCurrentUser();
  const [recommendations, setRecommendations] = useState<
    CommunityRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      const { data, error: rpcError } = await supabase.rpc(
        "get_community_recommendations",
        { query_user_id: user.id },
      );

      if (cancelled) return;

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      setRecommendations(
        (data ?? []).map((r: CommunityRecommendation) => ({
          ...r,
          member_count: Number(r.member_count),
          shared_hobby_count: Number(r.shared_hobby_count),
          exact_match_score: Number(r.exact_match_score),
          ai_match_score: Number(r.ai_match_score),
          total_score: Number(r.total_score),
        })),
      );
      setLoading(false);
    };

    fetch();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { recommendations, loading, error };
}
