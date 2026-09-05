"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { csvVehicleSchema } from "@/lib/validations";
import { importVehicles, type ImportRow } from "@/server/fleet";

type PreviewRow = { row: number; data: ImportRow; error?: string };

const TEMPLATE = "vehicle_number,vehicle_type,make,model,year\nTS09AB1234,Lorry,Tata,Prima,2022";

export function CsvImport({ existingRegistrations }: { existingRegistrations: string[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const existing = React.useMemo(() => new Set(existingRegistrations), [existingRegistrations]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.length === 0) { toast.error("That file has no data rows"); setRows([]); return; }

      const seen = new Set<string>();
      setRows(
        parsed.map((raw, i) => {
          const result = csvVehicleSchema.safeParse(raw);
          if (!result.success) {
            return { row: i + 2, data: raw as unknown as ImportRow, error: result.error.issues[0].message };
          }
          const reg = result.data.vehicle_number;
          const error = existing.has(reg)
            ? "Already in your fleet - will be skipped"
            : seen.has(reg)
              ? "Duplicate row in this file"
              : undefined;
          seen.add(reg);
          return { row: i + 2, data: { ...result.data, vehicle_number: reg }, error };
        }),
      );
    };
    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsText(file);
  }

  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/vehicles"><ArrowLeft className="h-4 w-4" /> Vehicles</Link>
      </Button>

      <PageHeader title="Import vehicles" description="Upload a CSV, check the preview, then confirm.">
        <Button variant="outline" onClick={() => downloadCsv("fleetguard-vehicle-template.csv", TEMPLATE)}>
          <Download className="h-4 w-4" /> Download template
        </Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle>1 · Choose your file</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center">
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span className="text-sm text-muted-foreground">
              {fileName || "Click to choose a .csv file"}
            </span>
            <span className="text-xs text-muted-foreground">
              Columns: vehicle_number, vehicle_type, make, model, year
            </span>
            <input type="file" accept=".csv,text/csv" className="sr-only"
                   onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card className="mt-4">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>
              2 · Preview · {valid.length} ready
              {invalid.length ? <span className="text-destructive"> · {invalid.length} with issues</span> : null}
            </CardTitle>
            <Button
              loading={importing}
              disabled={valid.length === 0}
              onClick={async () => {
                setImporting(true);
                try {
                  const res = await importVehicles(valid.map((r) => r.data));
                  if (!res.ok) { toast.error(res.error); return; }
                  toast.success(`${res.inserted} vehicle(s) imported`);
                  if (res.skipped.length) toast.message(`${res.skipped.length} row(s) skipped`);
                  router.push("/vehicles");
                  router.refresh();
                } finally {
                  setImporting(false);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Import {valid.length} vehicle{valid.length === 1 ? "" : "s"}
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead><TableHead>Vehicle number</TableHead><TableHead>Type</TableHead>
                  <TableHead>Make</TableHead><TableHead>Model</TableHead><TableHead>Year</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.row} className={r.error ? "bg-red-50/60" : ""}>
                    <TableCell className="text-muted-foreground">{r.row}</TableCell>
                    <TableCell className="font-medium">{r.data.vehicle_number || "—"}</TableCell>
                    <TableCell>{r.data.vehicle_type || "Lorry"}</TableCell>
                    <TableCell>{r.data.make || "—"}</TableCell>
                    <TableCell>{r.data.model || "—"}</TableCell>
                    <TableCell>{r.data.year || "—"}</TableCell>
                    <TableCell className={r.error ? "text-destructive" : "text-emerald-700"}>
                      {r.error ?? "Ready"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
