// FleetGuard service worker.
// Deliberately minimal: the app is live compliance data, so nothing is served
// stale. It caches the shell for installability and shows an offline notice
// when a navigation fails.
const CACHE = "fleetguard-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // static assets are content-hashed, so cache-first is safe for them only
  if (request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ??
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        }),
      ),
    );
  }
});
