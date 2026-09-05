"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/queries";
import type { ActionResult } from "@/server/documents";

/**
 * Idempotent - generates in-app rows for the reminder thresholds
 * (60/30/15/7/1/0 days). The same RPC is what a scheduled job will call
 * when email / SMS / WhatsApp channels are switched on.
 */
export async function syncNotifications(): Promise<number> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return 0;
  const { data } = await supabase.rpc("generate_document_notifications", { p_fleet_id: fleet.id });
  return (data as number) ?? 0;
}

export async function markRead(id: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllRead(): Promise<ActionResult> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found" };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("fleet_id", fleet.id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePreferences(prefs: {
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
}): Promise<ActionResult> {
  const { supabase, fleet, user } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found" };
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ fleet_id: fleet.id, user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
            { onConflict: "fleet_id,user_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
