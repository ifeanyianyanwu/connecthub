import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useCurrentUser } from "./use-current-user";

export const useHandleAvatarUpload = () => {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useCurrentUser();

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("File must be an image");
      setTimeout(() => setError(null), 5000);
      return;
    }

    const MAX_FILE_SIZE = 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must not exceed 1MB");
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (!user) {
      setError("Unauthenticated user cannot upload avatar");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    let avatarUrl = " h";

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user_avatars")
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("user_avatars")
        .getPublicUrl(filePath);

      avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingAvatar(false);
    }

    return avatarUrl;
  };

  return { handleAvatarUpload, error, isUploadingAvatar };
};
