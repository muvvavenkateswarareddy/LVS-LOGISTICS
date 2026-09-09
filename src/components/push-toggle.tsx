"use client";
import * as React from "react";
import { BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/server/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Turns device push reminders on or off for this browser/device. */
export function PushToggle() {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [subscribed, setSubscribed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [standalone, setStandalone] = React.useState(true);

  React.useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS only allows push from a home-screen install
        !/iphone|ipad|ipod/i.test(navigator.userAgent),
    );
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) { toast.error("Push keys are not configured on this deployment"); return; }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(
          permission === "denied"
            ? "Notifications are blocked for this site in your browser settings"
            : "Notification permission was dismissed",
        );
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const res = await savePushSubscription({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
        user_agent: navigator.userAgent,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setSubscribed(true);
      toast.success("Reminders enabled on this device");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not enable reminders");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Reminders turned off on this device");
    } finally {
      setBusy(false);
    }
  }

  if (supported === false) {
    return (
      <p className="rounded-md border p-3 text-sm text-muted-foreground">
        This browser can&apos;t deliver push reminders. On iPhone, add the app to your Home Screen first
        (Share → Add to Home Screen), then open it from there.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
        <span className="flex items-center gap-2 text-sm">
          <BellRing className="h-4 w-4 text-muted-foreground" aria-hidden />
          Device reminders
        </span>
        <span className="flex items-center gap-2">
          <Badge variant={subscribed ? "default" : "muted"}>{subscribed ? "On" : "Off"}</Badge>
          <Button size="sm" variant={subscribed ? "outline" : "default"} loading={busy}
                  onClick={() => (subscribed ? disable() : enable())}>
            {subscribed ? "Turn off" : "Enable"}
          </Button>
        </span>
      </div>

      {subscribed ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const res = await sendTestPush();
            if (res.ok) toast.success("Test notification sent"); else toast.error(res.error);
          }}
        >
          <Send className="h-4 w-4" /> Send a test notification
        </Button>
      ) : null}

      {!standalone ? (
        <p className="text-xs text-muted-foreground">
          On iPhone, install the app to your Home Screen first — iOS only delivers push to installed apps.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        One daily digest at 8:00 AM IST covering expired documents and anything due within 60 days.
      </p>
    </div>
  );
}
