import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 12 Sep 2026 */
export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function toISODate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "LVS Logistics";
export const APP_TAGLINE = "Energy in safe hands";
