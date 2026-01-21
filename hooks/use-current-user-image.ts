import { useCurrentUser } from "./use-current-user";

export function useCurrentUserImage() {
  const { user } = useCurrentUser();

  return user?.user_metadata?.avatar_url;
}
