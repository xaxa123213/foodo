// Offline support: serve from cache instantly, refresh the cache in the background.
// Bump CACHE whenever the app shell file list changes.
const CACHE = "foodo-v7";
const SHELL = [
  "./",
  "index.html",
  "styles.css?v=6",
  "app.js?v=7",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: e.request.mode === "navigate" });
      const fresh = fetch(e.request)
        .then((res) => {
          if (res.ok || res.type === "opaque") cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
