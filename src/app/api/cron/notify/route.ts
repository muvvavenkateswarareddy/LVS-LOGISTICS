import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Subscription = {
  id: string;
  fleet_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Daily reminder job (Vercel Cron).
 *  1. regenerates today's notification rows for every fleet
 *  2. pushes the unsent ones to that fleet's subscribed devices
 * Idempotent: rows are deduped in Postgres and marked sent_at here.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);

  const supabase = createAdminClient();

  const { data: fleets } = await supabase.from("fleets").select("id");
  let generated = 0;
  for (const fleet of fleets ?? []) {
    const { data } = await supabase.rpc("generate_document_notifications", { p_fleet_id: fleet.id });
    generated += (data as number) ?? 0;
  }

  // one push per fleet per run: a digest, not a burst of 30 alerts
  const { data: pending } = await supabase
    .from("notifications")
    .select("id, fleet_id, title, body, severity, vehicle_id")
    .eq("channel", "in_app")
    .is("sent_at", null)
    .is("read_at", null)
    .order("severity");

  const byFleet = new Map<string, typeof pending>();
  for (const row of pending ?? []) {
    byFleet.set(row.fleet_id, [...(byFleet.get(row.fleet_id) ?? []), row]);
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, fleet_id, endpoint, p256dh, auth");

  let sent = 0;
  const expired: string[] = [];

  for (const [fleetId, rows] of byFleet) {
    if (!rows?.length) continue;
    const targets = ((subscriptions ?? []) as Subscription[]).filter((s) => s.fleet_id === fleetId);
    if (targets.length === 0) continue;

    const worst = rows[0];
    const payload = JSON.stringify({
      title: rows.length === 1 ? worst.title : `${rows.length} documents need attention`,
      body: rows.length === 1 ? worst.body : rows.slice(0, 3).map((r) => r.title).join("\n"),
      url: rows.length === 1 && worst.vehicle_id ? `/vehicles/${worst.vehicle_id}` : "/actions",
      tag: "lvs-compliance",
    });

    for (const target of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          payload,
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 = the browser dropped this subscription; stop retrying it
        if (status === 404 || status === 410) expired.push(target.id);
      }
    }

    await supabase
      .from("notifications")
      .update({ sent_at: new Date().toISOString() })
      .in("id", rows.map((r) => r.id));
  }

  if (expired.length) await supabase.from("push_subscriptions").delete().in("id", expired);

  return NextResponse.json({ ok: true, generated, pushed: sent, removedSubscriptions: expired.length });
}
