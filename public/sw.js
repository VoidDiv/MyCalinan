/* ============================================================
   MyCalinan service worker  →  put this file at  public/sw.js

   What it does
   - Saves every page the user opens (and the pages linked from the
     home page, 2 levels deep) so they open with NO internet:
     barangay officials, Explore, History, Hotlines, etc.
   - Saves the JS/CSS/fonts those pages need, plus their pictures: the ones
     written in each page, the ones the app asks it to save (Explore photos,
     officials, announcements), and any picture the person looks at.
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

// Pages that must work offline. The Explore and Documents menus only draw their
// links when you open them, so the background save cannot "see" those links on
// its own — every page is listed here so it is always saved.
const EXTRA_PATHS = [
  // Explore
  "/explore/HealthCare",
  "/explore/Education",
  "/explore/Transportation",
  "/explore/Finance",
  "/explore/Community",
  "/explore/Lifestyle",
  "/explore/Shopping",
  "/explore/Food",
  "/explore/Hotspots",
  // Documents
  "/documents/PoliceClearance",
  "/documents/BarangayClearance",
  "/documents/BarangayCertificate",
  "/documents/Cedula",
  "/documents/Postal",
  // Map, History, Hotlines, news
  "/map",
  "/others/History",
  "/others/Hotlines",
  "/others/Announcements",
  "/others/Events",
];

const MAX_CRAWL_PAGES = 40; // how many pages the background save will fetch
const MAX_CRAWL_DEPTH = 2; // home → section → sub-page
const MAX_PAGES = 80;
const MAX_IMAGES = 400; // pictures kept on the phone (oldest are removed first)
const IMG_WIDTH = 640; // width of the small saved copy of a picture
const IMG_QUALITY = 75;
const MAX_RAW_IMAGE_BYTES = 3000000; // an original bigger than this (3 MB) is not saved
const WARM_BUDGET_BYTES = 30000000; // one background save of pictures stops after ~30 MB
const MAX_WARM_IMAGES = 160;
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
  const abs = /\/_next\/static\/[^"'\s\\<>)]+?\.(?:js|css|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg)/g;
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

/* ── pictures ──
   One saved copy per picture, whatever size was asked for. A picture can be asked
   for in two ways — straight from its address (<img src="https://…">) or through
   Next.js (/_next/image?url=…&w=…). Both are matched to the same saved copy. */

// the address Next.js uses for a resized copy of a picture
function optimizedHref(rawHref) {
  const u = new URL(rawHref);
  const param = u.origin === self.location.origin ? u.pathname + u.search : rawHref;
  return new URL(
    `/_next/image?url=${encodeURIComponent(param)}&w=${IMG_WIDTH}&q=${IMG_QUALITY}`,
    self.location.origin
  ).href;
}

// key = where this request is saved; other = where the same picture may be saved in its other form
function imageKeys(href) {
  const u = new URL(href);
  if (u.origin === self.location.origin && u.pathname === "/_next/image") {
    const param = u.searchParams.get("url") || "";
    return {
      key: new URL("/_next/image?url=" + encodeURIComponent(param), self.location.origin).href,
      other: new URL(param, self.location.origin).href,
    };
  }
  const param = u.origin === self.location.origin ? u.pathname + u.search : u.href;
  return {
    key: u.href,
    other: new URL("/_next/image?url=" + encodeURIComponent(param), self.location.origin).href,
  };
}

async function putImage(key, res) {
  try {
    const cache = await caches.open(CACHES.images);
    await cache.put(key, res);
    await trimCache(CACHES.images, MAX_IMAGES);
  } catch (_) {
    /* storage is full — skip this one */
  }
}

// a picture the person is looking at: use the saved copy, otherwise load and save it
async function imageStrategy(event) {
  const req = event.request;
  const { key, other } = imageKeys(req.url);
  const cache = await caches.open(CACHES.images);
  const hit = (await cache.match(key)) || (await cache.match(other));
  if (hit) return hit;

  const sameOrigin = new URL(req.url).origin === self.location.origin;
  try {
    const res = await fetch(sameOrigin ? req : new Request(req.url, { mode: "cors", credentials: "omit" }));
    if (res.ok) event.waitUntil(putImage(key, res.clone()));
    return res;
  } catch (_) {
    if (!sameOrigin) {
      try {
        return await fetch(req); // that site does not allow CORS: show it, just don't save it
      } catch (__) {
        /* offline */
      }
    }
    return Response.error();
  }
}

// save one picture ahead of time. Returns the bytes saved (0 = nothing / already saved).
async function warmOne(raw) {
  // only real addresses: "/image/x.jpg" or "https://…" (not "//host", not plain words)
  if (typeof raw !== "string" || raw.startsWith("//") || !(raw.startsWith("/") || /^https?:\/\//i.test(raw))) return 0;
  let rawHref;
  try {
    rawHref = new URL(raw, self.location.origin).href;
  } catch (_) {
    return 0;
  }
  const host = new URL(rawHref).hostname;
  if (!/^https?:/.test(rawHref) || SKIP_IMAGE_HOSTS.test(host)) return 0;

  const cache = await caches.open(CACHES.images);
  const opt = optimizedHref(rawHref);
  const optKey = imageKeys(opt).key;
  if ((await cache.match(optKey)) || (await cache.match(rawHref))) return 0;

  // 1) a small resized copy (usually 50–150 KB)
  try {
    const res = await fetch(opt, { headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" } });
    if (res.ok && (res.headers.get("content-type") || "").startsWith("image/")) {
      const copy = res.clone();
      const size = (await res.blob()).size;
      await putImage(optKey, copy);
      return size;
    }
  } catch (_) {
    /* fall through to the original */
  }

  // 2) the original, but only if it is not huge
  try {
    const sameOrigin = new URL(rawHref).origin === self.location.origin;
    const res = await fetch(sameOrigin ? rawHref : new Request(rawHref, { mode: "cors", credentials: "omit" }));
    if (!res.ok) return 0;
    const copy = res.clone();
    const size = (await res.blob()).size;
    if (size > MAX_RAW_IMAGE_BYTES) return 0;
    await putImage(rawHref, copy);
    return size;
  } catch (_) {
    return 0;
  }
}

async function warmImages(urls, limit) {
  const list = [...new Set(urls)].slice(0, limit || MAX_WARM_IMAGES);
  let spent = 0;
  let next = 0;
  async function worker() {
    while (next < list.length && spent < WARM_BUDGET_BYTES) {
      spent += await warmOne(list[next++]);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return spent;
}

// pictures written inside a page's HTML (<img src> and srcset)
function extractImageSources(html) {
  const out = new Set();
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  const add = (value) => {
    let v = (value || "").trim().replace(/&amp;/g, "&");
    if (!v || v.startsWith("data:") || v.startsWith("blob:") || v.startsWith("/_next/static/")) return;
    if (v.startsWith("/_next/image")) {
      try {
        const param = new URL(v, self.location.origin).searchParams.get("url");
        if (param) out.add(param);
      } catch (_) {}
      return;
    }
    if (v.startsWith("/") || /^https?:\/\//i.test(v)) out.add(v);
  };
  for (const tag of tags) {
    const src = tag.match(/\bsrc="([^"]*)"/i);
    if (src) add(src[1]);
    const set = tag.match(/\bsrcset="([^"]*)"/i);
    if (set) set[1].split(",").forEach((c) => add(c.trim().split(/\s+/)[0]));
  }
  return [...out];
}

/* ── background "save the site" crawl ── */

async function crawl(options = {}) {
  const maxDepth = options.maxDepth ?? MAX_CRAWL_DEPTH;
  const seen = new Set();
  const assets = new Set();
  const images = new Set();
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
      extractImageSources(r.html).forEach((u) => images.add(u));
      if (r.depth < maxDepth) {
        extractLinks(r.html).forEach((p) => {
          if (!seen.has(p)) frontier.push({ path: p, depth: r.depth + 1 });
        });
      }
    }
  }

  await cacheAssets([...assets]);
  if (images.size) await warmImages([...images], options.maxImages || 120).catch(() => {});
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
    crawl({ maxDepth: 0, maxImages: 60 })
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
  if (type === "WARM_IMAGES" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      warmImages(event.data.urls.filter((u) => typeof u === "string"))
        .then(async (bytes) => {
          const all = await self.clients.matchAll();
          all.forEach((c) => c.postMessage({ type: "IMAGES_DONE", bytes }));
        })
        .catch(() => {})
    );
  }
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
      event.respondWith(imageStrategy(event));
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
    event.respondWith(imageStrategy(event));
    return;
  }
  if (["style", "script", "font", "manifest"].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(event, CACHES.static));
  }
});