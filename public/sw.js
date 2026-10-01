/* ============================================================
   MyCalinan service worker  →  put this file at  public/sw.js

   What it does
   - Saves every page the user opens (and the pages linked from the
     home page, 2 levels deep) so they open with NO internet:
     barangay officials, Explore, History, Hotlines, etc.
   - Saves the JS/CSS/fonts those pages need, plus their images.
   - Shows a smart "You're offline" page that lists the saved pages.
   - Never saves: /api, admin, login, signup, maps, Firestore calls.

   To refresh everything for all users after a big change,
   bump VERSION below.
   ============================================================ */

const VERSION = "v1";

const CACHES = {
  pages: `mc-pages-${VERSION}`,
  static: `mc-static-${VERSION}`,
  images: `mc-images-${VERSION}`,
  meta: `mc-meta-${VERSION}`,
};

const OFFLINE_URL = "/offline";

// Always saved when the app is first installed
const START_URLS = ["/offline", "/"];

// Pages that are NOT linked from the home page but must work offline.
// Example: ["/history", "/hotlines"]   ← use your real page paths
const EXTRA_PATHS = [];

const MAX_CRAWL_PAGES = 40; // how many pages the background save will fetch
const MAX_CRAWL_DEPTH = 2; // home → section → sub-page
const MAX_PAGES = 80;
const MAX_IMAGES = 150;
const MAX_STATIC = 500;
const NAV_TIMEOUT_MS = 6000; // slow connection? fall back to the saved copy

// Never cached, always straight to the network
const NEVER_CACHE = [/^\/api\//, /^\/admin/i, /^\/login/i, /^\/signup/i, /^\/__sw\//];

const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const SKIP_IMAGE_HOSTS = /(^|\.)mapbox\.com$/i;

const FALLBACK_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:system-ui,sans-serif;background:#f9f7f4;color:#14351a;text-align:center;padding:24px}
a{background:#2f6b2f;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600}</style></head>
<body><h1>You're offline</h1><p>MyCalinan couldn't load this page. Check your connection and try again.</p>
<a href="/">Try again</a></body></html>`;

/* ───────────────────────── helpers ───────────────────────── */

const isExcluded = (path) => NEVER_CACHE.some((re) => re.test(path));

function normPath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function keyFor(path) {
  return new URL(path, self.location.origin).href;
}

function isHtml(res) {
  return (res.headers.get("content-type") || "").includes("text/html");
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - max;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]); // oldest first
}

/* ── list of saved pages (read by the /offline page via /__sw/pages) ── */

let metaQueue = Promise.resolve();

async function readMeta() {
  const cache = await caches.open(CACHES.meta);
  const res = await cache.match("/__sw/pages.json");
  return res ? res.json() : {};
}

function recordPage(path, html) {
  metaQueue = metaQueue
    .then(async () => {
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = m
        ? m[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim()
        : "";
      const meta = await readMeta();
      meta[path] = { title, savedAt: Date.now() };
      const cache = await caches.open(CACHES.meta);
      await cache.put(
        "/__sw/pages.json",
        new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } })
      );
    })
    .catch(() => {});
  return metaQueue;
}

async function listPages() {
  const meta = await readMeta();
  return new Response(JSON.stringify(meta), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/* ── saving a page ── */

async function putPage(path, res, html) {
  if (isExcluded(path)) return;
  const cache = await caches.open(CACHES.pages);
  await cache.put(keyFor(path), res);
  await recordPage(path, html);
  await trimCache(CACHES.pages, MAX_PAGES);
}

/* ── finding links + assets inside a page's HTML ── */

function extractLinks(html) {
  const out = new Set();
  const re = /href="(\/[^"#?\s]*)/g;
  let m;
  while ((m = re.exec(html))) {
    let p = m[1].replace(/&amp;/g, "&");
    if (p.startsWith("//") || p.startsWith("/_next")) continue;
    p = normPath(p);
    const last = p.split("/").pop() || "";
    if (last.includes(".")) continue; // .png .css .ico .webmanifest …
    if (isExcluded(p)) continue;
    out.add(p);
  }
  return [...out];
}

function extractAssets(html) {
  const out = new Set();
  const abs = /\/_next\/static\/[^"'\s\\<>)]+?\.(?:js|css|woff2?|ttf|otf)/g;
  const rel = /static\/(?:chunks|css|media)\/[^"'\s\\<>)]+?\.(?:js|css|woff2?)/g;
  let m;
  while ((m = abs.exec(html))) out.add(m[0]);
  while ((m = rel.exec(html))) out.add("/_next/" + m[0]);
  return [...out];
}

async function cacheAssets(urls) {
  const cache = await caches.open(CACHES.static);
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(
      urls.slice(i, i + 6).map(async (u) => {
        try {
          const key = keyFor(u);
          if (await cache.match(key)) return;
          const res = await fetch(key);
          if (res.ok) await cache.put(key, res);
        } catch (_) {}
      })
    );
  }
  await trimCache(CACHES.static, MAX_STATIC);
}

/* ── background "save the site" crawl ── */

async function crawl(options = {}) {
  const maxDepth = options.maxDepth ?? MAX_CRAWL_DEPTH;
  const seen = new Set();
  const assets = new Set();
  const frontier = [...START_URLS, ...EXTRA_PATHS].map((path) => ({ path, depth: 0 }));
  let saved = 0;

  while (frontier.length && saved < MAX_CRAWL_PAGES) {
    const batch = frontier
      .splice(0, 4)
      .filter(({ path }) => {
        if (seen.has(path) || isExcluded(path)) return false;
        seen.add(path);
        return true;
      });

    const results = await Promise.all(
      batch.map(async ({ path, depth }) => {
        try {
          const res = await fetch(keyFor(path), { credentials: "same-origin" });
          if (!res.ok || res.redirected || !isHtml(res)) return null;
          const html = await res.clone().text();
          await putPage(path, res, html);
          return { depth, html };
        } catch (_) {
          return null;
        }
      })
    );

    for (const r of results) {
      if (!r) continue;
      saved++;
      extractAssets(r.html).forEach((a) => assets.add(a));
      if (r.depth < maxDepth) {
        extractLinks(r.html).forEach((p) => {
          if (!seen.has(p)) frontier.push({ path: p, depth: r.depth + 1 });
        });
      }
    }
  }

  await cacheAssets([...assets]);
  return saved;
}

/* ── fetch strategies ── */

async function handleNavigation(event) {
  const req = event.request;
  const path = normPath(new URL(req.url).pathname);
  try {
    const res = await fetchWithTimeout(req, NAV_TIMEOUT_MS);
    if (res.status >= 500) throw new Error("server error");
    if (res.ok && !res.redirected && res.type === "basic" && isHtml(res)) {
      const forCache = res.clone();
      const forMeta = res.clone();
      event.waitUntil(forMeta.text().then((html) => putPage(path, forCache, html)).catch(() => {}));
    }
    return res;
  } catch (_) {
    const cache = await caches.open(CACHES.pages);
    const saved = await cache.match(keyFor(path));
    if (saved) return saved;
    const offline = await cache.match(keyFor(OFFLINE_URL));
    if (offline) return offline;
    return new Response(FALLBACK_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(event, cacheName, max) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const network = fetch(req)
    .then(async (res) => {
      if (res.ok) {
        await cache.put(req, res.clone());
        if (max) await trimCache(cacheName, max);
      }
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return (await network) || Response.error();
}

// Images/fonts from other sites. Saved only when the other site allows CORS
// (so we never store "opaque" copies, which eat a lot of storage quota).
async function crossOriginCached(event, cacheName, max) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req.url);
  const refresh = () =>
    fetch(req.url, { mode: "cors", credentials: "omit" })
      .then(async (res) => {
        if (res.ok) {
          await cache.put(req.url, res.clone());
          if (max) await trimCache(cacheName, max);
        }
        return res;
      });
  if (hit) {
    event.waitUntil(refresh().catch(() => {}));
    return hit;
  }
  try {
    return await refresh();
  } catch (_) {
    return fetch(req); // that site blocks CORS: load normally, just don't save it
  }
}

/* ───────────────────────── lifecycle ───────────────────────── */

self.addEventListener("install", (event) => {
  // Save the offline page + home page right away; never let this block installing
  event.waitUntil(
    crawl({ maxDepth: 0 })
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(Object.values(CACHES));
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("mc-") && !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  if (type === "WARM") {
    event.waitUntil(
      crawl()
        .then(async (count) => {
          const all = await self.clients.matchAll();
          all.forEach((c) => c.postMessage({ type: "WARM_DONE", count }));
        })
        .catch(() => {})
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Other websites
  if (url.origin !== self.location.origin) {
    if (FONT_HOSTS.has(url.hostname)) {
      event.respondWith(crossOriginCached(event, CACHES.static));
    } else if (req.destination === "image" && !SKIP_IMAGE_HOSTS.test(url.hostname)) {
      event.respondWith(crossOriginCached(event, CACHES.images, MAX_IMAGES));
    }
    return; // everything else (maps, Firestore, Google APIs) goes straight to the network
  }

  // Our own website
  const path = normPath(url.pathname);

  if (path === "/__sw/pages") {
    event.respondWith(listPages());
    return;
  }
  if (isExcluded(path)) return;

  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }
  if (path.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, CACHES.static));
    return;
  }
  if (path.startsWith("/_next/image") || req.destination === "image") {
    event.respondWith(staleWhileRevalidate(event, CACHES.images, MAX_IMAGES));
    return;
  }
  if (["style", "script", "font", "manifest"].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(event, CACHES.static));
  }
});