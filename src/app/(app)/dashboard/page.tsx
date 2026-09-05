import Link from "next/link";
import { AlertTriangle, CalendarClock, CircleSlash, ShieldCheck, Truck } from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { formatDaysRemaining } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { ExpiryIndicator } from "@/components/expiry-indicator";
import { DocumentCard } from "@/components/document-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { counts, compliancePercent, fleetSummary, byType, urgent, upcoming } = data;

  return (
    <>
      <PageHeader title="Dashboard" description="What needs your attention today.">
        <Button asChild variant="outline"><Link href="/vehicles">All vehicles</Link></Button>
        <Button asChild><Link href="/actions">Today&apos;s actions</Link></Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total vehicles" value={counts.vehicles} icon={Truck} href="/vehicles" />
        <StatCard label="Expired documents" value={counts.expired} icon={CircleSlash} tone="critical"
                  hint="Fix these first" href="/actions" />
        <StatCard label="Expiring in 30 days" value={counts.within30} icon={AlertTriangle} tone="warning" href="/documents?filter=30" />
        <StatCard label="Expiring in 60 days" value={counts.within60} icon={CalendarClock} tone="upcoming" href="/documents?filter=60" />
        <StatCard label="Fully compliant" value={counts.compliant} icon={ShieldCheck} tone="success"
                  hint={`${counts.missing} missing documents`} href="/vehicles?filter=compliant" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Urgent documents</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/documents">View all</Link></Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {urgent.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="Nothing urgent"
                          description="No expired documents and nothing expiring in the next 30 days." />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Expiry date</TableHead>
                        <TableHead>Days remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {urgent.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <Link href={`/vehicles/${doc.vehicle_id}`} className="hover:underline">
                              {doc.vehicle.registration_number}
                            </Link>
                          </TableCell>
                          <TableCell>{doc.document_type?.name}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(doc.expiry_date)}</TableCell>
                          <TableCell><ExpiryIndicator expiryDate={doc.expiry_date} /></TableCell>
                          <TableCell><StatusBadge status={doc.status} /></TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/vehicles/${doc.vehicle_id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="space-y-2 p-4 md:hidden">
                  {urgent.map((doc) => (
                    <li key={doc.id}>
                      <DocumentCard
                        vehicleId={doc.vehicle_id}
                        registration={doc.vehicle.registration_number}
                        documentName={doc.document_type?.name ?? "Document"}
                        documentNumber={doc.document_number}
                        expiryDate={doc.expiry_date}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Fleet compliance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-4xl font-semibold tabular-nums">{compliancePercent}%</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${compliancePercent}%` }} />
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-emerald-50 p-2">
                  <dt className="text-xs text-emerald-700">Compliant</dt>
                  <dd className="text-lg font-semibold text-emerald-700">{fleetSummary.compliant}</dd>
                </div>
                <div className="rounded-md bg-amber-50 p-2">
                  <dt className="text-xs text-amber-700">Need attention</dt>
                  <dd className="text-lg font-semibold text-amber-700">{fleetSummary.needAttention}</dd>
                </div>
                <div className="rounded-md bg-red-50 p-2">
                  <dt className="text-xs text-red-700">Critical</dt>
                  <dd className="text-lg font-semibold text-red-700">{fleetSummary.critical}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Compliance by document</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add documents to see this breakdown.</p>
              ) : (
                byType.map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{t.name}</span>
                      <span className="font-medium tabular-nums">{t.percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={t.percent >= 90 ? "h-full bg-emerald-600" : t.percent >= 75 ? "h-full bg-amber-500" : "h-full bg-red-600"}
                        style={{ width: `${t.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Upcoming renewals · next 60 days</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link href="/reports">Reports</Link></Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No renewals due" description="Nothing expires in the next 60 days." />
          ) : (
            <ul className="grid gap-2 lg:grid-cols-2">
              {upcoming.slice(0, 10).map((doc) => (
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
          )}
        </CardContent>
      </Card>
    </>
  );
}
