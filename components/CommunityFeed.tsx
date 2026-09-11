"use client";

import { useEffect, useState } from "react";
import WovenDivider from "./WovenDivider";

type FeedItem = {
  title: string;
  description: string;
  date: string;
  category?: string;
};

// Shown until the real API responds (or if it's unavailable), so the
// section never renders empty during local dev.
const SAMPLE_ANNOUNCEMENTS: FeedItem[] = [
  {
    title: "Barangay clinic free check-up day",
    description: "Free blood pressure and blood sugar screening for senior citizens.",
    date: "Aug 28, 2026",
    category: "Health",
  },
  {
    title: "Road maintenance along Calinan-Toril Road",
    description: "Expect single-lane traffic from 8 AM to 5 PM this week.",
    date: "Aug 25, 2026",
    category: "Advisory",
  },
];

const SAMPLE_EVENTS: FeedItem[] = [
  {
    title: "Calinan Fruit Festival",
    description: "Durian and banana produce fair at the Poblacion plaza.",
    date: "Sep 5, 2026",
  },
];

function useFeed(endpoint: string, fallback: FeedItem[]) {
  const [items, setItems] = useState<FeedItem[]>(fallback);
  const [isSample, setIsSample] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Relative path — this now hits Next.js's own app/api route
    // (Firestore-backed), not a separate server.
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: FeedItem[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setItems(data);
          setIsSample(false);
        }
      })
      .catch(() => {
        // Network/backend not up yet — keep showing sample data.
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { items, isSample };
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <article className="rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {item.category && (
          <span className="rounded-full bg-canopy-100 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-canopy-800">
            {item.category}
          </span>
        )}
        <span className="font-mono text-xs text-ink-500">{item.date}</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-canopy-900">
        {item.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
        {item.description}
      </p>
    </article>
  );
}

export default function CommunityFeed() {
  const { items: announcements, isSample: announcementsAreSample } = useFeed(
    "/api/announcements",
    SAMPLE_ANNOUNCEMENTS
  );
  const { items: events, isSample: eventsAreSample } = useFeed(
    "/api/events",
    SAMPLE_EVENTS
  );

  return (
    <section className="bg-canopy-100 px-6 py-16 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-3xl font-semibold text-canopy-800 sm:text-4xl">
          Community announcements
        </h2>
        <WovenDivider tone="cream" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {announcements.map((item) => (
            <FeedCard key={item.title} item={item} />
          ))}
        </div>
        {announcementsAreSample && (
          <p className="mt-3 font-mono text-xs text-ink-500">
            Showing sample announcements — connect the API to go live.
          </p>
        )}

        <h2 className="mt-14 font-display text-3xl font-semibold text-canopy-800 sm:text-4xl">
          Community events
        </h2>
        <WovenDivider tone="cream" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {events.map((item) => (
            <FeedCard key={item.title} item={item} />
          ))}
        </div>
        {eventsAreSample && (
          <p className="mt-3 font-mono text-xs text-ink-500">
            Showing sample events — connect the API to go live.
          </p>
        )}
      </div>
    </section>
  );
}