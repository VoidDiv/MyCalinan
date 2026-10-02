"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/Firebase";

interface EventItem {
  id?: string | number;
  name?: string;
  title?: string;
  image?: string;
  category?: string;
  date?: string;
  createdAt?: Timestamp;
  location?: string;
  description?: string;
}

function getCategoryClass(category?: string): string {
  const c = (category || "").toLowerCase();

  if (c.includes("event")) return "event";
  if (c.includes("festival")) return "festival";
  if (c.includes("program")) return "program";
  if (c.includes("advisory")) return "advisory";

  return "general";
}

/* Newest first. The "date" the admin types is plain text ("June 28, 2026"), so
   sorting by it A–Z puts September before October. Sort by when it was posted
   instead; if that is missing, fall back to the typed date. Done here (not in
   the Firestore query) so events without a "createdAt" are not hidden. */
function newestFirst(a: EventItem, b: EventItem): number {
  const key = (item: EventItem) => {
    const created = item.createdAt?.toMillis?.();
    if (typeof created === "number") return created;
    const typed = Date.parse(String(item.date ?? ""));
    return Number.isNaN(typed) ? 0 : typed;
  };
  return key(b) - key(a);
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadEvents = async (): Promise<void> => {
    try {
      setError(false);

      const snapshot = await getDocs(collection(db, "events"));

      const data: EventItem[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort(newestFirst);

      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
      setError(true);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const eventCount = events.filter((item) =>
    (item.category || "").toLowerCase().includes("event")
  ).length;

  const festivalCount = events.filter((item) =>
    (item.category || "").toLowerCase().includes("festival")
  ).length;

  const advisoryCount = events.filter((item) =>
    (item.category || "").toLowerCase().includes("advisory")
  ).length;

  return (
    <div className="events-page">
      <header className="events-header">
        <Link href="/" className="events-back-btn">
          <i className="fas fa-arrow-left"></i>
          Back to Home
        </Link>

        <h1>
          <i className="fas fa-calendar-alt"></i>
          Events &amp; Festivals
        </h1>
      </header>

      <div className="events-container">
        <div className="events-stats">
          <div className="events-stat-card">
            <i className="fas fa-calendar-alt"></i>
            <h2>{events.length}</h2>
            <p>Total Listings</p>
          </div>

          <div className="events-stat-card">
            <i className="fas fa-calendar-day"></i>
            <h2>{eventCount}</h2>
            <p>Events</p>
          </div>

          <div className="events-stat-card">
            <i className="fas fa-mask"></i>
            <h2>{festivalCount}</h2>
            <p>Festivals</p>
          </div>

          <div className="events-stat-card">
            <i className="fas fa-exclamation-circle"></i>
            <h2>{advisoryCount}</h2>
            <p>Advisories</p>
          </div>
        </div>

        <div id="eventsContainer">
          {loading ? (
            <div className="events-loading">
              <i className="fas fa-spinner fa-spin"></i>
              Loading events...
            </div>
          ) : error ? (
            <div className="events-empty">
              ⚠️ Unable to load events. Please try again later.
            </div>
          ) : events.length === 0 ? (
            <div className="events-empty">No events available.</div>
          ) : (
            <div className="events-grid">
              {events.map((item, index) => {
                const category = item.category || "General";

                return (
                  <div className="events-card" key={item.id ?? index}>
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name || item.title || "Event"}
                      />
                    )}

                    <div className="events-card-body">
                      <span
                        className={`events-badge ${getCategoryClass(category)}`}
                      >
                        {category}
                      </span>

                      <div className="events-title">
                        {item.name || item.title || "Untitled Event"}
                      </div>

                      <div className="events-meta">
                        <p>
                          <i className="fas fa-calendar"></i>
                          {item.date || "No date"}
                        </p>
                      </div>

                      {item.location && (
                        <div className="events-meta">
                          <p>
                            <i className="fas fa-map-marker-alt"></i>
                            {item.location}
                          </p>
                        </div>
                      )}

                      <div className="events-description">
                        {item.description || ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}