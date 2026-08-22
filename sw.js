/* APEX Service Worker — Netzwerk zuerst (frische Daten), Cache als Offline-Fallback */
const CACHE = "apex-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
              "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png",
              "./favicon-16.png", "./apex-2026.ics"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return r;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(r =>
        r || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())
      )
    )
  );
});
