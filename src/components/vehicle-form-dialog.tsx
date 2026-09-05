"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createVehicle, updateVehicle } from "@/server/fleet";
import type { Driver, Vehicle } from "@/lib/types";

export const VEHICLE_TYPES = ["Lorry", "Truck", "Tipper", "Trailer", "Tanker", "Container", "Mini Truck", "Other"];
const NO_DRIVER = "none";

export function VehicleFormDialog({
  open, onOpenChange, drivers, vehicle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  drivers: Driver[];
  vehicle?: Vehicle | null;
}) {
  const router = useRouter();
  const [type, setType] = React.useState(vehicle?.vehicle_type ?? "Lorry");
  const [driverId, setDriverId] = React.useState(vehicle?.driver_id ?? NO_DRIVER);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setType(vehicle?.vehicle_type ?? "Lorry");
      setDriverId(vehicle?.driver_id ?? NO_DRIVER);
      setError(null);
    }
  }, [open, vehicle]);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      const values = {
        registration_number: String(formData.get("registration_number") ?? ""),
        vehicle_type: type,
        make: String(formData.get("make") ?? ""),
        model: String(formData.get("model") ?? ""),
        manufacturing_year: String(formData.get("manufacturing_year") ?? "") || "",
        chassis_number: String(formData.get("chassis_number") ?? ""),
        engine_number: String(formData.get("engine_number") ?? ""),
        purchase_date: String(formData.get("purchase_date") ?? ""),
        driver_id: driverId === NO_DRIVER ? "" : driverId,
        notes: String(formData.get("notes") ?? ""),
      };
      const result = vehicle ? await updateVehicle(vehicle.id, values) : await createVehicle(values);
      if (!result.ok) { setError(result.error); return; }
      toast.success(vehicle ? "Vehicle updated" : "Vehicle added");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>Registration numbers are unique within your fleet.</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="registration_number">Registration number <span className="text-destructive">*</span></Label>
              <Input id="registration_number" name="registration_number" required placeholder="TS09AB1234"
                     defaultValue={vehicle?.registration_number ?? ""} className="uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle_type">Vehicle type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="vehicle_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="make">Make</Label>
              <Input id="make" name="make" placeholder="Tata" defaultValue={vehicle?.make ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" placeholder="Prima" defaultValue={vehicle?.model ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manufacturing_year">Manufacturing year</Label>
              <Input id="manufacturing_year" name="manufacturing_year" type="number" min={1950}
                     max={new Date().getFullYear() + 1} defaultValue={vehicle?.manufacturing_year ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase_date">Purchase date</Label>
              <Input id="purchase_date" name="purchase_date" type="date" defaultValue={vehicle?.purchase_date ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chassis_number">Chassis number</Label>
              <Input id="chassis_number" name="chassis_number" defaultValue={vehicle?.chassis_number ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="engine_number">Engine number</Label>
              <Input id="engine_number" name="engine_number" defaultValue={vehicle?.engine_number ?? ""} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="driver_id">Assigned driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger id="driver_id"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DRIVER}>Unassigned</SelectItem>
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={vehicle?.notes ?? ""} />
            </div>
          </div>

          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{vehicle ? "Save changes" : "Add vehicle"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
