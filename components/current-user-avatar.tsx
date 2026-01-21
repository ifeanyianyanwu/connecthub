"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUserImage } from "@/hooks/use-current-user-image";
import { useCurrentUserName } from "@/hooks/use-current-user-name";

export function CurrentUserAvatar() {
  const profilePicture = useCurrentUserImage();
  const name = useCurrentUserName();

  const initials = name
    ?.split(" ")
    ?.map((word: string[]) => word[0])
    ?.join("")
    ?.toUpperCase();

  return (
    <Avatar>
      {profilePicture && <AvatarImage src={profilePicture} alt={initials} />}
      <AvatarFallback>{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}
