"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { PushToggle } from "@/components/push-toggle";
import { TeamCard } from "@/components/team-card";
import type { PendingInvite, TeamMember } from "@/lib/queries";
import { removeDemoData, renameFleet, seedDemoData } from "@/server/fleet";
import { updatePreferences } from "@/server/notifications";
import { APP_NAME } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

type Prefs = { email_enabled: boolean; sms_enabled: boolean; whatsapp_enabled: boolean; lead_days: number[] };

export function SettingsView({
  fleetName, userEmail, userId, documentTypes, prefs, demoCount, team,
}: {
  fleetName: string;
  userEmail: string;
  userId: string;
  documentTypes: DocumentType[];
  prefs: Prefs;
  demoCount: number;
  team: { members: TeamMember[]; invites: PendingInvite[]; isOwner: boolean };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(fleetName);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [channels, setChannels] = React.useState(prefs);

  const CHANNELS = [
    { key: "email_enabled", label: "Email", ready: false },
    { key: "sms_enabled", label: "SMS", ready: false },
    { key: "whatsapp_enabled", label: "WhatsApp", ready: false },
  ] as const;

  return (
    <>
      <PageHeader title="Settings" description={`${APP_NAME} configuration for your fleet.`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamCard
          members={team.members}
          invites={team.invites}
          isOwner={team.isOwner}
          currentUserId={userId}
        />

        <Card>
          <CardHeader>
            <CardTitle>Fleet</CardTitle>
            <CardDescription>Signed in as {userEmail}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fleet_name">Fleet name</Label>
              <Input id="fleet_name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                const res = await renameFleet(name);
                setSaving(false);
                if (res.ok) { toast.success("Fleet name updated"); router.refresh(); } else toast.error(res.error);
              }}
            >
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document types</CardTitle>
            <CardDescription>Types are stored per fleet, so new ones can be added without a code change.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {documentTypes.map((t) => (
                <li key={t.id}>
                  <Badge variant={t.is_required ? "default" : "muted"}>
                    {t.name}{t.is_required ? " · required" : ""}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reminders</CardTitle>
            <CardDescription>
              In-app alerts are generated at {prefs.lead_days.join(", ")} days before expiry and on the expiry date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PushToggle />
            <p className="text-sm font-medium">Other channels</p>
            <ul className="space-y-2">
              <li className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>In-app notifications</span>
                <Badge>Active</Badge>
              </li>
              {CHANNELS.map((c) => (
                <li key={c.key} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <label className="flex items-center gap-2" htmlFor={c.key}>
                    <input
                      id={c.key}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={channels[c.key]}
                      onChange={async (e) => {
                        const next = { ...channels, [c.key]: e.target.checked };
                        setChannels(next);
                        const res = await updatePreferences({
                          email_enabled: next.email_enabled,
                          sms_enabled: next.sms_enabled,
                          whatsapp_enabled: next.whatsapp_enabled,
                        });
                        if (!res.ok) toast.error(res.error);
                      }}
                    />
                    {c.label}
                  </label>
                  <Badge variant="muted">Queued for delivery integration</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo data</CardTitle>
            <CardDescription>20 vehicles with a realistic mix of valid, expiring and expired documents.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const res = await seedDemoData();
                setBusy(false);
                if (res.ok) { toast.success("Demo data loaded"); router.refresh(); } else toast.error(res.error);
              }}
            >
              <Database className="h-4 w-4" /> Load demo data
            </Button>
            <Button variant="outline" className="text-destructive" disabled={demoCount === 0} onClick={() => setConfirmRemove(true)}>
              <Trash2 className="h-4 w-4" /> Remove demo data{demoCount ? ` (${demoCount})` : ""}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove all demo data?"
        description="Only records flagged as demo are deleted. Your real vehicles, drivers and documents are untouched."
        confirmLabel="Remove demo data"
        destructive
        onConfirm={async () => {
          const res = await removeDemoData();
          if (res.ok) { toast.success("Demo data removed"); router.refresh(); } else toast.error(res.error);
        }}
      />
    </>
  );
}
