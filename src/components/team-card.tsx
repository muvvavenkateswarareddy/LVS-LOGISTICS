"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { inviteMember, removeMember, revokeInvite } from "@/server/team";
import type { PendingInvite, TeamMember } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export function TeamCard({
  members, invites, isOwner, currentUserId,
}: {
  members: TeamMember[];
  invites: PendingInvite[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<TeamMember | null>(null);

  const linkFor = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/invite/${token}`;

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Invite link copied - send it to them on WhatsApp or email");
    } catch {
      toast.error("Could not copy. Long-press the link to copy it manually.");
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Everyone on the fleet can add and edit vehicles, documents and drivers. Only you can invite
          or remove people. Every change is recorded against the person who made it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            action={async () => {
              setBusy(true);
              try {
                const res = await inviteMember(email);
                if (!res.ok) { toast.error(res.error); return; }
                setEmail("");
                router.refresh();
                await copy(res.token);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite_email">Invite by email</Label>
              <Input
                id="invite_email"
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" loading={busy}><UserPlus className="h-4 w-4" /> Create invite</Button>
          </form>
        ) : null}

        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {m.full_name || m.email}
                  {m.user_id === currentUserId ? " (you)" : ""}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={m.is_owner ? "default" : "muted"}>{m.is_owner ? "Owner" : "Member"}</Badge>
                {isOwner && !m.is_owner ? (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRemoving(m)}>
                    Remove
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        {invites.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Pending invites</p>
            <ul className="divide-y rounded-md border">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      <span className="truncate">{i.email}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Expires {formatDate(i.expires_at)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => copy(i.token)}>
                      {copied === i.token ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === i.token ? "Copied" : "Copy link"}
                    </Button>
                    {isOwner ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Revoke invite for ${i.email}`}
                        onClick={async () => {
                          const res = await revokeInvite(i.id);
                          if (res.ok) { toast.success("Invite revoked"); router.refresh(); }
                          else toast.error(res.error);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ConfirmDialog
          open={!!removing}
          onOpenChange={(v) => !v && setRemoving(null)}
          title={`Remove ${removing?.full_name || removing?.email}?`}
          description="They lose access to this fleet immediately. Their past changes stay in the audit log."
          confirmLabel="Remove"
          destructive
          onConfirm={async () => {
            if (!removing) return;
            const res = await removeMember(removing.user_id);
            if (res.ok) { toast.success("Member removed"); router.refresh(); } else toast.error(res.error);
          }}
        />
      </CardContent>
    </Card>
  );
}
