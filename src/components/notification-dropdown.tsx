"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllRead, markRead } from "@/server/notifications";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  expired: "bg-slate-800",
  critical: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-emerald-600",
};

export function NotificationDropdown({ notifications }: { notifications: AppNotification[] }) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read_at);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unread.length} unread`}>
          <Bell className="h-5 w-5" />
          {unread.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await markAllRead(); router.refresh(); }}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {notifications.slice(0, 20).map((n) => (
              <li key={n.id}>
                <Link
                  href={n.vehicle_id ? `/vehicles/${n.vehicle_id}` : "/actions"}
                  onClick={async () => { if (!n.read_at) { await markRead(n.id); router.refresh(); } }}
                  className={cn("flex gap-2 px-3 py-2.5 text-sm hover:bg-accent/60", !n.read_at && "bg-primary/5")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[n.severity] ?? "bg-muted-foreground")} />
                  <span className="min-w-0">
                    <span className="block font-medium">{n.title}</span>
                    {n.body ? <span className="block text-xs text-muted-foreground">{n.body}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
