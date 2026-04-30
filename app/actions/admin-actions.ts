"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Forbidden");

  return { supabase, userId: user.id };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function resolveReport(reportId: string) {
  const { supabase, userId } = await requireAdmin();

  const { error } = await supabase
    .from("reports")
    .update({
      status: "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function dismissReport(reportId: string) {
  const { supabase, userId } = await requireAdmin();

  const { error } = await supabase
    .from("reports")
    .update({
      status: "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ─── Communities ──────────────────────────────────────────────────────────────

export async function deleteCommunity(communityId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("communities")
    .delete()
    .eq("id", communityId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ─── Posts ────────────────────────────────────────────────────────────────────

/**
 * Deletes any post as a platform admin.
 * Also resolves any open reports that reference this post so the reports
 * queue doesn't contain stale entries pointing to deleted content.
 */
export async function adminDeletePost(
  postId: string,
  resolveReportId?: string,
) {
  const { supabase, userId } = await requireAdmin();

  // Delete the post (ON DELETE CASCADE removes likes & comments)
  const { error: postError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  console.log("Post deleted", postId);

  if (postError) throw new Error(postError.message);

  // Optionally resolve the report that triggered this deletion
  if (resolveReportId) {
    await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", resolveReportId);
  }

  // Also auto-resolve any other open reports about this post
  await supabase
    .from("reports")
    .update({
      status: "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("reported_content_id", postId)
    .eq("reported_content_type", "post")
    .eq("status", "pending");

  revalidatePath("/admin");
}
