"use client";

import { useEffect } from "react";

/* ============================================================
   Registers the service worker and keeps the offline copy fresh.

   - Saves the site's pages through the service worker (public/sw.js)
   - Downloads the Firestore data for offline use (needs the offline
     cache enabled in lib/Firebase.ts — see the setup notes)
   ============================================================ */

const PAGES_KEY = "mycalinan_pages_saved_at";
const DATA_KEY = "mycalinan_data_saved_at";
const ONE_DAY = 24 * 60 * 60 * 1000;

// Firestore collections to keep available offline.
// Add your History / Hotlines collection names here if they live in Firestore.
const OFFLINE_COLLECTIONS = [
  "barangayOfficials",
  "community",
  "education",
  "finance",
  "food",
  "healthcare",
  "hotspots",
  "lifestyle",
  "shopping",
  "transport",
];

function isDue(key: string, every: number) {
  const last = Number(localStorage.getItem(key) ?? 0);
  return Date.now() - last > every;
}

function connectionIsExpensive() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  return !!c && (c.saveData === true || c.effectiveType === "2g" || c.effectiveType === "slow-2g");
}

async function savePages() {
  if (!navigator.onLine || !isDue(PAGES_KEY, ONE_DAY)) return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "WARM" });
  localStorage.setItem(PAGES_KEY, String(Date.now()));
}

async function saveData() {
  if (!navigator.onLine || connectionIsExpensive() || !isDue(DATA_KEY, ONE_DAY)) return;
  try {
    const [{ collection, getDocs }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/lib/Firebase"),
    ]);
    let ok = 0;
    for (const name of OFFLINE_COLLECTIONS) {
      try {
        await getDocs(collection(db, name));
        ok++;
      } catch (err) {
        console.warn(`Offline sync skipped "${name}":`, err);
      }
    }
    if (ok > 0) localStorage.setItem(DATA_KEY, String(Date.now()));
  } catch (err) {
    console.warn("Offline data sync failed:", err);
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // While developing, make sure an old service worker from a production test
    // can't serve stale pages on localhost.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }

    const sync = () => {
      const run = () => {
        savePages().catch(() => {});
        saveData().catch(() => {});
      };
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
      } else {
        setTimeout(run, 3000);
      }
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(sync)
      .catch((err) => console.error("Service worker registration failed:", err));

    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);

  return null;
}