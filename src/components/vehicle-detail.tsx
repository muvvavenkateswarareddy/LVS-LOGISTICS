"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, History, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentFormDialog } from "@/components/document-form-dialog";
import { DocumentTable } from "@/components/document-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { VehicleComplianceScore } from "@/components/vehicle-compliance-score";
import { VehicleFormDialog } from "@/components/vehicle-form-dialog";
import { deleteVehicle } from "@/server/fleet";
import { getVehicleCompliance } from "@/lib/compliance";
import { formatDate } from "@/lib/utils";
import type { DocumentHistoryRow, DocumentRow, DocumentType, Driver, VehicleWithDocuments } from "@/lib/types";

export function VehicleDetail({
  vehicle, documentTypes, drivers, history, fleetId,
}: {
  vehicle: VehicleWithDocuments;
  documentTypes: DocumentType[];
  drivers: Driver[];
  history: DocumentHistoryRow[];
  fleetId: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const requiredTypes = documentTypes.filter((t) => t.is_required);
  const compliance = getVehicleCompliance(vehicle, requiredTypes);
  const documents: DocumentRow[] = vehicle.documents
    .filter((d) => d.is_current)
    .map((d) => ({
      ...d,
      vehicle: { id: vehicle.id, registration_number: vehicle.registration_number, vehicle_type: vehicle.vehicle_type },
    }))
    .sort((a, b) => (a.expiry_date ?? "9999-12-31").localeCompare(b.expiry_date ?? "9999-12-31"));

  const facts = [
    ["Type", vehicle.vehicle_type],
    ["Make / model", [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"],
    ["Year", vehicle.manufacturing_year ?? "—"],
    ["Chassis number", vehicle.chassis_number ?? "—"],
    ["Engine number", vehicle.engine_number ?? "—"],
    ["Driver", vehicle.driver?.name ?? "Unassigned"],
    ["Purchased", formatDate(vehicle.purchase_date)],
  ] as const;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/vehicles"><ArrowLeft className="h-4 w-4" /> Vehicles</Link>
      </Button>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{vehicle.registration_number}</h1>
            <StatusBadge status={compliance.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {[vehicle.vehicle_type, vehicle.make, vehicle.model, vehicle.manufacturing_year].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add document</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Vehicle details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
            {vehicle.notes ? <p className="mt-4 rounded-md bg-muted p-3 text-sm">{vehicle.notes}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <VehicleComplianceScore
              score={compliance.score}
              validCount={compliance.validCount}
              requiredCount={compliance.requiredCount}
            />
            <p className="text-sm text-muted-foreground">
              Next expiry: <span className="font-medium text-foreground">{formatDate(compliance.nextExpiry)}</span>
            </p>
            {compliance.missingTypes.length > 0 ? (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Missing documents</p>
                <p>{compliance.missingTypes.join(", ")}</p>
              </div>
            ) : (
              <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">All required documents are on file.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add</Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DocumentTable
            documents={documents}
            documentTypes={documentTypes}
            fleetId={fleetId}
            showVehicle={false}
            emptyTitle="No documents for this vehicle"
            emptyDescription="Add insurance, fitness, permit and other documents to track their expiry."
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Document history</CardTitle></CardHeader>
        <CardContent className="p-0 sm:p-0">
          {history.length === 0 ? (
            <EmptyState icon={History} title="No renewals yet"
                        description="When you renew a document, the previous version is archived here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Previous number</TableHead>
                  <TableHead>Previous expiry</TableHead>
                  <TableHead>Replaced on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.document_type?.name ?? "Document"}</TableCell>
                    <TableCell className="text-muted-foreground">{h.document_number ?? "—"}</TableCell>
                    <TableCell>{formatDate(h.expiry_date)}</TableCell>
                    <TableCell>{formatDate(h.replaced_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DocumentFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        fleetId={fleetId}
        vehicleId={vehicle.id}
        documentTypes={documentTypes}
      />
      <VehicleFormDialog open={editOpen} onOpenChange={setEditOpen} drivers={drivers} vehicle={vehicle} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${vehicle.registration_number}?`}
        description="All of its documents and history are deleted too. This cannot be undone."
        confirmLabel="Delete vehicle"
        destructive
        onConfirm={async () => {
          const res = await deleteVehicle(vehicle.id);
          if (res.ok) { toast.success("Vehicle deleted"); router.push("/vehicles"); }
          else toast.error(res.error);
        }}
      />
    </>
  );
}
