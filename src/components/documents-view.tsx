"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DocumentTable } from "@/components/document-table";
import { FilterDropdown } from "@/components/filter-dropdown";
import { SearchBar } from "@/components/search-bar";
import { getDaysRemaining, getDocumentStatus, STATUS_ORDER } from "@/lib/status";
import type { DocumentRow, DocumentType } from "@/lib/types";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "expired", label: "Expired" },
  { value: "critical", label: "Critical · 0-7 days" },
  { value: "warning", label: "Warning · 8-30 days" },
  { value: "upcoming", label: "Upcoming · 31-60 days" },
  { value: "valid", label: "Valid" },
  { value: "30", label: "Expiring within 30 days" },
  { value: "60", label: "Expiring within 60 days" },
];

export function DocumentsView({
  documents, documentTypes, fleetId, initialFilter = "all",
}: {
  documents: DocumentRow[];
  documentTypes: DocumentType[];
  fleetId: string;
  initialFilter?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState(initialFilter);
  const [typeId, setTypeId] = React.useState("all");

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => {
        if (typeId !== "all" && d.document_type_id !== typeId) return false;
        const days = getDaysRemaining(d.expiry_date);
        if (status === "30") return days >= 0 && days <= 30;
        if (status === "60") return days >= 0 && days <= 60;
        if (status !== "all" && getDocumentStatus(d.expiry_date) !== status) return false;
        if (!q) return true;
        return (
          (d.vehicle?.registration_number ?? "").toLowerCase().includes(q) ||
          (d.document_number ?? "").toLowerCase().includes(q) ||
          (d.document_type?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[getDocumentStatus(a.expiry_date)] - STATUS_ORDER[getDocumentStatus(b.expiry_date)] ||
          a.expiry_date.localeCompare(b.expiry_date),
      );
  }, [documents, query, status, typeId]);

  return (
    <>
      <PageHeader title="Documents" description="Every current document across your fleet, most urgent first." />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by vehicle or document number…" className="sm:max-w-sm sm:flex-1" />
        <div className="flex gap-2">
          <FilterDropdown value={status} onChange={setStatus} options={STATUS_FILTERS} label="Status" className="w-full sm:w-[210px]" />
          <FilterDropdown
            value={typeId}
            onChange={setTypeId}
            options={[{ value: "all", label: "All document types" }, ...documentTypes.map((t) => ({ value: t.id, label: t.name }))]}
            label="Document type"
            className="w-full sm:w-[200px]"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <DocumentTable
          documents={rows}
          documentTypes={documentTypes}
          fleetId={fleetId}
          emptyTitle={documents.length === 0 ? "No documents yet" : "No documents match these filters"}
          emptyDescription={
            documents.length === 0
              ? "Open a vehicle and add its insurance, fitness or permit to start tracking."
              : "Try a different status, type or search term."
          }
        />
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">{rows.length} of {documents.length} documents</p>
    </>
  );
}
