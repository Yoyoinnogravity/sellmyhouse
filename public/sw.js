/* SellMyHouse PWA service worker (prototype v1).
   Navigations are network-first with a cached fallback so the shell still
   opens on flaky data. Static assets are cached; map tiles and listing
   photos are cached as seen. Version the cache name to ship updates. */
const VERSION = "smh-v2";
const CORE_CACHE = `core-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const MEDIA_CACHE = `media-${VERSION}`;
const CORE = ["/", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![CORE_CACHE, PAGES_CACHE, MEDIA_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match("/")),
        ),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    if (/\.(png|jpe?g|webp|avif|svg)$/i.test(url.pathname)) {
      event.respondWith(
        caches.open(MEDIA_CACHE).then((cache) =>
          cache.match(request).then((hit) => {
            const network = fetch(request)
              .then((response) => {
                if (response.ok) cache.put(request, response.clone());
                return response;
              })
              .catch(() => hit);
            return hit || network;
          }),
        ),
      );
    }
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CORE_CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }
});
