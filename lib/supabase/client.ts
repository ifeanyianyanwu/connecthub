import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 400,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  );
}
