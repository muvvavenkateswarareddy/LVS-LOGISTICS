import { getDocuments, getDocumentTypes, getVehicles } from "@/lib/queries";
import { ReportsView } from "@/components/reports-view";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [documents, vehicles, types] = await Promise.all([getDocuments(), getVehicles(), getDocumentTypes()]);
  return <ReportsView documents={documents} vehicles={vehicles} documentTypes={types} />;
}
