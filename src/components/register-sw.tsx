"use client";
import { useEffect } from "react";

/** Registers the service worker so the app is installable. */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // installability is a nice-to-have; never break the app over it
    });
  }, []);
  return null;
}
