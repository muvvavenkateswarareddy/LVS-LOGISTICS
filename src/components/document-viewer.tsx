"use client";
import * as React from "react";
import { Download, ExternalLink, FileWarning, Loader2 } from "lucide-react";
import { getFileUrl } from "@/server/documents";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DocumentViewer({
  open, onOpenChange, path, name, mime,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  path: string | null;
  name?: string | null;
  mime?: string | null;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !path) return;
    setUrl(null);
    setError(null);
    getFileUrl(path)
      .then((u) => (u ? setUrl(u) : setError("Could not open this file.")))
      .catch(() => setError("Could not open this file."));
  }, [open, path]);

  const isImage = (mime ?? "").startsWith("image/") || /\.(png|jpe?g)$/i.test(name ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{name ?? "Document"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-[50vh] overflow-hidden rounded-md border bg-muted/40">
          {error ? (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileWarning className="h-6 w-6" aria-hidden /> {error}
            </div>
          ) : !url ? (
            <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt={name ?? "Document"} className="mx-auto max-h-[65vh] w-auto object-contain" />
          ) : (
            <iframe src={url} title={name ?? "Document"} className="h-[65vh] w-full" />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener")}>
            <ExternalLink className="h-4 w-4" /> Open in new tab
          </Button>
          <Button
            disabled={!path}
            onClick={async () => {
              if (!path) return;
              const dl = await getFileUrl(path, true);
              if (dl) window.open(dl, "_blank", "noopener");
            }}
          >
            <Download className="h-4 w-4" /> Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
