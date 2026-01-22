import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });

export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
  } = await (await supabase).auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Fetch User's hobbies
    const { data: hobbies } = await (await supabase)
      .from("user_hobbies")
      .select("hobbies(name)")
      .eq("user_id", user.id);

    const hobbyString = hobbies?.map((h) => h.hobbies.name).join(", ");

    if (!hobbyString) {
      return NextResponse.json({ message: "No hobbies found to embed" });
    }

    // 2. Generate Embedding using Google's model
    const embedding = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: hobbyString,
      config: { outputDimensionality: 768 },
    });

    const vector = embedding.embeddings![0].values;

    // 3. Save to Supabase
    const { error } = await (
      await supabase
    )
      .from("profiles")
      .update({ hobby_embedding: JSON.stringify(vector) })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      dimensions: embedding.embeddings?.length,
    });
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 },
    );
  }
}
