import { Database } from "./database.types";
import type { User } from "@supabase/supabase-js";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Hobby = Database["public"]["Tables"]["hobbies"]["Row"];
export type Connection = Database["public"]["Tables"]["connections"]["Row"] & {
  user1_profile?: Profile | null;
  user2_profile?: Profile | null;
};
export type Message = Database["public"]["Tables"]["messages"]["Row"];

export type ProfileWithUser = Profile & {
  user: User;
};
