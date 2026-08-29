"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EventItem {
  id?: string | number;
  name?: string;
  title?: string;
  image?: string;
  category?: string;
  date?: string;
  location?: string;
  description?: string;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/events`;

function getCategoryClass(category?: string): string {
  const c = (category || "").toLowerCase();

  if (c.includes("event")) return "event";
  if (c.includes("festival")) return "festival";
  if (c.includes("program")) return "program";
  if (c.includes("advisory")) return "advisory";

  return "general";
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadEvents = async (): Promise<void> => {
    try {
      setError(false);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: EventItem[] = await response.json();

      setEvents(Array.isArray(data) ? data : []);
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

    const interval = window.setInterval(() => {
      loadEvents();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
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
              ⚠️ Unable to load events.
              <br />
              Make sure Flask is running on port 5000.
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