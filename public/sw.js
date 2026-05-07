// public/sw.js
const CACHE_NAME = "simtrack-v1";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Network first, fallback to cache ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Skip non-GET and API requests (always go to network for API)
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a clone of the response
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        // Network failed — serve from cache
        caches.match(event.request).then(
          (cached) => cached ?? caches.match("/index.html")
        )
      )
  );
});