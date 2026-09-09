"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  BarChart3, Bell, FileText, LayoutDashboard, LogOut, Settings,
  Truck, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/auth";
import { APP_NAME, cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Truck },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/actions", label: "Today's Actions", icon: Zap },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Bottom bar on phones - the five screens a fleet owner uses daily. */
export const MOBILE_ITEMS = [
  NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], NAV_ITEMS[2], NAV_ITEMS[5],
];

function NavLink({
  href, label, icon: Icon, active, onNavigate,
}: {
  href: string; label: string; icon: typeof Truck; active: boolean; onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

export function SidebarContent({
  userEmail, fleetName, unreadCount, onNavigate,
}: {
  userEmail: string;
  fleetName: string;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-primary text-primary-foreground">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1">
          <Image src="/logo-mark.png" alt="" width={40} height={20} className="h-auto w-full" priority />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{APP_NAME}</p>
          <p className="truncate text-xs text-white/60">{fleetName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            onNavigate={onNavigate}
          />
        ))}
        {unreadCount > 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs text-white/80">
            <Bell className="h-3.5 w-3.5" aria-hidden /> {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </nav>

      <div className="border-t border-white/15 px-3 py-3">
        <p className="truncate px-1 text-xs text-white/60">Signed in as</p>
        <p className="truncate px-1 text-sm font-medium">{userEmail}</p>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="mt-2 w-full justify-start text-white/80 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </form>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden">
      {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate px-1">{label.replace("Today's ", "")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
