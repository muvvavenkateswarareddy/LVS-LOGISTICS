import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "critical" | "warning" | "upcoming" | "success";

const TONES: Record<StatTone, string> = {
  default: "text-foreground",
  critical: "text-red-700",
  warning: "text-amber-700",
  upcoming: "text-yellow-700",
  success: "text-emerald-700",
};

const ICON_TONES: Record<StatTone, string> = {
  default: "bg-primary/10 text-primary",
  critical: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  upcoming: "bg-yellow-50 text-yellow-700",
  success: "bg-emerald-50 text-emerald-700",
};

export function StatCard({
  label, value, hint, icon: Icon, tone = "default", href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <Card className={cn("h-full p-4 transition-shadow", href && "hover:shadow-md")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-2 text-3xl font-semibold tabular-nums", TONES[tone])}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("rounded-md p-2", ICON_TONES[tone])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Card>
  );
  return href ? <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">{body}</Link> : body;
}
