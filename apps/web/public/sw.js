/**
 * Campus Marche Service Worker
 *
 * Caching strategy:
 *   - Cache-first:   /_next/static/ (immutable JS/CSS bundles)
 *   - Cache-first:   /images/ and common image formats
 *   - Network-first: HTML navigation + API health checks
 *   - Network-only:  ALL payment, auth, order, and API routes
 *
 * CRITICAL: Payment, auth, and order endpoints are NEVER cached.
 * Serving stale data for these could cause duplicate transactions,
 * incorrect order states, or broken escrow flows.
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `campus-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `campus-images-${CACHE_VERSION}`;

// These URL patterns are NEVER intercepted — always go to network
const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /\/payments?\//,
  /\/orders?\//,
  /\/auth\//,
  /\/uploads\//,
  /\/webhook/,
  /paystack\.co/,
  /checkout\.paystack\.com/,
  /api\.paystack\.co/,
  /arkesel\.com/,
  // Next.js data fetching internals
  /\/_next\/data\//,
  // Any POST, PUT, PATCH, DELETE — never cache mutations
];

function isNeverCache(url, method = "GET") {
  if (method !== "GET") return true;
  return NEVER_CACHE_PATTERNS.some((p) => p.test(url));
}

// Static assets: immutable JS/CSS bundles from Next.js
function isStaticAsset(url) {
  return url.includes("/_next/static/");
}

// Images worth caching
function isImage(url) {
  return (
    url.includes("/images/") ||
    /\.(png|jpe?g|gif|webp|avif|svg|ico)(\?.*)?$/.test(url)
  );
}

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // Cache the offline fallback page immediately
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(["/offline"]))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  // Remove old cache versions
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;
  const method = request.method;

  // Skip non-GET and all payment/auth/order/API routes — let them fall through
  if (isNeverCache(url, method)) return;

  // Skip non-http(s) requests (chrome-extension:// etc.)
  if (!url.startsWith("http")) return;

  if (isStaticAsset(url)) {
    // Cache-first: Next.js static bundles are content-hashed and immutable
    event.respondWith(cacheFirst(STATIC_CACHE, request));
  } else if (isImage(url)) {
    // Cache-first with network fallback for images
    event.respondWith(cacheFirst(IMAGE_CACHE, request));
  } else if (request.mode === "navigate") {
    // Network-first for HTML navigation; offline fallback if unreachable
    event.respondWith(networkFirstWithOfflineFallback(request));
  }
  // All other requests (fonts served by Next.js, etc.) fall through to browser
});

// ─── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return new Response("Resource unavailable offline", { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match("/offline");
    return (
      offline ||
      new Response("<h1>You are offline</h1>", {
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}
