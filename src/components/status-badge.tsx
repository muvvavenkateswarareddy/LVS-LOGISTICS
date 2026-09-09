import { AlertTriangle, CheckCircle2, CircleAlert, CircleSlash, Clock, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type DocumentStatus } from "@/lib/status";

type Kind = DocumentStatus | "missing";

/** Colour + icon + text label - never colour alone. */
const STYLES: Record<Kind, { className: string; Icon: typeof CheckCircle2; label: string }> = {
  expired:  { className: "bg-slate-800 text-white border-transparent", Icon: CircleSlash, label: "Expired" },
  critical: { className: "bg-red-50 text-red-700 border-red-200", Icon: CircleAlert, label: "Critical" },
  warning:  { className: "bg-amber-50 text-amber-800 border-amber-200", Icon: AlertTriangle, label: "Warning" },
  upcoming: { className: "bg-yellow-50 text-yellow-800 border-yellow-200", Icon: Clock, label: "Upcoming" },
  valid:    { className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2, label: "Valid" },
  no_expiry:{ className: "bg-slate-50 text-slate-600 border-slate-200", Icon: InfinityIcon, label: "No expiry" },
  missing:  { className: "bg-slate-100 text-slate-700 border-slate-200", Icon: CircleSlash, label: "Missing docs" },
};

export function StatusBadge({ status, className }: { status: Kind; className?: string }) {
  const { className: style, Icon, label } = STYLES[status] ?? STYLES.missing;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", style, className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {STATUS_LABEL[status as DocumentStatus] ?? label}
    </span>
  );
}
