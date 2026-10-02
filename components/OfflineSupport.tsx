"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import { useExploreListings } from "@/hooks/useLiveListings";

/* ============================================================
   OfflineSupport  (rendered once, in app/layout.tsx)

   1. Shows a gold bar at the top while the phone has no internet.
   2. Once a day, while online, quietly saves the DATA the pages need
      — every Explore listing, the barangay officials, the rules,
      announcements and events — so those pages are full, not empty,
      when there is no signal.

   The pages themselves are saved by public/sw.js.
   Skipped on "data saver" and 2G connections.
   ============================================================ */

const SAVED_AT_KEY = "mycalinan_offline_data_at";
const CACHE_PREFIX = "mycalinan_cache:"; // same keys hooks/useCachedJson.ts reads
const SAVE_EVERY_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 4000; // let the page finish loading first
const LISTEN_MS = 12000; // how long the Explore lists are allowed to download
const API_ENDPOINTS = ["/api/rules", "/api/announcements", "/api/events"];

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

function slowConnection(): boolean {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  return !!c && (!!c.saveData || /(^|-)2g$/.test(c.effectiveType ?? ""));
}

/* Mounting this for a few seconds makes Firestore download — and keep on the
   device — every Explore collection. Same sections the Barangay Map uses. */
function ListingsSaver() {
  useExploreListings("healthcare");
  useExploreListings("education");
  useExploreListings("food");
  useExploreListings("hotspots");
  useExploreListings("community");
  useExploreListings("finance");
  useExploreListings("transport");
  useExploreListings("shopping");
  useExploreListings("lifestyle");
  return null;
}

async function saveApiData() {
  await Promise.all(
    API_ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        localStorage.setItem(CACHE_PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
      } catch {
        /* offline or storage full — try again tomorrow */
      }
    })
  );
}

async function saveOfficials() {
  try {
    await getDocs(collection(db, "barangayOfficials"));
  } catch {
    /* try again tomorrow */
  }
}

export default function OfflineSupport() {
  const online = useSyncExternalStore(subscribe, getOnline, getServerOnline);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!online) return;

    const last = Number(localStorage.getItem(SAVED_AT_KEY) ?? 0);
    if (Date.now() - last < SAVE_EVERY_MS || slowConnection()) return;

    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      setSaving(true);
      saveApiData();
      saveOfficials();
      stopTimer = setTimeout(() => {
        setSaving(false);
        localStorage.setItem(SAVED_AT_KEY, String(Date.now()));
      }, LISTEN_MS);
    }, START_DELAY_MS);

    return () => {
      clearTimeout(startTimer);
      if (stopTimer) clearTimeout(stopTimer);
      setSaving(false);
    };
  }, [online]);

  return (
    <>
      {!online && (
        <div
          role="status"
          className="bg-durian-500 px-4 py-1.5 text-center text-xs font-semibold text-ink-900"
        >
          You&rsquo;re offline — showing pages saved on this device.{" "}
          <a href="/offline" className="underline">
            See what&rsquo;s saved
          </a>
        </div>
      )}
      {saving && <ListingsSaver />}
    </>
  );
}