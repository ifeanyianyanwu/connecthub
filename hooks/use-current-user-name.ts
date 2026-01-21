import { useCurrentUser } from "./use-current-user";

export function useCurrentUserName() {
  const { user } = useCurrentUser();

  return user?.user_metadata?.full_name || user?.email?.split("@")[0];
}
