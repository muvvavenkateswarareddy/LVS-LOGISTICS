import { getVehicles } from "@/lib/queries";
import { CsvImport } from "@/components/csv-import";

export const metadata = { title: "Import vehicles" };

export default async function ImportPage() {
  const vehicles = await getVehicles();
  return <CsvImport existingRegistrations={vehicles.map((v) => v.registration_number)} />;
}
