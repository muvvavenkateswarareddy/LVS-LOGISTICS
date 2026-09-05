"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronRight, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { FilterDropdown } from "@/components/filter-dropdown";
import { SearchBar } from "@/components/search-bar";
import { StatusBadge } from "@/components/status-badge";
import { VehicleComplianceScore } from "@/components/vehicle-compliance-score";
import { getVehicleCompliance, isFullyCompliant } from "@/lib/compliance";
import { STATUS_ORDER } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import type { DocumentType, VehicleWithDocuments } from "@/lib/types";

const FILTERS = [
  { value: "all", label: "All vehicles" },
  { value: "compliant", label: "Fully compliant" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "missing", label: "Missing documents" },
];

const SORTS = [
  { value: "registration", label: "Sort: Vehicle number" },
  { value: "expiry", label: "Sort: Next expiry" },
  { value: "compliance", label: "Sort: Compliance" },
  { value: "status", label: "Sort: Status" },
];

export function VehicleTable({
  vehicles, requiredTypes, onAdd,
}: {
  vehicles: VehicleWithDocuments[];
  requiredTypes: DocumentType[];
  onAdd?: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("registration");

  const rows = React.useMemo(() => {
    const today = new Date();
    const q = query.trim().toLowerCase();

    let list = vehicles.map((v) => ({ vehicle: v, compliance: getVehicleCompliance(v, requiredTypes, today) }));

    if (q) {
      list = list.filter(({ vehicle }) =>
        vehicle.registration_number.toLowerCase().includes(q) ||
        (vehicle.driver?.name ?? "").toLowerCase().includes(q) ||
        (vehicle.make ?? "").toLowerCase().includes(q) ||
        (vehicle.model ?? "").toLowerCase().includes(q) ||
        vehicle.documents.some((d) => (d.document_number ?? "").toLowerCase().includes(q)),
      );
    }

    list = list.filter(({ compliance }) => {
      switch (filter) {
        case "compliant": return isFullyCompliant(compliance);
        case "expiring": return compliance.status === "critical" || compliance.status === "warning" || compliance.status === "upcoming";
        case "expired": return compliance.status === "expired";
        case "missing": return compliance.missingTypes.length > 0;
        default: return true;
      }
    });

    return list.sort((a, b) => {
      switch (sort) {
        case "expiry":
          return new Date(a.compliance.nextExpiry ?? "9999-12-31").getTime() -
                 new Date(b.compliance.nextExpiry ?? "9999-12-31").getTime();
        case "compliance":
          return a.compliance.score - b.compliance.score;
        case "status":
          return (STATUS_ORDER[a.compliance.status as never] ?? 5) - (STATUS_ORDER[b.compliance.status as never] ?? 5);
        default:
          return a.vehicle.registration_number.localeCompare(b.vehicle.registration_number);
      }
    });
  }, [vehicles, requiredTypes, query, filter, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBar value={query} onChange={setQuery} placeholder="Search vehicles, drivers, document numbers…" className="sm:max-w-sm sm:flex-1" />
        <div className="flex gap-2">
          <FilterDropdown value={filter} onChange={setFilter} options={FILTERS} label="Filter" className="w-full sm:w-[180px]" />
          <FilterDropdown value={sort} onChange={setSort} options={SORTS} label="Sort" className="w-full sm:w-[200px]" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={vehicles.length === 0 ? "No vehicles yet" : "No vehicles match these filters"}
            description={
              vehicles.length === 0
                ? "Add your first vehicle to start tracking compliance."
                : "Try a different search term or clear the filters."
            }
            action={vehicles.length === 0 && onAdd ? <Button onClick={onAdd}><Plus className="h-4 w-4" /> Add vehicle</Button> : null}
          />
        ) : (
          <>
            {/* desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Next expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ vehicle, compliance }) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        <Link href={`/vehicles/${vehicle.id}`} className="hover:underline">{vehicle.registration_number}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{vehicle.vehicle_type}</TableCell>
                      <TableCell className="text-muted-foreground">{vehicle.driver?.name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {compliance.validCount}/{compliance.requiredCount} documents
                      </TableCell>
                      <TableCell><VehicleComplianceScore score={compliance.score} showBar={false} /></TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(compliance.nextExpiry)}</TableCell>
                      <TableCell><StatusBadge status={compliance.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/vehicles/${vehicle.id}`}>View <ChevronRight className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* mobile */}
            <ul className="divide-y md:hidden">
              {rows.map(({ vehicle, compliance }) => (
                <li key={vehicle.id}>
                  <Link href={`/vehicles/${vehicle.id}`} className="flex flex-col gap-2 p-4 active:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{vehicle.registration_number}</span>
                      <StatusBadge status={compliance.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{vehicle.vehicle_type} · {vehicle.driver?.name ?? "Unassigned"}</span>
                      <span>{formatDate(compliance.nextExpiry)}</span>
                    </div>
                    <VehicleComplianceScore score={compliance.score} validCount={compliance.validCount} requiredCount={compliance.requiredCount} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">{rows.length} of {vehicles.length} vehicles</p>
    </div>
  );
}
