import { cn } from "@/lib/utils";

export function VehicleComplianceScore({
  score, validCount, requiredCount, className, showBar = true,
}: {
  score: number;
  validCount?: number;
  requiredCount?: number;
  className?: string;
  showBar?: boolean;
}) {
  const tone = score === 100 ? "bg-emerald-600" : score >= 70 ? "bg-amber-500" : "bg-red-600";
  return (
    <div className={cn("min-w-[92px]", className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums">{score}%</span>
        {requiredCount !== undefined ? (
          <span className="text-xs text-muted-foreground">{validCount}/{requiredCount} docs</span>
        ) : null}
      </div>
      {showBar ? (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`Compliance ${score} percent`}>
          <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
        </div>
      ) : null}
    </div>
  );
}
