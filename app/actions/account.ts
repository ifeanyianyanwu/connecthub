"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function softDeleteAccount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Mark the profile as pending deletion
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  // Sign the user out immediately
  await supabase.auth.signOut();

  redirect("/auth/login?message=account-deletion-scheduled");
}

/**
 * Called by a scheduled job (e.g. a Supabase cron or Edge Function) after
 * the grace period expires. Deleting from auth.users cascades to profiles
 * via the FK, so all user data is removed.
 */
export async function purgeDeletedAccounts() {
  const adminSupabase = createAdminClient();

  const gracePeriodAgo = new Date();
  gracePeriodAgo.setDate(gracePeriodAgo.getDate() - 30);

  const { data: profiles } = await adminSupabase
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", gracePeriodAgo.toISOString());

  if (!profiles?.length) return;

  for (const profile of profiles) {
    await adminSupabase.auth.admin.deleteUser(profile.id);
  }
}
