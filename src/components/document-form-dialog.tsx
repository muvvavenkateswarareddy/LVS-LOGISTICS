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
import { DocumentUpload, type UploadedFile } from "@/components/document-upload";
import { createDocument, renewDocument, updateDocument } from "@/server/documents";
import type { DocumentType } from "@/lib/types";

export type DocumentFormMode = "create" | "edit" | "renew";

export type DocumentDefaults = {
  id?: string;
  document_type_id?: string;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  file_name?: string | null;
};

export function DocumentFormDialog({
  open, onOpenChange, mode, fleetId, vehicleId, documentTypes, defaults,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: DocumentFormMode;
  fleetId: string;
  vehicleId: string;
  documentTypes: DocumentType[];
  defaults?: DocumentDefaults;
}) {
  const router = useRouter();
  const [file, setFile] = React.useState<UploadedFile | null>(null);
  const [typeId, setTypeId] = React.useState(defaults?.document_type_id ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTypeId(defaults?.document_type_id ?? "");
      setFile(null);
      setError(null);
    }
  }, [open, defaults?.document_type_id]);

  const title =
    mode === "create" ? "Add document" : mode === "edit" ? "Edit document" : "Renew document";

  // Some types (Registration Certificate) never expire - the type decides.
  const selectedType = documentTypes.find((t) => t.id === typeId);
  const requiresExpiry = selectedType ? selectedType.requires_expiry : true;

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaving(true);
    try {
      const values = {
        vehicle_id: vehicleId,
        document_type_id: typeId,
        document_number: String(formData.get("document_number") ?? ""),
        issue_date: String(formData.get("issue_date") ?? ""),
        expiry_date: String(formData.get("expiry_date") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };

      const result =
        mode === "create"
          ? await createDocument(values, file ?? {})
          : mode === "edit"
            ? await updateDocument(defaults!.id!, values, file ?? {})
            : await renewDocument(
                defaults!.id!,
                {
                  document_number: values.document_number,
                  issue_date: values.issue_date,
                  expiry_date: values.expiry_date,
                  notes: values.notes,
                },
                file ?? {},
              );

      if (!result.ok) { setError(result.error); return; }
      toast.success(
        mode === "renew" ? "Document renewed - the old record is kept in history" : "Document saved",
      );
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "renew"
              ? "The current document is archived to history and replaced with this new one."
              : requiresExpiry
                ? "Status is calculated automatically from the expiry date."
                : `${selectedType?.name ?? "This document"} has no expiry date, so it never needs renewing.`}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="document_type_id">Document type</Label>
            <Select value={typeId} onValueChange={setTypeId} disabled={mode === "renew"}>
              <SelectTrigger id="document_type_id"><SelectValue placeholder="Select a document type" /></SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document_number">Document number</Label>
            <Input id="document_number" name="document_number" defaultValue={mode === "renew" ? "" : defaults?.document_number ?? ""} placeholder="INS123456" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="issue_date">Issue date</Label>
              <Input id="issue_date" name="issue_date" type="date" defaultValue={mode === "renew" ? "" : defaults?.issue_date ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry_date">
                Expiry date{" "}
                {requiresExpiry
                  ? <span className="text-destructive">*</span>
                  : <span className="font-normal text-muted-foreground">(not applicable)</span>}
              </Label>
              <Input
                id="expiry_date"
                name="expiry_date"
                type="date"
                required={requiresExpiry}
                defaultValue={mode === "renew" ? "" : defaults?.expiry_date ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>File</Label>
            <DocumentUpload
              fleetId={fleetId}
              vehicleId={vehicleId}
              value={file}
              onChange={setFile}
              existingName={defaults?.file_name ?? null}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={mode === "renew" ? "" : defaults?.notes ?? ""} />
          </div>

          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{mode === "renew" ? "Renew document" : "Save document"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
