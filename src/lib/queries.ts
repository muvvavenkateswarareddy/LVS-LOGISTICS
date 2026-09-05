import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVehicleCompliance, isFullyCompliant } from "@/lib/compliance";
import { getDaysRemaining, getDocumentStatus, STATUS_ORDER } from "@/lib/status";
import type {
  AppNotification, DocumentRow, DocumentType, Driver, Fleet, VehicleWithDocuments,
} from "@/lib/types";

/** Current user + their fleet. Every page hangs off this. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: fleet } = await supabase
    .from("fleets")
    .select("id, owner_id, name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return { supabase, user, fleet: (fleet as Fleet) ?? null };
});

export const getDocumentTypes = cache(async (): Promise<DocumentType[]> => {
  const { supabase, fleet } = await getSession();
  if (!fleet) return [];
  const { data } = await supabase
    .from("document_types")
    .select("*")
    .eq("fleet_id", fleet.id)
    .eq("is_active", true)
    .order("sort_order");
  return (data as DocumentType[]) ?? [];
});

export const getDrivers = cache(async (): Promise<Driver[]> => {
  const { supabase, fleet } = await getSession();
  if (!fleet) return [];
  const { data } = await supabase.from("drivers").select("*").eq("fleet_id", fleet.id).order("name");
  return (data as Driver[]) ?? [];
});

const VEHICLE_SELECT = `
  *,
  driver:drivers(id, name, phone),
  documents(
    *,
    document_type:document_types(id, name, code, is_required)
  )
`;

export const getVehicles = cache(async (): Promise<VehicleWithDocuments[]> => {
  const { supabase, fleet } = await getSession();
  if (!fleet) return [];
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("fleet_id", fleet.id)
    .order("registration_number");
  if (error) throw new Error(error.message);
  return (data as unknown as VehicleWithDocuments[]) ?? [];
});

export async function getVehicle(id: string): Promise<VehicleWithDocuments | null> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return null;
  const { data } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("fleet_id", fleet.id)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as VehicleWithDocuments) ?? null;
}

export async function getVehicleHistory(vehicleId: string) {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("document_history")
    .select("*, document_type:document_types(name)")
    .eq("vehicle_id", vehicleId)
    .order("replaced_at", { ascending: false });
  return data ?? [];
}

export const getDocuments = cache(async (currentOnly = true): Promise<DocumentRow[]> => {
  const { supabase, fleet } = await getSession();
  if (!fleet) return [];
  let q = supabase
    .from("documents")
    .select(`*, document_type:document_types(id, name, code, is_required),
             vehicle:vehicles(id, registration_number, vehicle_type)`)
    .eq("fleet_id", fleet.id);
  if (currentOnly) q = q.eq("is_current", true);
  const { data } = await q.order("expiry_date");
  return (data as unknown as DocumentRow[]) ?? [];
});

export async function getNotifications(): Promise<AppNotification[]> {
  const { supabase, fleet } = await getSession();
  if (!fleet) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id, vehicle_id, document_id, title, body, severity, read_at, created_at")
    .eq("fleet_id", fleet.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as AppNotification[]) ?? [];
}

/** Everything the dashboard needs, computed from the database. */
export async function getDashboardData() {
  const [vehicles, types] = await Promise.all([getVehicles(), getDocumentTypes()]);
  const requiredTypes = types.filter((t) => t.is_required);
  const today = new Date();

  const compliance = vehicles.map((v) => ({
    vehicle: v,
    compliance: getVehicleCompliance(v, requiredTypes, today),
  }));

  const documents = vehicles.flatMap((v) =>
    v.documents
      .filter((d) => d.is_current)
      .map((d) => ({
        ...d,
        vehicle: { id: v.id, registration_number: v.registration_number, vehicle_type: v.vehicle_type },
        days: getDaysRemaining(d.expiry_date, today),
        status: getDocumentStatus(d.expiry_date, today),
      })),
  );

  const sorted = [...documents].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.days - b.days,
  );

  const counts = {
    vehicles: vehicles.length,
    expired: documents.filter((d) => d.status === "expired").length,
    within30: documents.filter((d) => d.days >= 0 && d.days <= 30).length,
    within60: documents.filter((d) => d.days > 30 && d.days <= 60).length,
    compliant: compliance.filter((c) => isFullyCompliant(c.compliance)).length,
    missing: compliance.filter((c) => c.compliance.missingTypes.length > 0).length,
  };

  const needAttention = compliance.filter(
    (c) => !isFullyCompliant(c.compliance) && c.compliance.status !== "expired",
  ).length;
  const critical = compliance.filter((c) => c.compliance.status === "expired").length;

  const byType = requiredTypes.map((t) => {
    const relevant = vehicles.map((v) =>
      v.documents.find((d) => d.is_current && d.document_type_id === t.id),
    );
    const ok = relevant.filter((d) => d && getDocumentStatus(d.expiry_date, today) !== "expired").length;
    return { name: t.name, percent: vehicles.length ? Math.round((ok / vehicles.length) * 100) : 0 };
  });

  return {
    counts,
    compliancePercent: vehicles.length ? Math.round((counts.compliant / vehicles.length) * 100) : 0,
    fleetSummary: { compliant: counts.compliant, needAttention, critical },
    byType,
    urgent: sorted.filter((d) => d.days <= 30).slice(0, 12),
    upcoming: sorted.filter((d) => d.days > 7 && d.days <= 60),
    compliance,
    documents: sorted,
    requiredTypes,
  };
}
