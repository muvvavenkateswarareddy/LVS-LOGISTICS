import type { Metadata } from "next";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · Fleet compliance`, template: `%s · ${APP_NAME}` },
  description: "Track vehicle document expiry, renewals and fleet compliance in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
