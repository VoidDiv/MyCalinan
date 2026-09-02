"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Gauge,
  Home,
  Layers,
  LineChart,
  LogOut,
  Megaphone,
  Plus,
  Store,
} from "lucide-react";

interface Posting {
  _id?: string;
  title?: string;
  date?: string;
  category?: string;
  image?: string;
  description?: string;
}

const ANNOUNCEMENTS_API = "/api/announcements";
const EVENTS_API = "/api/events";
const POLL_INTERVAL_MS = 30000;

/* ────────────────────────────────────────────────────────────────
   Authentication keys
   Supports both current and legacy naming conventions.
   ──────────────────────────────────────────────────────────────── */

const TOKEN_KEY = "mycalinan_token";
const USERNAME_KEY = "mycalinan_username";
const ROLE_KEY = "mycalinan_role";

const LEGACY_TOKEN_KEY = "mycalinan_admin_token";
const LEGACY_USERNAME_KEY = "mycalinan_admin_username";
const LEGACY_ROLE_KEY = "mycalinan_admin_role";

/* ────────────────────────────────────────────────────────────────
   Authentication helpers
   ──────────────────────────────────────────────────────────────── */

function getStoredValue(
  primaryKey: string,
  legacyKey: string
): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem(primaryKey) ||
    sessionStorage.getItem(primaryKey) ||
    localStorage.getItem(legacyKey) ||
    sessionStorage.getItem(legacyKey) ||
    ""
  );
}

function getToken(): string {
  return getStoredValue(
    TOKEN_KEY,
    LEGACY_TOKEN_KEY
  );
}

function getStoredAdmin() {
  return {
    username:
      getStoredValue(
        USERNAME_KEY,
        LEGACY_USERNAME_KEY
      ) || "Admin",

    role:
      getStoredValue(
        ROLE_KEY,
        LEGACY_ROLE_KEY
      ) || "admin",
  };
}

function getTagClass(category?: string): string {
  const c = (category || "").toLowerCase();

  if (c.includes("event")) {
    return "tag event";
  }

  if (c.includes("advisory")) {
    return "tag advisory";
  }

  if (c.includes("program")) {
    return "tag program";
  }

  if (c.includes("festival")) {
    return "tag festival";
  }

  return "tag";
}

function countByCategory(
  items: Posting[],
  keyword: string
): number {
  return items.filter((item) =>
    (item.category || "")
      .toLowerCase()
      .includes(keyword)
  ).length;
}

/* ────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────── */

function Sidebar({
  adminName,
  adminRole,
  onLogoutClick,
}: {
  adminName: string;
  adminRole: string;
  onLogoutClick: () => void;
}) {
  const menuItems = [
    {
      label: "Dashboard",
      href: "/adminpage/AdminDashboard",
      icon: Gauge,
      active: true,
    },
    {
      label: "Events & Festivals",
      href: "/adminpage/AdminEvents",
      icon: CalendarDays,
    },
    {
      label: "Announcements",
      href: "/adminpage/AdminAnnouncements",
      icon: Megaphone,
    },
    {
      label: "Business Listings",
      href: "/adminpage/AdminListings",
      icon: Store,
    },
    {
      label: "Reports",
      href: "/adminpage/AdminReports",
      icon: LineChart,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>MyCalinan</h2>
        <p>Admin Panel</p>
      </div>

      <div className="admin-badge">
        <div className="admin-avatar">
          {adminName.charAt(0).toUpperCase() || "A"}
        </div>

        <div className="admin-info">
          <div className="name">
            {adminName}
          </div>

          <div className="role">
            {adminRole}
          </div>
        </div>
      </div>

      <ul className="menu">
        {menuItems.map(
          ({
            label,
            href,
            icon: Icon,
            active,
          }) => (
            <li
              key={label}
              className={
                active ? "active" : ""
              }
            >
              <a href={href}>
                <Icon size={16} />
                {label}
              </a>
            </li>
          )
        )}
      </ul>

      <div className="sidebar-footer">
        <button
          className="logout-btn"
          onClick={onLogoutClick}
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────
   Recent list
   ──────────────────────────────────────────────────────────────── */

function RecentList({
  items,
  failed,
  emptyLabel,
}: {
  items: Posting[];
  failed: boolean;
  emptyLabel: string;
}) {
  if (failed) {
    return (
      <div className="panel-state">
        ⚠️ Cannot connect to server.
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="panel-state">
        {emptyLabel}
      </div>
    );
  }

  const recent = items
    .slice(-5)
    .reverse();

  return (
    <div className="recent-list">
      {recent.map((item, index) => (
        <div
          key={item._id || index}
          className={`recent-item ${
            index === recent.length - 1
              ? "last"
              : ""
          }`}
        >
          {item.image ? (
            <img
              className="recent-thumb"
              src={item.image}
              alt=""
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div className="recent-thumb" />
          )}

          <div className="recent-body">
            <div className="recent-title">
              {item.title || "—"}
            </div>

            <div className="recent-meta">
              {item.date || "No date set"}
            </div>
          </div>

          <span
            className={getTagClass(
              item.category
            )}
          >
            {item.category || "General"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Logout modal
   ──────────────────────────────────────────────────────────────── */

function LogoutModal({
  open,
  onStay,
  onConfirm,
}: {
  open: boolean;
  onStay: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onStay();
        }
      }}
    >
      <div className="modal-box">
        <LogOut
          size={32}
          className="modal-icon"
        />

        <h3>Log Out?</h3>

        <p>
          You will be returned to the
          login page. Any unsaved changes
          will be lost.
        </p>

        <div className="modal-btns">
          <button
            className="modal-cancel"
            onClick={onStay}
          >
            Stay
          </button>

          <button
            className="modal-confirm"
            onClick={onConfirm}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [admin, setAdmin] = useState({
    username: "Admin",
    role: "admin",
  });

  const [authed, setAuthed] =
    useState(false);

  const [
    announcements,
    setAnnouncements,
  ] = useState<Posting[]>([]);

  const [events, setEvents] =
    useState<Posting[]>([]);

  const [
    announcementsFailed,
    setAnnouncementsFailed,
  ] = useState(false);

  const [
    eventsFailed,
    setEventsFailed,
  ] = useState(false);

  const [logoutOpen, setLogoutOpen] =
    useState(false);

  /* ─────────────────────────────────────────────
     Read authentication state on mount
  ───────────────────────────────────────────── */

  useEffect(() => {
    const storedAdmin =
      getStoredAdmin();

    const token = getToken();

    setAdmin(storedAdmin);
    setAuthed(!!token);
  }, []);

  /* ─────────────────────────────────────────────
     Load dashboard data
  ───────────────────────────────────────────── */

  const loadDashboard =
    useCallback(async () => {
      try {
        const response = await fetch(
          ANNOUNCEMENTS_API
        );

        if (!response.ok) {
          throw new Error(
            String(response.status)
          );
        }

        const data: Posting[] =
          await response.json();

        setAnnouncements(data);
        setAnnouncementsFailed(false);
      } catch (error) {
        console.error(
          "Load announcements error:",
          error
        );

        setAnnouncementsFailed(true);
      }

      try {
        const response = await fetch(
          EVENTS_API
        );

        if (!response.ok) {
          throw new Error(
            String(response.status)
          );
        }

        const data: Posting[] =
          await response.json();

        setEvents(data);
        setEventsFailed(false);
      } catch (error) {
        console.error(
          "Load events error:",
          error
        );

        setEventsFailed(true);
      }
    }, []);

  /* ─────────────────────────────────────────────
     Initial load + auto refresh
  ───────────────────────────────────────────── */

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      POLL_INTERVAL_MS
    );

    return () =>
      clearInterval(interval);
  }, [loadDashboard]);

  /* ─────────────────────────────────────────────
     Logout
  ───────────────────────────────────────────── */

  function doLogout() {
    [
      TOKEN_KEY,
      USERNAME_KEY,
      ROLE_KEY,
      LEGACY_TOKEN_KEY,
      LEGACY_USERNAME_KEY,
      LEGACY_ROLE_KEY,
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.href = "/login";
  }

  /* ─────────────────────────────────────────────
     Statistics
  ───────────────────────────────────────────── */

  const bothFailed =
    announcementsFailed &&
    eventsFailed;

  const totalPostings = bothFailed
    ? "—"
    : announcements.length +
      events.length;

  const annTotal =
    announcementsFailed
      ? "—"
      : announcements.length;

  const evtTotal =
    eventsFailed
      ? "—"
      : events.length;

  const advTotal =
    bothFailed
      ? "—"
      : (announcementsFailed
          ? 0
          : countByCategory(
              announcements,
              "advisory"
            )) +
        (eventsFailed
          ? 0
          : countByCategory(
              events,
              "advisory"
            ));

  return (
    <div className="admin-page">

      {/* ── SIDEBAR ── */}

      <Sidebar
        adminName={admin.username}
        adminRole={admin.role}
        onLogoutClick={() =>
          setLogoutOpen(true)
        }
      />

      {/* ── MAIN ── */}

      <main className="content">

        {!authed && (
          <div className="auth-warning">
            <AlertTriangle size={16} />

            <span>
              You are not logged in.{" "}
              <a href="/login">
                Click here to log in
              </a>
              .
            </span>
          </div>
        )}

        <div className="header">

          <h1>
            <Gauge size={20} />
            Dashboard
          </h1>

          <a
            href="/adminpage/AdminEvents"
            className="add-btn"
          >
            <Plus size={16} />
            Add Event
          </a>

        </div>

        <p className="subtitle">
          Welcome back,{" "}
          {admin.username}.
          Here&apos;s what&apos;s
          happening across MyCalinan
          right now.
        </p>

        {/* ── STATS ── */}

        <div className="stats">

          <div className="stat-card">
            <Layers size={24} />

            <h2>
              {totalPostings}
            </h2>

            <p>
              Total Postings
            </p>
          </div>

          <div className="stat-card">
            <Megaphone size={24} />

            <h2>
              {annTotal}
            </h2>

            <p>
              Announcements
            </p>
          </div>

          <div className="stat-card">
            <CalendarDays size={24} />

            <h2>
              {evtTotal}
            </h2>

            <p>
              Events &amp; Festivals
            </p>
          </div>

          <div className="stat-card">
            <AlertCircle size={24} />

            <h2>
              {advTotal}
            </h2>

            <p>
              Advisories
            </p>
          </div>

        </div>

        {/* ── RECENT PANELS ── */}

        <div className="panels">

          <section className="panel">

            <h2>
              <Megaphone
                size={16}
                className="panel-heading-icon"
              />

              Recent Announcements

              <a
                href="/adminpage/AdminAnnouncements"
                className="panel-head-link"
              >
                Manage all →
              </a>
            </h2>

            <RecentList
              items={announcements}
              failed={announcementsFailed}
              emptyLabel="No announcements yet."
            />

          </section>

          <section className="panel">

            <h2>
              <CalendarDays
                size={16}
                className="panel-heading-icon"
              />

              Recent Events &amp; Festivals

              <a
                href="/adminpage/AdminEvents"
                className="panel-head-link"
              >
                Manage all →
              </a>
            </h2>

            <RecentList
              items={events}
              failed={eventsFailed}
              emptyLabel="No events yet."
            />

          </section>

        </div>

      </main>

      {/* ── LOGOUT MODAL ── */}

      <LogoutModal
        open={logoutOpen}
        onStay={() =>
          setLogoutOpen(false)
        }
        onConfirm={doLogout}
      />

    </div>
  );
}