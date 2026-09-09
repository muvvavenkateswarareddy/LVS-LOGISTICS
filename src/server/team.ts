"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/queries";
import type { ActionResult } from "@/server/documents";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

type OwnerContext = Awaited<ReturnType<typeof getSession>> & { fleet: NonNullable<Awaited<ReturnType<typeof getSession>>["fleet"]> };

async function requireOwner(): Promise<{ error: string } | OwnerContext> {
  const session = await getSession();
  if (!session.fleet) return { error: "No fleet found for this account" };
  if (session.fleet.owner_id !== session.user.id) {
    return { error: "Only the fleet owner can manage the team" };
  }
  return session as OwnerContext;
}

/** Creates an invite and returns the link the owner shares. */
export async function inviteMember(
  rawEmail: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireOwner();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, user, fleet } = ctx;

  const { data, error } = await supabase
    .from("fleet_invites")
    .insert({ fleet_id: fleet.id, email: parsed.data, invited_by: user.id })
    .select("token")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "That person already has a pending invite" : error.message,
    };
  }
  revalidatePath("/settings");
  return { ok: true, token: data.token as string };
}

export async function revokeInvite(id: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase.from("fleet_invites").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const ctx = await requireOwner();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (userId === ctx.user.id) return { ok: false, error: "You cannot remove yourself" };

  const { error } = await ctx.supabase
    .from("fleet_members")
    .delete()
    .eq("fleet_id", ctx.fleet.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
