"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import { useExploreListings } from "@/hooks/useLiveListings";

/* ============================================================
   OfflineSupport  (rendered once, in app/layout.tsx)

   1. Shows a gold bar at the top while the phone has no internet.
   2. Once a day, while online, quietly saves what the pages need so they are
      full — not empty — when there is no signal:
        • the DATA   : every Explore listing, the barangay officials, rules,
                       announcements and events
        • the PICTURES: the photos of all of those (small copies, ~30 MB at most)
      The pages themselves are saved by public/sw.js, which also keeps the
      pictures written in the pages (History, Hotlines, Documents …).

   Skipped on "data saver" and 2G connections.
   ============================================================ */

const SAVED_AT_KEY = "mycalinan_offline_data_at";
const CACHE_PREFIX = "mycalinan_cache:"; // same keys hooks/useCachedJson.ts reads
const SAVE_EVERY_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 4000; // let the page finish loading first
const LISTEN_MS = 12000; // how long the Explore lists are allowed to download
const MAX_PICTURES = 160;
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

/* A real picture address: "/image/x.jpg" or "https://…" */
const isPictureUrl = (v: unknown): v is string =>
  typeof v === "string" && (/^https?:\/\//i.test(v) || (v.startsWith("/") && !v.startsWith("//")));

/* Mounting this for a few seconds makes Firestore download — and keep on the
   device — every Explore collection, and tells us which photos they use.
   Same sections the Barangay Map uses. */
function ListingsSaver({ onPictures }: { onPictures: (urls: string[]) => void }) {
  const lists = [
    useExploreListings("healthcare").listings,
    useExploreListings("education").listings,
    useExploreListings("food").listings,
    useExploreListings("hotspots").listings,
    useExploreListings("community").listings,
    useExploreListings("finance").listings,
    useExploreListings("transport").listings,
    useExploreListings("shopping").listings,
    useExploreListings("lifestyle").listings,
  ];

  useEffect(() => {
    const urls = lists.flatMap((list) =>
      (list as { image?: unknown }[]).map((l) => l?.image).filter(isPictureUrl)
    );
    onPictures(urls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...lists]);

  return null;
}

async function saveApiData(onPictures: (urls: string[]) => void) {
  await Promise.all(
    API_ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        localStorage.setItem(CACHE_PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
        // announcements and events carry a photo each
        if (Array.isArray(data)) {
          onPictures((data as { image?: unknown }[]).map((d) => d?.image).filter(isPictureUrl));
        }
      } catch {
        /* offline or storage full — try again tomorrow */
      }
    })
  );
}

async function saveOfficials(onPictures: (urls: string[]) => void) {
  try {
    const snap = await getDocs(collection(db, "barangayOfficials"));
    onPictures(
      snap.docs.map((d: { data: () => { photo?: unknown } }) => d.data()?.photo).filter(isPictureUrl)
    );
  } catch {
    /* try again tomorrow */
  }
}

/* Ask the service worker to save the pictures (it downloads small copies) */
function savePictures(urls: string[]) {
  const worker = navigator.serviceWorker?.controller;
  if (!worker || urls.length === 0) return;
  worker.postMessage({ type: "WARM_IMAGES", urls: urls.slice(0, MAX_PICTURES) });
}

export default function OfflineSupport() {
  const online = useSyncExternalStore(subscribe, getOnline, getServerOnline);
  const [saving, setSaving] = useState(false);
  // Everything that must be saved, in this order: officials, news, then Explore
  const officials = useRef<Set<string>>(new Set());
  const news = useRef<Set<string>>(new Set());
  const explore = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!online) return;

    const last = Number(localStorage.getItem(SAVED_AT_KEY) ?? 0);
    if (Date.now() - last < SAVE_EVERY_MS || slowConnection()) return;

    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      setSaving(true);
      saveApiData((u) => u.forEach((x) => news.current.add(x)));
      saveOfficials((u) => u.forEach((x) => officials.current.add(x)));
      stopTimer = setTimeout(() => {
        setSaving(false);
        savePictures([...officials.current, ...news.current, ...explore.current]);
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
      {saving && (
        <ListingsSaver onPictures={(urls) => urls.forEach((u) => explore.current.add(u))} />
      )}
    </>
  );
}