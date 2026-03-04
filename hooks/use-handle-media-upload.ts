import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useCurrentUser } from "./use-current-user";

export const useHandleMediaUpload = () => {
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useCurrentUser();

  const handleMediaUpload = async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith("image/")) {
      setError("File must be an image");
      setTimeout(() => setError(null), 5000);
      return;
    }

    const MAX_FILE_SIZE = 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must not exceed 1MB");
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (!user) {
      setError("Unauthenticated user cannot upload media");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setIsUploadingMedia(true);
    setError(null);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      // Each post image gets a unique name to avoid collisions
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file, { upsert: false, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      return `${urlData.publicUrl}?t=${Date.now()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  return { handleMediaUpload, error, isUploadingMedia };
};
