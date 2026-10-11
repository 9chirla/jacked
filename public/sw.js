/* Jacked service worker — shell cache + safe navigation caching. */
const CACHE_NAME = "jacked-shell-v4";
const PRECACHE = [
  "/",
  "/offline",
  "/today",
  "/manifest.webmanifest",
  "/icons/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function shouldBypass(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("_next/webpack-hmr")
  );
}

/** Next soft-nav / prefetch Flight payloads must never be served stale. */
function isRscRequest(request, url) {
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch") === "1") return true;
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/x-component");
}

function putCache(request, response) {
  if (!response || !response.ok) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) return;

  // Soft navigations: always network (live data).
  if (isRscRequest(request, url)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      }),
    );
    return;
  }

  // Full document navigations: stale-while-revalidate for instant paint.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            putCache(request, response);
            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }

        const network = await networkPromise;
        if (network) return network;
        return (await caches.match("/offline")) || Response.error();
      })(),
    );
    return;
  }

  // Static assets / icons: cache-first, refresh in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          putCache(request, response);
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
