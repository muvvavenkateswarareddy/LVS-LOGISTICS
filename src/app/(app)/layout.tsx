import { getNotifications, getSession } from "@/lib/queries";
import { syncNotifications } from "@/server/notifications";
import { AppHeader } from "@/components/app-header";
import { MobileBottomNav, SidebarContent } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, fleet } = await getSession();
  // keeps the in-app reminder rows in step with today's date
  await syncNotifications().catch(() => 0);
  const notifications = await getNotifications();
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-60 md:block">
        <SidebarContent userEmail={user.email ?? ""} fleetName={fleet?.name ?? "My Fleet"} unreadCount={unread} />
      </aside>

      <div className="md:pl-60">
        <AppHeader userEmail={user.email ?? ""} fleetName={fleet?.name ?? "My Fleet"} notifications={notifications} />
        <main className="mx-auto w-full max-w-[1400px] px-3 pb-24 pt-4 sm:px-5 md:pb-8">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
