"use client";
import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterDropdown } from "@/components/filter-dropdown";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { downloadCsv, toCsv } from "@/lib/csv";
import { getDaysRemaining, getDocumentStatus, STATUS_LABEL } from "@/lib/status";
import { getVehicleCompliance, isFullyCompliant } from "@/lib/compliance";
import { formatDate, toISODate } from "@/lib/utils";
import { FileBarChart } from "lucide-react";
import type { DocumentRow, DocumentType, VehicleWithDocuments } from "@/lib/types";

const WINDOWS = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "60", label: "Next 60 days" },
  { value: "90", label: "Next 90 days" },
];

function ExportButton({ rows, name }: { rows: Record<string, unknown>[]; name: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(`${name}-${toISODate(new Date())}.csv`, toCsv(rows))}
    >
      <Download className="h-4 w-4" /> Export CSV
    </Button>
  );
}

export function ReportsView({
  documents, vehicles, documentTypes,
}: {
  documents: DocumentRow[];
  vehicles: VehicleWithDocuments[];
  documentTypes: DocumentType[];
}) {
  const [days, setDays] = React.useState("30");
  const requiredTypes = documentTypes.filter((t) => t.is_required);

  const decorate = (d: DocumentRow) => ({
    vehicle_number: d.vehicle?.registration_number ?? "",
    document_type: d.document_type?.name ?? "",
    document_number: d.document_number ?? "",
    issue_date: d.issue_date ?? "",
    expiry_date: d.expiry_date ?? "",
    days_remaining: getDaysRemaining(d.expiry_date),
    status: STATUS_LABEL[getDocumentStatus(d.expiry_date)],
  });

  const expiring = documents
    .map(decorate)
    .filter((r) => r.days_remaining !== null && r.days_remaining >= 0 && r.days_remaining <= Number(days))
    .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0));

  const expired = documents
    .map(decorate)
    .filter((r) => r.days_remaining !== null && r.days_remaining < 0)
    .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0));

  const complianceRows = vehicles
    .map((v) => {
      const c = getVehicleCompliance(v, requiredTypes);
      return {
        vehicle_number: v.registration_number,
        vehicle_type: v.vehicle_type,
        driver: v.driver?.name ?? "",
        documents_on_file: `${c.validCount}/${c.requiredCount}`,
        compliance_percent: c.score,
        missing_documents: c.missingTypes.join(" | "),
        next_expiry: c.nextExpiry ?? "",
        status: isFullyCompliant(c) ? "Compliant" : STATUS_LABEL[c.status as never] ?? "Missing docs",
      };
    })
    .sort((a, b) => a.compliance_percent - b.compliance_percent);

  const typeRows = documentTypes.map((t) => {
    const docs = documents.filter((d) => d.document_type_id === t.id);
    const expiredCount = docs.filter((d) => getDocumentStatus(d.expiry_date) === "expired").length;
    const soon = docs.filter((d) => {
      const n = getDaysRemaining(d.expiry_date);
      return n !== null && n >= 0 && n <= 30;
    }).length;
    return {
      document_type: t.name,
      required: t.is_required ? "Yes" : "No",
      total_documents: docs.length,
      vehicles_covered: new Set(docs.map((d) => d.vehicle_id)).size,
      expired: expiredCount,
      expiring_30_days: soon,
      coverage_percent: vehicles.length ? Math.round((new Set(docs.map((d) => d.vehicle_id)).size / vehicles.length) * 100) : 0,
    };
  });

  return (
    <>
      <PageHeader title="Reports" description="Generated live from your fleet data. Export any view to CSV." />

      <Tabs defaultValue="expiring">
        <TabsList className="mb-3 flex h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="expiring">Expiring</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="compliance">Vehicle compliance</TabsTrigger>
          <TabsTrigger value="types">Document types</TabsTrigger>
        </TabsList>

        <TabsContent value="expiring">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle>Expiring documents · {expiring.length}</CardTitle>
              <div className="flex gap-2">
                <FilterDropdown value={days} onChange={setDays} options={WINDOWS} label="Window" className="w-[160px]" />
                <ExportButton rows={expiring} name={`expiring-${days}-days`} />
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {expiring.length === 0 ? (
                <EmptyState icon={FileBarChart} title="Nothing expiring in this window" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead><TableHead>Document</TableHead><TableHead>Number</TableHead>
                      <TableHead>Expiry</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiring.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.vehicle_number}</TableCell>
                        <TableCell>{r.document_type}</TableCell>
                        <TableCell className="text-muted-foreground">{r.document_number || "—"}</TableCell>
                        <TableCell>{formatDate(r.expiry_date)}</TableCell>
                        <TableCell className="tabular-nums">{r.days_remaining ?? "—"}</TableCell>
                        <TableCell><StatusBadge status={getDocumentStatus(r.expiry_date)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Expired documents · {expired.length}</CardTitle>
              <ExportButton rows={expired} name="expired-documents" />
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {expired.length === 0 ? (
                <EmptyState icon={FileBarChart} title="No expired documents" description="Great! Your fleet has no expired documents." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead><TableHead>Document</TableHead><TableHead>Number</TableHead>
                      <TableHead>Expired on</TableHead><TableHead>Days overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expired.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.vehicle_number}</TableCell>
                        <TableCell>{r.document_type}</TableCell>
                        <TableCell className="text-muted-foreground">{r.document_number || "—"}</TableCell>
                        <TableCell>{formatDate(r.expiry_date)}</TableCell>
                        <TableCell className="tabular-nums text-red-700">{Math.abs(r.days_remaining ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Vehicle compliance · {complianceRows.length}</CardTitle>
              <ExportButton rows={complianceRows} name="vehicle-compliance" />
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Documents</TableHead>
                    <TableHead>Compliance</TableHead><TableHead>Missing</TableHead><TableHead>Next expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceRows.map((r) => (
                    <TableRow key={r.vehicle_number}>
                      <TableCell className="font-medium">{r.vehicle_number}</TableCell>
                      <TableCell className="text-muted-foreground">{r.driver || "—"}</TableCell>
                      <TableCell>{r.documents_on_file}</TableCell>
                      <TableCell className="tabular-nums">{r.compliance_percent}%</TableCell>
                      <TableCell className="text-muted-foreground">{r.missing_documents || "—"}</TableCell>
                      <TableCell>{formatDate(r.next_expiry)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Document type coverage</CardTitle>
              <ExportButton rows={typeRows} name="document-type-report" />
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document type</TableHead><TableHead>Required</TableHead><TableHead>Documents</TableHead>
                    <TableHead>Vehicles covered</TableHead><TableHead>Expired</TableHead>
                    <TableHead>Expiring 30d</TableHead><TableHead>Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeRows.map((r) => (
                    <TableRow key={r.document_type}>
                      <TableCell className="font-medium">{r.document_type}</TableCell>
                      <TableCell className="text-muted-foreground">{r.required}</TableCell>
                      <TableCell>{r.total_documents}</TableCell>
                      <TableCell>{r.vehicles_covered}</TableCell>
                      <TableCell className={r.expired ? "font-medium text-red-700" : ""}>{r.expired}</TableCell>
                      <TableCell className={r.expiring_30_days ? "font-medium text-amber-700" : ""}>{r.expiring_30_days}</TableCell>
                      <TableCell className="tabular-nums">{r.coverage_percent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
