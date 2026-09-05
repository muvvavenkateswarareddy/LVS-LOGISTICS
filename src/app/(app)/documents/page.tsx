import { getDocuments, getDocumentTypes, getSession } from "@/lib/queries";
import { DocumentsView } from "@/components/documents-view";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ filter }, documents, types, { fleet }] = await Promise.all([
    searchParams, getDocuments(), getDocumentTypes(), getSession(),
  ]);
  if (!fleet) return null;
  return (
    <DocumentsView documents={documents} documentTypes={types} fleetId={fleet.id} initialFilter={filter ?? "all"} />
  );
}
