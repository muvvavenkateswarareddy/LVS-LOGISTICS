import type { DocumentStatus } from "./status";

export type Fleet = { id: string; owner_id: string; name: string };

export type Driver = {
  id: string;
  fleet_id: string;
  name: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
};

export type DocumentType = {
  id: string;
  fleet_id: string;
  name: string;
  code: string;
  is_required: boolean;
  requires_expiry: boolean;
  sort_order: number;
  is_active: boolean;
};

export type Vehicle = {
  id: string;
  fleet_id: string;
  registration_number: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  manufacturing_year: number | null;
  chassis_number: string | null;
  engine_number: string | null;
  purchase_date: string | null;
  driver_id: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
};

export type VehicleDocument = {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  document_type_id: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_mime: string | null;
  notes: string | null;
  is_current: boolean;
  replaced_at: string | null;
  previous_document_id: string | null;
  is_demo: boolean;
  created_at: string;
};

export type DocumentHistoryRow = {
  id: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string | null;
  file_name: string | null;
  replaced_at: string;
  document_type: { name: string } | null;
};

export type AppNotification = {
  id: string;
  vehicle_id: string | null;
  document_id: string | null;
  title: string;
  body: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

/** Document joined with its type + vehicle, as the UI consumes it. */
export type DocumentRow = VehicleDocument & {
  document_type: Pick<DocumentType, "id" | "name" | "code" | "is_required" | "requires_expiry"> | null;
  vehicle: Pick<Vehicle, "id" | "registration_number" | "vehicle_type"> | null;
};

export type VehicleWithDocuments = Vehicle & {
  driver: Pick<Driver, "id" | "name" | "phone"> | null;
  documents: (VehicleDocument & { document_type: Pick<DocumentType, "id" | "name" | "code" | "is_required" | "requires_expiry"> | null })[];
};

export type VehicleCompliance = {
  score: number;
  requiredCount: number;
  validCount: number;
  missingTypes: string[];
  status: DocumentStatus | "missing";
  nextExpiry: string | null;
};
