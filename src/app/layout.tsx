import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { RegisterSW } from "@/components/register-sw";
import { APP_NAME } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · Fleet compliance`, template: `%s · ${APP_NAME}` },
  description: "Track vehicle document expiry, renewals and fleet compliance in one place.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#142a52",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterSW />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
