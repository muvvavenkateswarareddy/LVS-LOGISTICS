import { getDocumentTypes, getDrivers, getVehicles } from "@/lib/queries";
import { VehiclesView } from "@/components/vehicles-view";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const [vehicles, types, drivers] = await Promise.all([getVehicles(), getDocumentTypes(), getDrivers()]);
  return (
    <VehiclesView vehicles={vehicles} requiredTypes={types.filter((t) => t.is_required)} drivers={drivers} />
  );
}
