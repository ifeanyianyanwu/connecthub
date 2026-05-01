"use server";

import { createClient } from "@/lib/supabase/server";
import {
  notifyConnectionRequest,
  notifyConnectionAccepted,
} from "@/lib/server/notify";

// ─── Send a connection request ────────────────────────────────────────────────

export async function sendConnectionRequest(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthenticated");

  // 1. Insert the connection row
  const { error } = await supabase.from("connections").insert({
    user1_id: user.id,
    user2_id: targetUserId,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  // 2. Fetch the actor's display name for the notification message
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  const actorName = profile?.display_name ?? profile?.username ?? "Someone";

  // 3. Notify — inserts into notifications table + sends push.
  notifyConnectionRequest(targetUserId, user.id, actorName).catch(
    console.error,
  );
}

// ─── Accept a connection request ──────────────────────────────────────────────

export async function acceptConnectionRequest(connectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthenticated");

  // 1. Fetch the connection so we know who originally sent it
  const { data: connection, error: fetchError } = await supabase
    .from("connections")
    .select("user1_id, user2_id")
    .eq("id", connectionId)
    .single();

  if (fetchError || !connection) throw new Error("Connection not found");

  // 2. Update status to accepted
  const { error } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .eq("id", connectionId);

  if (error) throw new Error(error.message);

  // 3. Fetch the acceptor's name to include in the notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  const actorName = profile?.display_name ?? profile?.username ?? "Someone";

  // 4. Notify the original sender that their request was accepted
  notifyConnectionAccepted(connection.user1_id, user.id, actorName).catch(
    console.error,
  );
}
