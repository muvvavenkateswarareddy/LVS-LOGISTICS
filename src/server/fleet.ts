"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/queries";
import { csvVehicleSchema, driverSchema, vehicleSchema } from "@/lib/validations";
import type { ActionResult } from "@/server/documents";

function clean<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, v === "" || v === undefined ? null : v]),
  );
}

const DUPLICATE = "A vehicle with this registration number already exists";

export async function createVehicle(raw: unknown): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...clean(parsed.data), fleet_id: fleet.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? DUPLICATE : error.message };

  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function updateVehicle(id: string, raw: unknown): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase } = await getSession();
  const { error } = await supabase.from("vehicles").update(clean(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? DUPLICATE : error.message };
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveDriver(id: string | null, raw: unknown): Promise<ActionResult> {
  const parsed = driverSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };

  const payload = clean(parsed.data);
  const { data, error } = id
    ? await supabase.from("drivers").update(payload).eq("id", id).select("id").single()
    : await supabase.from("drivers").insert({ ...payload, fleet_id: fleet.id }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function deleteDriver(id: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function assignDriver(vehicleId: string, driverId: string | null): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("vehicles").update({ driver_id: driverId }).eq("id", vehicleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export type ImportRow = { vehicle_number: string; vehicle_type?: string; make?: string; model?: string; year?: number | "" };

/** Bulk import - rows are validated client-side first, re-validated here. */
export async function importVehicles(rows: ImportRow[]): Promise<
  { ok: true; inserted: number; skipped: string[] } | { ok: false; error: string }
> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };
  if (!rows.length) return { ok: false, error: "Nothing to import" };
  if (rows.length > 1000) return { ok: false, error: "Import is limited to 1000 rows at a time" };

  const payload = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const parsed = csvVehicleSchema.safeParse(row);
    if (!parsed.success) {
      skipped.push(`${row.vehicle_number}: ${parsed.error.issues[0].message}`);
      continue;
    }
    payload.push({
      fleet_id: fleet.id,
      registration_number: parsed.data.vehicle_number,
      vehicle_type: parsed.data.vehicle_type || "Lorry",
      make: parsed.data.make || null,
      model: parsed.data.model || null,
      manufacturing_year: parsed.data.year === "" ? null : parsed.data.year ?? null,
    });
  }
  if (!payload.length) return { ok: false, error: "No valid rows to import" };

  const { data, error } = await supabase
    .from("vehicles")
    .upsert(payload, { onConflict: "fleet_id,registration_number", ignoreDuplicates: true })
    .select("id");
  if (error) return { ok: false, error: error.message };

  const inserted = data?.length ?? 0;
  if (inserted < payload.length) skipped.push(`${payload.length - inserted} row(s) already existed and were skipped`);

  await supabase.from("audit_logs").insert({
    fleet_id: fleet.id, action: "vehicles.imported", entity_type: "vehicles",
    meta: { inserted, attempted: rows.length },
  });
  revalidatePath("/", "layout");
  return { ok: true, inserted, skipped };
}

export async function seedDemoData(): Promise<ActionResult> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };
  const { error } = await supabase.rpc("seed_demo_data", { p_fleet_id: fleet.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeDemoData(): Promise<ActionResult> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };
  const { error } = await supabase.rpc("remove_demo_data", { p_fleet_id: fleet.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function renameFleet(name: string): Promise<ActionResult> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };
  if (!name.trim()) return { ok: false, error: "Fleet name is required" };
  const { error } = await supabase.from("fleets").update({ name: name.trim() }).eq("id", fleet.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
