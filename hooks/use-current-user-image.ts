import { useCurrentUser } from "@/components/providers/current-user-provider";

export function useCurrentUserImage() {
  const { user } = useCurrentUser();

  return user?.user_metadata?.avatar_url || user?.profile?.profile_picture;
}
