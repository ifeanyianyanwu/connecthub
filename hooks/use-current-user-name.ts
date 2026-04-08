import { useCurrentUser } from "@/components/providers/current-user-provider";

export function useCurrentUserName() {
  const { user } = useCurrentUser();

  return user?.user_metadata?.full_name || user?.profile?.display_name;
}
