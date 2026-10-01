"use client";

import { useEffect, useState } from "react";

type SavedPage = { path: string; title: string; savedAt: number };
type Meta = Record<string, { title?: string; savedAt?: number }>;

function labelFor(path: string, title: string | undefined, homeTitle: string | undefined) {
  // Use the page <title> only when it is different from the generic site title
  const t = (title ?? "").replace(/\s*[|\-–—]\s*MyCalinan\s*$/i, "").trim();
  if (t && t !== homeTitle && !/^(mycalinan|offline)$/i.test(t)) return t;

  if (path === "/") return "Home";
  const last = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
  return last
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PageLink({ page }: { page: SavedPage }) {
  return (
    <li>
      {/* plain <a> on purpose: forces a normal page load so the service worker answers it */}
      <a
        href={page.path}
        className="block rounded-xl border border-canopy-600/30 bg-white px-4 py-3 text-left font-medium text-canopy-800 transition hover:bg-canopy-100"
      >
        {page.title}
      </a>
    </li>
  );
}

export default function OfflineCachedPages() {
  const [pages, setPages] = useState<SavedPage[] | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    let cancelled = false;
    fetch("/__sw/pages", { cache: "no-store" })
      .then(async (r): Promise<Meta> => (r.ok ? ((await r.json()) as Meta) : {}))
      .then((meta) => {
        if (cancelled) return;
        const homeTitle = meta["/"]?.title;
        const list = Object.entries(meta)
          .filter(([path]) => path !== "/offline")
          .map(([path, v]) => ({
            path,
            title: labelFor(path, v.title, homeTitle),
            savedAt: v.savedAt ?? 0,
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
        setPages(list);
      })
      .catch(() => !cancelled && setPages([]));

    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const home = pages?.find((p) => p.path === "/");
  const explore = pages?.filter((p) => p.path.startsWith("/explore/")) ?? [];
  const others = pages?.filter((p) => p.path !== "/" && !p.path.startsWith("/explore/")) ?? [];

  return (
    <div className="mt-2 w-full max-w-md text-center">
      {online ? (
        <p className="mb-3 rounded-lg bg-canopy-100 px-4 py-2 text-sm text-canopy-800">
          You&rsquo;re back online.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-[var(--radius-stall)] bg-canopy-700 px-6 py-3 font-semibold text-white hover:bg-canopy-800"
      >
        Try again
      </button>

      {pages === null && <p className="mt-8 text-sm text-ink-500">Checking saved pages…</p>}

      {pages !== null && pages.length === 0 && (
        <p className="mt-8 text-sm text-ink-500">
          No saved pages yet. Open MyCalinan once while you have internet and it will save the
          barangay officials, Explore, History and Hotlines for offline use.
        </p>
      )}

      {pages !== null && pages.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="font-display text-lg font-semibold text-canopy-900">
            Available offline
          </h2>

          {home && (
            <ul className="mt-3 space-y-2">
              <PageLink page={home} />
            </ul>
          )}

          {others.length > 0 && (
            <>
              <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-durian-500">
                Pages
              </h3>
              <ul className="mt-2 space-y-2">
                {others.map((p) => (
                  <PageLink key={p.path} page={p} />
                ))}
              </ul>
            </>
          )}

          {explore.length > 0 && (
            <>
              <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-durian-500">
                Explore
              </h3>
              <ul className="mt-2 space-y-2">
                {explore.map((p) => (
                  <PageLink key={p.path} page={p} />
                ))}
              </ul>
            </>
          )}

          <p className="mt-6 text-center text-xs text-ink-500">
            Maps, directions and new updates need an internet connection.
          </p>
        </div>
      )}
    </div>
  );
}