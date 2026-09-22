"use client";

import { useEffect, useState } from "react";
import WovenDivider from "./WovenDivider";

type FeedItem = {
  _id?: string;
  title: string;
  description: string;
  date: string;
  category?: string;
};

function useFeed(endpoint: string) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: FeedItem[]) => {
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { items, loading, error };
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
  const {
    items: announcements,
    loading: announcementsLoading,
    error: announcementsError,
  } = useFeed("/api/announcements");

  const {
    items: events,
    loading: eventsLoading,
    error: eventsError,
  } = useFeed("/api/events");

  return (
    <section className="bg-canopy-100 px-6 py-16 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-3xl font-semibold text-canopy-800 sm:text-4xl">
          Community announcements
        </h2>
        <WovenDivider tone="cream" />

        {announcementsLoading && (
          <p className="mt-8 font-mono text-sm text-ink-500">
            Loading announcements...
          </p>
        )}

        {!announcementsLoading && announcementsError && (
          <p className="mt-8 font-mono text-sm text-ink-500">
            Unable to load announcements right now.
          </p>
        )}

        {!announcementsLoading &&
          !announcementsError &&
          announcements.length === 0 && (
            <p className="mt-8 font-mono text-sm text-ink-500">
              No announcements yet.
            </p>
          )}

        {!announcementsLoading &&
          !announcementsError &&
          announcements.length > 0 && (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {announcements.map((item, index) => (
                <FeedCard
                  key={item._id || `announcement-${index}`}
                  item={item}
                />
              ))}
            </div>
          )}

        <h2 className="mt-14 font-display text-3xl font-semibold text-canopy-800 sm:text-4xl">
          Community events
        </h2>
        <WovenDivider tone="cream" />

        {eventsLoading && (
          <p className="mt-8 font-mono text-sm text-ink-500">
            Loading events...
          </p>
        )}

        {!eventsLoading && eventsError && (
          <p className="mt-8 font-mono text-sm text-ink-500">
            Unable to load events right now.
          </p>
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <p className="mt-8 font-mono text-sm text-ink-500">
            No events yet.
          </p>
        )}

        {!eventsLoading && !eventsError && events.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {events.map((item, index) => (
              <FeedCard key={item._id || `event-${index}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}