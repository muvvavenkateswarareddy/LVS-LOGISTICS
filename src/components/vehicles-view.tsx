"use client";
import * as React from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { VehicleTable } from "@/components/vehicle-table";
import { VehicleFormDialog } from "@/components/vehicle-form-dialog";
import type { DocumentType, Driver, VehicleWithDocuments } from "@/lib/types";

export function VehiclesView({
  vehicles, requiredTypes, drivers,
}: {
  vehicles: VehicleWithDocuments[];
  requiredTypes: DocumentType[];
  drivers: Driver[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <PageHeader title="Vehicles" description={`${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} in your fleet.`}>
        <Button asChild variant="outline"><Link href="/vehicles/import"><Upload className="h-4 w-4" /> Import CSV</Link></Button>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add vehicle</Button>
      </PageHeader>

      <VehicleTable vehicles={vehicles} requiredTypes={requiredTypes} onAdd={() => setOpen(true)} />
      <VehicleFormDialog open={open} onOpenChange={setOpen} drivers={drivers} />
    </>
  );
}
