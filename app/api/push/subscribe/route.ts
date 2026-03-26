// app/api/push/subscribe/route.ts
// Saves or removes a push subscription for the current user.
// Called by PushNotificationToggle when the user enables/disables notifications.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The shape the browser serialises a PushSubscription to when sent via JSON.
// Using our own type rather than the browser's PushSubscription class, which
// is a DOM type and doesn't exist in the Node.js API route context.
type PushSubscriptionBody = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // req.json() returns a plain object — not a PushSubscription instance,
  // so .toJSON() must not be called on it.
  const { endpoint, keys }: PushSubscriptionBody = await req.json();

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "Invalid subscription payload" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint }: { endpoint: string } = await req.json();

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ success: true });
}
