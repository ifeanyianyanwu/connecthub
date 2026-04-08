// components/push-notification-toggle.tsx
"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/providers/current-user-provider";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();

  useEffect(() => {
    // Push notifications require both ServiceWorker and PushManager support.
    // Not available in all browsers (e.g. iOS Safari < 16.4).
    const isSupported = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(isSupported);

    if (!isSupported) return;

    // Check if this browser is already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setEnabled(!!sub);
      });
    });
  }, []);

  useEffect(() => {
    // If user is not logged in, disable the toggle
    if (user) {
      setEnabled(user.profile?.push_notifications ?? true);
    } else {
      setEnabled(false);
    }
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (checked) {
        await subscribe();
      } else {
        await unsubscribe();
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          push_notifications: checked,
        })
        .eq("id", user!.id);

      if (error) {
        console.error("Error updating notification settings", error);
        throw error;
      } else {
        setEnabled(checked);
      }
    } catch (err) {
      console.error("Push notification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    // Request notification permission from the user.
    // This shows the browser's native permission dialog.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission denied");
    }

    const reg = await navigator.serviceWorker.ready;

    // Subscribe to the push service. The browser uses the VAPID public key
    // to tie this subscription to your server.
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true, // required — means every push shows a notification
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      ) as BufferSource,
    });

    // Save the subscription to your database
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (!subscription) return;

    // Remove from database first, then unsubscribe locally
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    await subscription.unsubscribe();
  };

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications are not supported in this browser.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {/* <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      /> */}
      <Switch
        id="push-toggle"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}

// The VAPID public key is base64url-encoded. The PushManager API expects
// a Uint8Array, so we need to convert it.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
