import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} · Fleet compliance`,
    short_name: APP_NAME,
    description: "Track vehicle document expiry, renewals and fleet compliance in one place.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f9fb",
    theme_color: "#142a52",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's Actions", url: "/actions" },
      { name: "Vehicles", url: "/vehicles" },
    ],
  };
}
