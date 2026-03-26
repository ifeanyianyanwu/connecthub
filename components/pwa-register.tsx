"use client";

import { useEffect } from "react";
import { subscribeUser } from "@/app/actions/push";
import { useCurrentUser } from "@/hooks/use-current-user";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PWARegister() {
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!user?.id) return;

    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      await subscribeUser(JSON.parse(JSON.stringify(sub)), user.id);
    };

    register();
  }, [user?.id]);

  return null;
}
