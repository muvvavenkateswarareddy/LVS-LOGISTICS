import { getDocumentTypes, getSession, getTeam, getVehicles } from "@/lib/queries";
import { SettingsView } from "@/components/settings-view";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [{ supabase, user, fleet }, types, vehicles, team] = await Promise.all([
    getSession(), getDocumentTypes(), getVehicles(), getTeam(),
  ]);
  if (!fleet) return null;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email_enabled, sms_enabled, whatsapp_enabled, lead_days")
    .eq("fleet_id", fleet.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <SettingsView
      fleetName={fleet.name}
      userEmail={user.email ?? ""}
      userId={user.id}
      documentTypes={types}
      prefs={{
        email_enabled: prefs?.email_enabled ?? false,
        sms_enabled: prefs?.sms_enabled ?? false,
        whatsapp_enabled: prefs?.whatsapp_enabled ?? false,
        lead_days: prefs?.lead_days ?? [60, 30, 15, 7, 1, 0],
      }}
      demoCount={vehicles.filter((v) => v.is_demo).length}
      team={team}
    />
  );
}
