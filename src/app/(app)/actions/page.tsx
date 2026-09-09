import Link from "next/link";
import { AlertTriangle, CalendarClock, CircleSlash, FileWarning, ShieldCheck } from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DocumentCard } from "@/components/document-card";
import { EmptyState } from "@/components/empty-state";
import { formatDaysRemaining } from "@/lib/status";

export const metadata = { title: "Today's Actions" };

export default async function ActionsPage() {
  const { documents, compliance } = await getDashboardData();

  const expired = documents.filter((d) => d.status === "expired");
  const renewNow = documents.filter((d) => d.days !== null && d.days >= 0 && d.days <= 7);
  const comingSoon = documents.filter((d) => d.days !== null && d.days > 7 && d.days <= 30);
  const missing = compliance.filter((c) => c.compliance.missingTypes.length > 0);

  const sections = [
    {
      key: "expired",
      title: "Critical · expired documents",
      description: "These vehicles are not road-legal until renewed.",
      icon: CircleSlash,
      className: "border-red-200",
      items: expired,
    },
    {
      key: "renew",
      title: "Renew now · expiring within 7 days",
      description: "Start the renewal today to avoid downtime.",
      icon: AlertTriangle,
      className: "border-amber-200",
      items: renewNow,
    },
    {
      key: "soon",
      title: "Coming soon · expiring within 30 days",
      description: "Plan these renewals into the month.",
      icon: CalendarClock,
      className: "",
      items: comingSoon,
    },
  ];

  const totalActions = expired.length + renewNow.length + comingSoon.length + missing.length;

  return (
    <>
      <PageHeader
        title="Today's Actions"
        description={totalActions === 0 ? "Nothing needs your attention right now." : `${totalActions} item${totalActions === 1 ? "" : "s"} need attention.`}
      >
        <Button asChild variant="outline"><Link href="/reports">Export a report</Link></Button>
      </PageHeader>

      {totalActions === 0 ? (
        <Card>
          <EmptyState icon={ShieldCheck} title="You're all caught up"
                      description="No expired documents, no renewals due in the next 30 days and no missing documents." />
        </Card>
      ) : null}

      <div className="space-y-4">
        {sections.map((section) =>
          section.items.length === 0 ? null : (
            <Card key={section.key} className={section.className}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-4 w-4" aria-hidden />
                  {section.title}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {section.items.length}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 lg:grid-cols-2">
                  {section.items.map((doc) => (
                    <li key={doc.id}>
                      <DocumentCard
                        vehicleId={doc.vehicle_id}
                        registration={doc.vehicle.registration_number}
                        documentName={doc.document_type?.name ?? "Document"}
                        documentNumber={doc.document_number}
                        expiryDate={doc.expiry_date}
                        hint={formatDaysRemaining(doc.days)}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ),
        )}

        {missing.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="h-4 w-4" aria-hidden />
                Missing · required documents not on file
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{missing.length}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Upload these so the vehicle can be tracked properly.</p>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 lg:grid-cols-2">
                {missing.map(({ vehicle, compliance: c }) => (
                  <li key={vehicle.id}>
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 hover:bg-accent/60"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{vehicle.registration_number}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          Missing: {c.missingTypes.join(", ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-amber-700">{c.score}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
