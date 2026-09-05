import { formatDaysRemaining, getDaysRemaining, getDocumentStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const TONE = {
  expired: "text-slate-900 font-semibold",
  critical: "text-red-700 font-semibold",
  warning: "text-amber-700 font-medium",
  upcoming: "text-yellow-700",
  valid: "text-muted-foreground",
} as const;

export function ExpiryIndicator({ expiryDate, className }: { expiryDate: string; className?: string }) {
  const days = getDaysRemaining(expiryDate);
  const status = getDocumentStatus(expiryDate);
  return <span className={cn("whitespace-nowrap text-sm tabular-nums", TONE[status], className)}>{formatDaysRemaining(days)}</span>;
}
