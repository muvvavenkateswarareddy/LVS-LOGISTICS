"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { SidebarContent } from "@/components/app-nav";
import type { AppNotification } from "@/lib/types";

export function AppHeader({
  userEmail, fleetName, notifications,
}: {
  userEmail: string;
  fleetName: string;
  notifications: AppNotification[];
}) {
  const router = useRouter();
  const [drawer, setDrawer] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-3 sm:px-4">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <form
        className="relative flex-1 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vehicles, documents, drivers…"
          aria-label="Global search"
          className="pl-8"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <NotificationDropdown notifications={notifications} />
      </div>

      <Dialog open={drawer} onOpenChange={setDrawer}>
        <DialogContent className="left-0 top-0 h-full max-h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-0 p-0">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <SidebarContent
            userEmail={userEmail}
            fleetName={fleetName}
            unreadCount={unread}
            onNavigate={() => setDrawer(false)}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
}
