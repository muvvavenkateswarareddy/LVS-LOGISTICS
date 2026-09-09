import { getDocumentStatus, STATUS_ORDER, type DocumentStatus } from "./status";
import type { DocumentType, VehicleCompliance, VehicleWithDocuments } from "./types";

/**
 * Compliance for one vehicle: how many required document types are held
 * with a non-expired document, plus the worst status across its documents.
 */
export function getVehicleCompliance(
  vehicle: VehicleWithDocuments,
  requiredTypes: Pick<DocumentType, "id" | "name">[],
  today: Date = new Date(),
): VehicleCompliance {
  const current = vehicle.documents.filter((d) => d.is_current);
  const byType = new Map(current.map((d) => [d.document_type_id, d]));

  const missingTypes = requiredTypes.filter((t) => !byType.has(t.id)).map((t) => t.name);
  const validCount = requiredTypes.filter((t) => {
    const doc = byType.get(t.id);
    return doc ? getDocumentStatus(doc.expiry_date, today) !== "expired" : false;
  }).length;

  const statuses = current.map((d) => getDocumentStatus(d.expiry_date, today));
  const worst = statuses.sort((a, b) => STATUS_ORDER[a] - STATUS_ORDER[b])[0];

  const nextExpiry =
    current
      .map((d) => d.expiry_date)
      .filter((d): d is string => !!d)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

  const status: DocumentStatus | "missing" =
    missingTypes.length > 0 && (!worst || worst === "valid" || worst === "upcoming" || worst === "no_expiry")
      ? "missing"
      : (worst ?? "missing");

  return {
    score: requiredTypes.length === 0 ? 100 : Math.round((validCount / requiredTypes.length) * 100),
    requiredCount: requiredTypes.length,
    validCount,
    missingTypes,
    status,
    nextExpiry,
  };
}

export function isFullyCompliant(c: VehicleCompliance) {
  return c.missingTypes.length === 0 && c.score === 100;
}
