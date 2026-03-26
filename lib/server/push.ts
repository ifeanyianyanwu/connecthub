// lib/server/send-push.ts
// Server-only — never import this from a client component.
// Uses web-push directly rather than calling /api/push/send via HTTP,
// which would be a self-request and adds unnecessary latency.

import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Fetches all push subscriptions for a user and sends a notification to
 * each one. Automatically prunes expired subscriptions (HTTP 410 responses).
 *
 * Safe to call even if the user has no subscriptions — returns 0 in that case.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) return 0;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    url: payload.url ?? "/",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message,
      ),
    ),
  );

  // HTTP 410 = subscription has expired or user revoked permission.
  // Clean these up so we don't keep sending to dead endpoints.
  const expiredEndpoints = subscriptions
    .filter((_, i) => {
      const result = results[i];
      return (
        result.status === "rejected" &&
        (result.reason as { statusCode?: number })?.statusCode === 410
      );
    })
    .map((s) => s.endpoint);

  if (expiredEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return results.filter((r) => r.status === "fulfilled").length;
}
