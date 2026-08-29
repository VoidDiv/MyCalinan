"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AnnouncementItem {
  _id?: string;
  title?: string;
  date?: string;
  category?: string;
  image?: string;
  description?: string;
}

const PUBLIC_API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/announcements`;

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(PUBLIC_API);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: AnnouncementItem[] = await response.json();

      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load announcements:", err);

      setError(
        "Unable to load announcements. Please make sure the server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function getCategoryClass(category?: string): string {
    const value = (category || "").toLowerCase();

    if (value.includes("event")) return "event";
    if (value.includes("advisory")) return "advisory";
    if (value.includes("program")) return "program";
    if (value.includes("festival")) return "festival";

    return "general";
  }

  function formatDate(date?: string): string {
    if (!date) {
      return "No date provided";
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

  function handleImageError(
    event: React.SyntheticEvent<HTMLImageElement>
  ): void {
    event.currentTarget.style.display = "none";
  }

  return (
    <div className="announcement-page">
      <header className="announcement-header">
        <Link href="/" className="announcement-back-btn">
          ← Back to Home
        </Link>

        <h1>📢 Community Announcements</h1>
      </header>

      <main className="announcement-container">
        {loading && (
          <div className="announcement-state loading">
            <div className="spinner"></div>
            <p>Loading announcements...</p>
          </div>
        )}

        {!loading && error && (
          <div className="announcement-state error">
            <div className="state-icon">⚠️</div>
            <h2>Unable to Load Announcements</h2>
            <p>{error}</p>
            <button
              type="button"
              className="retry-button"
              onClick={loadAnnouncements}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="announcement-state empty">
            <div className="state-icon">📢</div>
            <h2>No Announcements Yet</h2>
            <p>There are currently no community announcements available.</p>
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="announcement-grid">
            {announcements.map((announcement, index) => (
              <article
                className="announcement-card"
                key={announcement._id || `announcement-${index}`}
              >
                {announcement.image ? (
                  <img
                    src={announcement.image}
                    alt={announcement.title || "Community announcement"}
                    className="announcement-image"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="announcement-image-placeholder">📢</div>
                )}

                <div className="announcement-card-content">
                  <span
                    className={`announcement-category ${getCategoryClass(
                      announcement.category
                    )}`}
                  >
                    {announcement.category || "General"}
                  </span>

                  <h2 className="announcement-title">
                    {announcement.title || "Untitled Announcement"}
                  </h2>

                  <p className="announcement-date">
                    📅 {formatDate(announcement.date)}
                  </p>

                  <p className="announcement-description">
                    {announcement.description || "No description available."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}