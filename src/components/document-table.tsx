"use client";
import * as React from "react";
import Link from "next/link";
import { Eye, FileText, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentViewer } from "@/components/document-viewer";
import { DocumentFormDialog } from "@/components/document-form-dialog";
import { ExpiryIndicator } from "@/components/expiry-indicator";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { deleteDocument } from "@/server/documents";
import { getDocumentStatus } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import type { DocumentRow, DocumentType } from "@/lib/types";

export function DocumentTable({
  documents, documentTypes, fleetId, showVehicle = true, emptyTitle = "No documents yet",
  emptyDescription = "Add a document to start tracking its expiry.",
}: {
  documents: DocumentRow[];
  documentTypes: DocumentType[];
  fleetId: string;
  showVehicle?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const [viewing, setViewing] = React.useState<DocumentRow | null>(null);
  const [editing, setEditing] = React.useState<{ doc: DocumentRow; mode: "edit" | "renew" } | null>(null);
  const [deleting, setDeleting] = React.useState<DocumentRow | null>(null);

  if (documents.length === 0) {
    return <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {showVehicle ? <TableHead>Vehicle</TableHead> : null}
              <TableHead>Document</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Issue date</TableHead>
              <TableHead>Expiry date</TableHead>
              <TableHead>Days remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                {showVehicle ? (
                  <TableCell className="font-medium">
                    <Link href={`/vehicles/${doc.vehicle_id}`} className="hover:underline">
                      {doc.vehicle?.registration_number ?? "—"}
                    </Link>
                  </TableCell>
                ) : null}
                <TableCell>{doc.document_type?.name ?? "Document"}</TableCell>
                <TableCell className="text-muted-foreground">{doc.document_number ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(doc.issue_date)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(doc.expiry_date)}</TableCell>
                <TableCell><ExpiryIndicator expiryDate={doc.expiry_date} /></TableCell>
                <TableCell><StatusBadge status={getDocumentStatus(doc.expiry_date)} /></TableCell>
                <TableCell>
                  {doc.file_path ? (
                    <Button variant="ghost" size="sm" onClick={() => setViewing(doc)}>
                      <Eye className="h-4 w-4" /> View
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No file</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => setEditing({ doc, mode: "renew" })}>
                      <RefreshCw className="h-3.5 w-3.5" /> Renew
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing({ doc, mode: "edit" })}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleting(doc)} className="text-destructive">
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden">
        {documents.map((doc) => (
          <li key={doc.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{doc.document_type?.name}</p>
                {showVehicle ? (
                  <Link href={`/vehicles/${doc.vehicle_id}`} className="text-sm text-muted-foreground hover:underline">
                    {doc.vehicle?.registration_number}
                  </Link>
                ) : null}
              </div>
              <StatusBadge status={getDocumentStatus(doc.expiry_date)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{formatDate(doc.expiry_date)}</span>
              <ExpiryIndicator expiryDate={doc.expiry_date} />
            </div>
            <div className="flex gap-2">
              {doc.file_path ? (
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewing(doc)}>
                  <Eye className="h-4 w-4" /> View
                </Button>
              ) : null}
              <Button size="sm" className="flex-1" onClick={() => setEditing({ doc, mode: "renew" })}>
                <RefreshCw className="h-4 w-4" /> Renew
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <DocumentViewer
        open={!!viewing}
        onOpenChange={(v) => !v && setViewing(null)}
        path={viewing?.file_path ?? null}
        name={viewing?.file_name ?? viewing?.document_type?.name}
        mime={viewing?.file_mime}
      />

      {editing ? (
        <DocumentFormDialog
          open
          onOpenChange={(v) => !v && setEditing(null)}
          mode={editing.mode}
          fleetId={fleetId}
          vehicleId={editing.doc.vehicle_id}
          documentTypes={documentTypes}
          defaults={{
            id: editing.doc.id,
            document_type_id: editing.doc.document_type_id,
            document_number: editing.doc.document_number,
            issue_date: editing.doc.issue_date,
            expiry_date: editing.doc.expiry_date,
            notes: editing.doc.notes,
            file_name: editing.doc.file_name,
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete this document?"
        description="The record and its uploaded file are removed permanently. Renew instead if you want to keep the history."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteDocument(deleting.id);
          if (res.ok) { toast.success("Document deleted"); router.refresh(); }
          else toast.error(res.error);
        }}
      />
    </>
  );
}
