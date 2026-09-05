"use client";
import * as React from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateFile } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  file_path: string;
  file_name: string;
  file_size: number;
  file_mime: string;
};

/**
 * Uploads straight from the browser to Supabase Storage (RLS-scoped by
 * fleet folder). Only the returned path is ever written to Postgres.
 */
export function DocumentUpload({
  fleetId, vehicleId, value, onChange, existingName,
}: {
  fleetId: string;
  vehicleId: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  existingName?: string | null;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const invalid = validateFile(file);
    if (invalid) { setError(invalid); return; }

    setError(null);
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${fleetId}/${vehicleId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      onChange({ file_path: path, file_name: file.name, file_size: file.size, file_mime: file.type });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function clearFile() {
    if (value) {
      const supabase = createClient();
      await supabase.storage.from("documents").remove([value.file_path]);
    }
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center text-sm",
          busy && "opacity-70",
        )}
      >
        {value ? (
          <div className="flex w-full items-center justify-between gap-2 text-left">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{value.file_name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(value.file_size / 1024).toFixed(0)} KB
              </span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void clearFile()}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">
              {existingName ? `Current file: ${existingName}. ` : ""}Drop a file here, or
            </p>
            <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
              {busy ? "Uploading…" : "Choose file"}
            </Button>
            <p className="text-xs text-muted-foreground">PDF, JPG or PNG · up to 10 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      {busy ? <div className="h-1 w-full overflow-hidden rounded bg-muted"><div className="h-full w-1/2 animate-pulse rounded bg-primary" /></div> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
