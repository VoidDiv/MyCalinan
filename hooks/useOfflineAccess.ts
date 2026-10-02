"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/* ============================================================
   useOfflineAccess()

   Tells the menus which pages can be opened RIGHT NOW:
   - online  → every page
   - offline → only the pages the service worker has saved on the device

   const { online, isAvailable } = useOfflineAccess();
   isAvailable("/explore/Food")  → true / false
   ============================================================ */

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getOnline = () => navigator.onLine;
const getServerOnline = () => true;

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

export function useOfflineAccess() {
  const online = useSyncExternalStore(subscribe, getOnline, getServerOnline);
  const [saved, setSaved] = useState<Set<string> | null>(null); // null = not known yet

  // Ask the service worker for its list of saved pages (again when the connection changes)
  useEffect(() => {
    let cancelled = false;
    fetch("/__sw/pages", { cache: "no-store" })
      .then(async (res) => {
        const meta: Record<string, unknown> = res.ok ? await res.json().catch(() => ({})) : {};
        if (!cancelled) setSaved(new Set(Object.keys(meta)));
      })
      .catch(() => {
        if (!cancelled) setSaved(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [online]);

  const isAvailable = useCallback(
    (path: string) => online || saved === null || saved.has(normalize(path)),
    [online, saved]
  );

  return { online, isAvailable };
}