"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/queries";
import { documentSchema } from "@/lib/validations";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

type FileMeta = {
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_mime?: string | null;
};

async function audit(action: string, entityId: string | undefined, meta: Record<string, unknown> = {}) {
  const { supabase, fleet, user } = await getSession();
  if (!fleet) return;
  await supabase.from("audit_logs").insert({
    fleet_id: fleet.id, user_id: user.id, action,
    entity_type: action.split(".")[0], entity_id: entityId ?? null, meta,
  });
}

/** Expiry is mandatory unless the document type says otherwise. */
async function checkExpiry(documentTypeId: string, expiry: string | undefined) {
  if (expiry) return null;
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("document_types")
    .select("name, requires_expiry")
    .eq("id", documentTypeId)
    .maybeSingle();
  return data && data.requires_expiry === false
    ? null
    : `${data?.name ?? "This document"} needs an expiry date`;
}

function clean<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, v === "" || v === undefined ? null : v]),
  );
}

export async function createDocument(raw: unknown, file: FileMeta = {}): Promise<ActionResult> {
  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const expiryError = await checkExpiry(parsed.data.document_type_id, parsed.data.expiry_date);
  if (expiryError) return { ok: false, error: expiryError };

  const { supabase, fleet, user } = await getSession();
  if (!fleet) return { ok: false, error: "No fleet found for this account" };

  const { data, error } = await supabase
    .from("documents")
    .insert({ ...clean(parsed.data), ...clean(file), fleet_id: fleet.id, created_by: user.id, is_current: true })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "This vehicle already has a current document of that type. Use Renew instead." };
    return { ok: false, error: error.message };
  }
  await audit("document.created", data.id, { vehicle_id: parsed.data.vehicle_id });
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function updateDocument(id: string, raw: unknown, file: FileMeta = {}): Promise<ActionResult> {
  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const expiryError = await checkExpiry(parsed.data.document_type_id, parsed.data.expiry_date);
  if (expiryError) return { ok: false, error: expiryError };

  const { supabase } = await getSession();
  const { error } = await supabase.from("documents").update({ ...clean(parsed.data), ...clean(file) }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit("document.updated", id);
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/** Renew = archive the old record + create the new one. Never overwrite. */
export async function renewDocument(
  documentId: string,
  values: { document_number?: string; issue_date?: string; expiry_date?: string; notes?: string },
  file: FileMeta = {},
): Promise<ActionResult> {
  if (values.issue_date && values.expiry_date && values.issue_date > values.expiry_date)
    return { ok: false, error: "Expiry date must be after the issue date" };

  const { supabase } = await getSession();

  const { data: existing } = await supabase
    .from("documents")
    .select("document_type_id")
    .eq("id", documentId)
    .maybeSingle();
  if (existing) {
    const expiryError = await checkExpiry(existing.document_type_id, values.expiry_date);
    if (expiryError) return { ok: false, error: expiryError };
  }
  const { data, error } = await supabase.rpc("renew_document", {
    p_document_id: documentId,
    p_document_number: values.document_number || null,
    p_issue_date: values.issue_date || null,
    p_expiry_date: values.expiry_date || null,
    p_file_path: file.file_path ?? null,
    p_file_name: file.file_name ?? null,
    p_file_size: file.file_size ?? null,
    p_file_mime: file.file_mime ?? null,
    p_notes: values.notes || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, id: data as string };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (doc?.file_path) await supabase.storage.from("documents").remove([doc.file_path]);
  await audit("document.deleted", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Short-lived signed URL - the bucket stays private. */
export async function getFileUrl(path: string, download = false): Promise<string | null> {
  const { supabase } = await getSession();
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 10, download ? { download: true } : undefined);
  return data?.signedUrl ?? null;
}
