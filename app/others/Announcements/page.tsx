"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/Firebase";

interface AnnouncementItem {
  id?: string | number;
  name?: string;
  title?: string;
  image?: string;
  category?: string;
  date?: string | Timestamp;
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

function formatDate(date?: string | Timestamp): string {
  if (!date) {
    return "No date";
  }

  if (date instanceof Timestamp) {
    return date.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadAnnouncements = async (): Promise<void> => {
    try {
      setError(false);

      const announcementsRef = collection(db, "announcements");
      const q = query(announcementsRef, orderBy("date", "desc"));
      const snapshot = await getDocs(q);

      const data: AnnouncementItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setError(true);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const eventCount = announcements.filter((item) =>
    (item.category || "").toLowerCase().includes("event")
  ).length;

  const festivalCount = announcements.filter((item) =>
    (item.category || "").toLowerCase().includes("festival")
  ).length;

  const advisoryCount = announcements.filter((item) =>
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
          <i className="fas fa-bullhorn"></i>
          Community Announcements
        </h1>
      </header>

      <div className="events-container">
        <div className="events-stats">
          <div className="events-stat-card">
            <i className="fas fa-bullhorn"></i>
            <h2>{announcements.length}</h2>
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
              Loading announcements...
            </div>
          ) : error ? (
            <div className="events-empty">
              ⚠️ Unable to load announcements. Please try again later.
            </div>
          ) : announcements.length === 0 ? (
            <div className="events-empty">No announcements available.</div>
          ) : (
            <div className="events-grid">
              {announcements.map((item, index) => {
                const category = item.category || "General";

                return (
                  <div className="events-card" key={item.id ?? index}>
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name || item.title || "Announcement"}
                      />
                    )}

                    <div className="events-card-body">
                      <span
                        className={`events-badge ${getCategoryClass(category)}`}
                      >
                        {category}
                      </span>

                      <div className="events-title">
                        {item.name || item.title || "Untitled Announcement"}
                      </div>

                      <div className="events-meta">
                        <p>
                          <i className="fas fa-calendar"></i>
                          {formatDate(item.date)}
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