"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { StatusBadge } from "@/components/status-badge";
import { deleteDriver, saveDriver } from "@/server/fleet";
import { getDocumentStatus } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import type { Driver, Vehicle } from "@/lib/types";

export function DriversView({ drivers, vehicles }: { drivers: Driver[]; vehicles: Vehicle[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Driver | null | undefined>(undefined);
  const [deleting, setDeleting] = React.useState<Driver | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const vehiclesByDriver = React.useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    vehicles.forEach((v) => {
      if (!v.driver_id) return;
      map.set(v.driver_id, [...(map.get(v.driver_id) ?? []), v]);
    });
    return map;
  }, [vehicles]);

  const rows = drivers.filter((d) => {
    const q = query.trim().toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || (d.phone ?? "").includes(q) ||
      (d.license_number ?? "").toLowerCase().includes(q);
  });

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      const res = await saveDriver(editing?.id ?? null, {
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        license_number: String(formData.get("license_number") ?? ""),
        license_expiry: String(formData.get("license_expiry") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      });
      if (!res.ok) { setError(res.error); return; }
      toast.success(editing ? "Driver updated" : "Driver added");
      setEditing(undefined);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Drivers" description={`${drivers.length} driver${drivers.length === 1 ? "" : "s"}.`}>
        <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add driver</Button>
      </PageHeader>

      <SearchBar value={query} onChange={setQuery} placeholder="Search drivers by name, phone or licence…" className="mb-3 sm:max-w-sm" />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={drivers.length === 0 ? "No drivers yet" : "No drivers match your search"}
            description={drivers.length === 0 ? "Add drivers to assign them to vehicles." : "Try a different search term."}
            action={drivers.length === 0 ? <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add driver</Button> : null}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Licence</TableHead>
                <TableHead>Licence expiry</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => {
                const assigned = vehiclesByDriver.get(d.id) ?? [];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{d.license_number ?? "—"}</TableCell>
                    <TableCell>
                      {d.license_expiry ? (
                        <span className="flex items-center gap-2">
                          {formatDate(d.license_expiry)}
                          <StatusBadge status={getDocumentStatus(d.license_expiry)} />
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assigned.length === 0 ? "—" : assigned.map((v) => (
                        <Link key={v.id} href={`/vehicles/${v.id}`} className="mr-2 hover:underline">
                          {v.registration_number}
                        </Link>
                      ))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${d.name}`} className="text-destructive" onClick={() => setDeleting(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={editing !== undefined} onOpenChange={(v) => !v && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit driver" : "Add driver"}</DialogTitle>
            <DialogDescription>Licence expiry uses the same status engine as vehicle documents.</DialogDescription>
          </DialogHeader>
          <form action={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" required defaultValue={editing?.name ?? ""} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" inputMode="tel" defaultValue={editing?.phone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_number">Licence number</Label>
                <Input id="license_number" name="license_number" defaultValue={editing?.license_number ?? ""} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license_expiry">Licence expiry</Label>
              <Input id="license_expiry" name="license_expiry" type="date" defaultValue={editing?.license_expiry ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} />
            </div>
            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save driver</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Vehicles assigned to this driver become unassigned."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteDriver(deleting.id);
          if (res.ok) { toast.success("Driver deleted"); router.refresh(); } else toast.error(res.error);
        }}
      />
    </>
  );
}
