import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ExpiryIndicator } from "@/components/expiry-indicator";
import { getDocumentStatus } from "@/lib/status";
import { formatDate } from "@/lib/utils";

/** Compact, clickable representation of one document - used in action lists. */
export function DocumentCard({
  vehicleId, registration, documentName, documentNumber, expiryDate, hint,
}: {
  vehicleId: string;
  registration: string;
  documentName: string;
  documentNumber?: string | null;
  expiryDate: string | null;
  hint?: string;
}) {
  return (
    <Link
      href={`/vehicles/${vehicleId}`}
      className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/60"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{registration}</p>
        <p className="truncate text-sm text-muted-foreground">
          {documentName}
          {documentNumber ? ` · ${documentNumber}` : ""}
          {hint ? ` · ${hint}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm">{formatDate(expiryDate)}</p>
          <ExpiryIndicator expiryDate={expiryDate} className="text-xs" />
        </div>
        <StatusBadge status={getDocumentStatus(expiryDate)} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
    </Link>
  );
}
