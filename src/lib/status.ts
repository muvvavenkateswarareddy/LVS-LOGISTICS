/**
 * Single source of truth for document expiry status.
 * Every screen, report and notification derives status from here -
 * status is never stored or hand-entered.
 *
 * Some document types (Registration Certificate, for one) have no expiry
 * date at all; those documents are "no_expiry" and never need action.
 */
export type DocumentStatus = "expired" | "critical" | "warning" | "upcoming" | "valid" | "no_expiry";

export const STATUS_ORDER: Record<DocumentStatus, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  upcoming: 3,
  valid: 4,
  no_expiry: 5,
};

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  expired: "Expired",
  critical: "Critical",
  warning: "Warning",
  upcoming: "Upcoming",
  valid: "Valid",
  no_expiry: "No expiry",
};

/** Whole days between today and the expiry date. Negative = overdue, null = no expiry. */
export function getDaysRemaining(
  expiryDate: string | Date | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!expiryDate) return null;
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  if (Number.isNaN(expiry.getTime())) return null;
  const a = Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function getDocumentStatus(
  expiryDate: string | Date | null | undefined,
  today: Date = new Date(),
): DocumentStatus {
  const days = getDaysRemaining(expiryDate, today);
  if (days === null) return "no_expiry";
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 60) return "upcoming";
  return "valid";
}

export function formatDaysRemaining(days: number | null): string {
  if (days === null) return "No expiry";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Needs the owner's attention now: expired, critical or warning. */
export function needsAction(status: DocumentStatus) {
  return status === "expired" || status === "critical" || status === "warning";
}

/** True when the document expires inside `days` (never true without an expiry). */
export function expiresWithin(
  expiryDate: string | Date | null | undefined,
  days: number,
  today: Date = new Date(),
) {
  const left = getDaysRemaining(expiryDate, today);
  return left !== null && left >= 0 && left <= days;
}
