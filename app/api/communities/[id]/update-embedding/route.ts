// app/api/communities/[id]/update-embedding/route.ts
//
// Generates a Gemini text embedding for a community and stores it in
// communities.hobby_embedding. Called:
//   • After community creation (from the communities page action)
//   • After community details / hobby tags are updated
//
// Security: only members with the 'admin' role on the community may call this.

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: communityId } = await params;

  if (!communityId) {
    return NextResponse.json(
      { error: "Missing community id" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // ── Auth guard ──────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins of this community may regenerate its embedding
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Allow if admin of community OR if caller is a platform admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = !!profile?.is_admin;
  const isCommunityAdmin = membership?.role === "admin";

  if (!isPlatformAdmin && !isCommunityAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Fetch community data ────────────────────────────────────────────────
  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name, description, category")
    .eq("id", communityId)
    .single();

  if (communityError || !community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Fetch tagged hobbies for richer embedding context
  const { data: hobbies } = await supabase
    .from("community_hobbies")
    .select("hobbies(name)")
    .eq("community_id", communityId);

  const hobbyNames = hobbies
    ?.map((h) => (h.hobbies as { name: string } | null)?.name)
    .filter(Boolean)
    .join(", ");

  // ── Build text representation ────────────────────────────────────────────
  // Weighted: hobbies > category > name > description
  const textParts = [
    hobbyNames ? `Hobbies: ${hobbyNames}` : "",
    community.category ? `Category: ${community.category}` : "",
    `Name: ${community.name}`,
    community.description ? `About: ${community.description}` : "",
  ].filter(Boolean);

  const textToEmbed = textParts.join(". ");

  // ── Generate embedding ──────────────────────────────────────────────────
  try {
    const embeddingResult = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: textToEmbed,
      config: { outputDimensionality: 768 },
    });

    const vector = embeddingResult.embeddings?.[0]?.values;

    if (!vector) {
      throw new Error("Empty embedding returned");
    }

    // ── Persist ─────────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("communities")
      .update({ hobby_embedding: JSON.stringify(vector) })
      .eq("id", communityId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      communityId,
      dimensions: vector.length,
    });
  } catch (error) {
    console.error("[community-embedding] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 },
    );
  }
}
