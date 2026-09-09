import { z } from "zod";

/** Indian commercial registration: TS09AB1234, AP16JK6789, DL01JK2424 ... */
export const REGISTRATION_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

const optionalString = z.string().trim().max(200).optional().or(z.literal(""));

export const vehicleSchema = z.object({
  registration_number: z
    .string()
    .trim()
    .min(4, "Registration number is required")
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
    .refine((v) => REGISTRATION_REGEX.test(v), "Use a valid format, e.g. TS09AB1234"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  make: optionalString,
  model: optionalString,
  manufacturing_year: z
    .union([z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1), z.literal("")])
    .optional(),
  chassis_number: optionalString,
  engine_number: optionalString,
  purchase_date: z.string().optional().or(z.literal("")),
  driver_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

/**
 * Expiry is optional here on purpose - whether a document needs one is a
 * property of its document type (document_types.requires_expiry), checked
 * in the server action. RC, for example, never expires.
 */
export const documentSchema = z
  .object({
    vehicle_id: z.string().uuid("Vehicle is required"),
    document_type_id: z.string().uuid("Document type is required"),
    document_number: z.string().trim().max(100).optional().or(z.literal("")),
    issue_date: z.string().optional().or(z.literal("")),
    expiry_date: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((d) => !d.issue_date || !d.expiry_date || d.issue_date <= d.expiry_date, {
    message: "Expiry date must be after the issue date",
    path: ["expiry_date"],
  });
export type DocumentInput = z.infer<typeof documentSchema>;

export const driverSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  license_number: z.string().trim().max(50).optional().or(z.literal("")),
  license_expiry: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type DriverInput = z.infer<typeof driverSchema>;

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) return "Only PDF, JPG, JPEG and PNG files are allowed";
  if (file.size > MAX_FILE_BYTES) return "File is larger than 10 MB";
  return null;
}

export const csvVehicleSchema = z.object({
  vehicle_number: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
    .refine((v) => REGISTRATION_REGEX.test(v), "Invalid registration number"),
  vehicle_type: z.string().trim().min(1).default("Lorry"),
  make: z.string().trim().optional().default(""),
  model: z.string().trim().optional().default(""),
  year: z
    .union([z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1), z.literal("")])
    .optional(),
});
