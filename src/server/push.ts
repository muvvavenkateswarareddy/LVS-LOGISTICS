"use server";

import { getSession } from "@/lib/queries";
import type { ActionResult } from "@/server/documents";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
};

/** Stores one device's push subscription against the signed-in user's fleet. */
export async function savePushSubscription(sub: PushSubscriptionInput): Promise<ActionResult> {
  const { supabase, fleet, user } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      fleet_id: fleet.id,
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: sub.user_agent ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sends one test push to every device this fleet has registered. */
export async function sendTestPush(): Promise<ActionResult> {
  const { fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const webpush = (await import("web-push")).default;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { ok: false, error: "Push keys are not configured on the server" };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("fleet_id", fleet.id);

  if (!subs?.length) return { ok: false, error: "No device has enabled reminders yet" };

  const payload = JSON.stringify({
    title: "Reminders are on",
    body: "This is how expiry alerts will arrive.",
    url: "/actions",
    tag: "lvs-test",
  });

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent += 1;
    } catch {
      // dead subscriptions are cleaned up by the nightly job
    }
  }
  return sent ? { ok: true } : { ok: false, error: "Could not reach any device" };
}
