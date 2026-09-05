/**
 * Single source of truth for document expiry status.
 * Every screen, report and notification derives status from here -
 * status is never stored or hand-entered.
 */
export type DocumentStatus = "expired" | "critical" | "warning" | "upcoming" | "valid";

export const STATUS_ORDER: Record<DocumentStatus, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  upcoming: 3,
  valid: 4,
};

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  expired: "Expired",
  critical: "Critical",
  warning: "Warning",
  upcoming: "Upcoming",
  valid: "Valid",
};

/** Whole days between today and the expiry date. Negative = overdue. */
export function getDaysRemaining(expiryDate: string | Date, today: Date = new Date()): number {
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const a = Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function getDocumentStatus(expiryDate: string | Date, today: Date = new Date()): DocumentStatus {
  const days = getDaysRemaining(expiryDate, today);
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 60) return "upcoming";
  return "valid";
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Needs the owner's attention now: expired, critical or warning. */
export function needsAction(status: DocumentStatus) {
  return status === "expired" || status === "critical" || status === "warning";
}
