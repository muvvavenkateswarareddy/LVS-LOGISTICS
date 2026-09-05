import Link from "next/link";
import { SearchX } from "lucide-react";
import { getDocuments, getDrivers, getVehicles } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { DocumentCard } from "@/components/document-card";
import { StatusBadge } from "@/components/status-badge";
import { getDocumentStatus } from "@/lib/status";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().toLowerCase();

  const [vehicles, documents, drivers] = await Promise.all([getVehicles(), getDocuments(), getDrivers()]);

  const matchedVehicles = term
    ? vehicles.filter((v) =>
        v.registration_number.toLowerCase().includes(term) ||
        (v.make ?? "").toLowerCase().includes(term) ||
        (v.model ?? "").toLowerCase().includes(term) ||
        (v.chassis_number ?? "").toLowerCase().includes(term) ||
        (v.driver?.name ?? "").toLowerCase().includes(term))
    : [];

  const matchedDocuments = term
    ? documents.filter((d) =>
        (d.document_number ?? "").toLowerCase().includes(term) ||
        (d.vehicle?.registration_number ?? "").toLowerCase().includes(term) ||
        (d.document_type?.name ?? "").toLowerCase().includes(term))
    : [];

  const matchedDrivers = term
    ? drivers.filter((d) =>
        d.name.toLowerCase().includes(term) ||
        (d.phone ?? "").includes(term) ||
        (d.license_number ?? "").toLowerCase().includes(term))
    : [];

  const total = matchedVehicles.length + matchedDocuments.length + matchedDrivers.length;

  return (
    <>
      <PageHeader title={q ? `Results for "${q}"` : "Search"} description={`${total} match${total === 1 ? "" : "es"} across vehicles, documents and drivers.`} />

      {total === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="No matches"
                      description="Search by vehicle registration number, document number or driver name." />
        </Card>
      ) : (
        <div className="space-y-4">
          {matchedVehicles.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Vehicles · {matchedVehicles.length}</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-2 lg:grid-cols-2">
                  {matchedVehicles.map((v) => (
                    <li key={v.id}>
                      <Link href={`/vehicles/${v.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/60">
                        <span>
                          <span className="block font-semibold">{v.registration_number}</span>
                          <span className="block text-sm text-muted-foreground">
                            {[v.vehicle_type, v.make, v.model].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-sm text-muted-foreground">{v.driver?.name ?? "Unassigned"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {matchedDocuments.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Documents · {matchedDocuments.length}</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-2 lg:grid-cols-2">
                  {matchedDocuments.slice(0, 30).map((d) => (
                    <li key={d.id}>
                      <DocumentCard
                        vehicleId={d.vehicle_id}
                        registration={d.vehicle?.registration_number ?? ""}
                        documentName={d.document_type?.name ?? "Document"}
                        documentNumber={d.document_number}
                        expiryDate={d.expiry_date}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {matchedDrivers.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Drivers · {matchedDrivers.length}</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-2 lg:grid-cols-2">
                  {matchedDrivers.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded-md border p-3">
                      <span>
                        <span className="block font-medium">{d.name}</span>
                        <span className="block text-sm text-muted-foreground">{d.phone ?? "—"} · {d.license_number ?? "No licence on file"}</span>
                      </span>
                      {d.license_expiry ? (
                        <span className="flex items-center gap-2 text-sm">
                          {formatDate(d.license_expiry)} <StatusBadge status={getDocumentStatus(d.license_expiry)} />
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
