import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, type AdminInitialData } from "@/components/admin-shell";

// export const dynamic = "force-dynamic"; // always SSR — data changes frequently

export default async function AdminPage() {
  const supabase = await createClient();

  // ── Auth guard ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/home");

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [
    usersCountRes,
    communitiesCountRes,
    pendingCountRes,
    resolvedCountRes,
    reportsRes,
    usersRes,
    communitiesRes,
    postsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("communities").select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
    // Latest 50 pending reports with reporter profile
    supabase
      .from("reports")
      .select(
        "*, reporter:profiles!reporter_id(id, username, display_name, profile_picture)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    // All users
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    // All communities with member counts
    supabase
      .from("communities")
      .select("*, community_members(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select(
        "id, content, image_url, created_at, community_id, user_id, " +
          "profiles:user_id(id, username, display_name, profile_picture), " +
          "communities:community_id(id, name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const initialData: AdminInitialData = {
    stats: {
      totalUsers: usersCountRes.count ?? 0,
      totalCommunities: communitiesCountRes.count ?? 0,
      pendingReports: pendingCountRes.count ?? 0,
      resolvedReports: resolvedCountRes.count ?? 0,
    },
    reports: (reportsRes.data ?? []) as AdminInitialData["reports"],
    users: (usersRes.data ?? []) as AdminInitialData["users"],
    communities: (communitiesRes.data ?? []) as AdminInitialData["communities"],
    posts: (postsRes.data ?? []) as unknown as AdminInitialData["posts"],
  };

  return <AdminShell initialData={initialData} />;
}
