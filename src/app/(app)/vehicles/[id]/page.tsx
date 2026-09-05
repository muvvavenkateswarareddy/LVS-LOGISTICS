import { notFound } from "next/navigation";
import { getDocumentTypes, getDrivers, getSession, getVehicle, getVehicleHistory } from "@/lib/queries";
import { VehicleDetail } from "@/components/vehicle-detail";
import type { DocumentHistoryRow } from "@/lib/types";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vehicle, documentTypes, drivers, history, { fleet }] = await Promise.all([
    getVehicle(id), getDocumentTypes(), getDrivers(), getVehicleHistory(id), getSession(),
  ]);
  if (!vehicle || !fleet) notFound();

  return (
    <VehicleDetail
      vehicle={vehicle}
      documentTypes={documentTypes}
      drivers={drivers}
      history={history as unknown as DocumentHistoryRow[]}
      fleetId={fleet.id}
    />
  );
}
