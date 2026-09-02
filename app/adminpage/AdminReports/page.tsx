"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Gauge,
  CalendarDays,
  Megaphone,
  Store,
  LineChart,
  LogOut,
  Printer,
  AlertTriangle,
  Layers,
  AlertCircle,
  Loader2,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   Config
   ──────────────────────────────────────────────────────────────── */

const ANNOUNCEMENTS_API = "/api/announcements";
const EVENTS_API = "/api/events";
const POLL_INTERVAL_MS = 30000;

const CATEGORIES = [
  "General",
  "Event",
  "Program",
  "Advisory",
  "Festival",
] as const;

type Category = (typeof CATEGORIES)[number];

const BAR_COLORS: Record<Category, string> = {
  General: "#6c7a72",
  Event: "#1a56a0",
  Program: "#1f8b3f",
  Advisory: "#d9a300",
  Festival: "#a8256f",
};

/* Authentication keys.
   The app has used both naming conventions during development.
   Reading both prevents a false "not logged in" warning while the
   admin pages are being standardized. */
const TOKEN_KEY = "mycalinan_token";
const USERNAME_KEY = "mycalinan_username";
const ROLE_KEY = "mycalinan_role";

const LEGACY_TOKEN_KEY = "mycalinan_admin_token";
const LEGACY_USERNAME_KEY = "mycalinan_admin_username";
const LEGACY_ROLE_KEY = "mycalinan_admin_role";

interface Posting {
  category?: string;
  [key: string]: unknown;
}

type CategoryCounts = Record<Category, number>;

const emptyCounts = (): CategoryCounts => ({
  General: 0,
  Event: 0,
  Program: 0,
  Advisory: 0,
  Festival: 0,
});

function classify(category: string | undefined): Category {
  const value = (category || "General").toLowerCase();

  const match = CATEGORIES.find((cat) =>
    value.includes(cat.toLowerCase())
  );

  return match || "General";
}

function tally(items: Posting[]): CategoryCounts {
  const counts = emptyCounts();

  items.forEach((item) => {
    counts[classify(item.category)]++;
  });

  return counts;
}

function sumCounts(counts: CategoryCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

/* ────────────────────────────────────────────────────────────────
   Storage helpers
   ──────────────────────────────────────────────────────────────── */

function readStored(primaryKey: string, legacyKey: string): string {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem(primaryKey) ||
    window.sessionStorage.getItem(primaryKey) ||
    window.localStorage.getItem(legacyKey) ||
    window.sessionStorage.getItem(legacyKey) ||
    ""
  );
}

function getAuthToken(): string {
  return readStored(TOKEN_KEY, LEGACY_TOKEN_KEY);
}

function getStoredAdmin() {
  return {
    username:
      readStored(USERNAME_KEY, LEGACY_USERNAME_KEY) || "Admin",
    role:
      readStored(ROLE_KEY, LEGACY_ROLE_KEY) || "admin",
  };
}

/* ────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────── */

interface SidebarProps {
  adminName: string;
  adminRole: string;
  onLogoutClick: () => void;
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/adminpage/AdminDashboard",
    icon: Gauge,
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
    active: true,
  },
];

function Sidebar({
  adminName,
  adminRole,
  onLogoutClick,
}: SidebarProps) {
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
          <div className="name">{adminName}</div>
          <div className="role">{adminRole}</div>
        </div>
      </div>

      <ul className="menu">
        {menuItems.map(
          ({ label, href, icon: Icon, active }) => (
            <li key={label} className={active ? "active" : ""}>
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
          type="button"
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
   Breakdown panel
   ──────────────────────────────────────────────────────────────── */

function BreakdownPanel({
  title,
  icon: Icon,
  counts,
  total,
  loading,
  error,
}: {
  title: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  counts: CategoryCounts;
  total: number;
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="panel">
      <h2>
        <Icon
          size={16}
          className="panel-heading-icon"
        />
        {title}
      </h2>

      {loading ? (
        <div className="panel-state">
          <Loader2 size={16} className="spin" />
          Loading…
        </div>
      ) : error ? (
        <div className="panel-state">
          ⚠️ Cannot connect to server.
        </div>
      ) : total === 0 ? (
        <div className="panel-state">
          No data yet.
        </div>
      ) : (
        CATEGORIES.map((category) => {
          const count = counts[category];
          const percentage = total
            ? Math.round((count / total) * 100)
            : 0;

          return (
            <div
              className="bar-row"
              key={category}
            >
              <div className="bar-label">
                <span>{category}</span>
                <b>{count}</b>
              </div>

              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${percentage}%`,
                    background: BAR_COLORS[category],
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Logout Modal
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
        if (event.target === event.currentTarget) {
          onStay();
        }
      }}
    >
      <div className="modal-box">
        <LogOut size={32} className="modal-icon" />

        <h3>Log Out?</h3>

        <p>
          You will be returned to the login page.
          Any unsaved changes will be lost.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-stay"
            onClick={onStay}
          >
            Stay
          </button>

          <button
            type="button"
            className="btn-logout"
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

export default function AdminReports() {
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("admin");
  const [authWarning, setAuthWarning] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  const [announcements, setAnnouncements] = useState<
    Posting[]
  >([]);
  const [events, setEvents] = useState<Posting[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /* ─────────────────────────────────────────────
     Read admin identity + authentication state
  ───────────────────────────────────────────── */

  useEffect(() => {
    const admin = getStoredAdmin();
    const token = getAuthToken();

    setAdminName(admin.username);
    setAdminRole(admin.role);
    setAuthWarning(!token);
  }, []);

  /* ─────────────────────────────────────────────
     Load report data
  ───────────────────────────────────────────── */

  const loadReport = useCallback(async () => {
    let failed = false;
    let announcementData: Posting[] = [];
    let eventData: Posting[] = [];

    try {
      const response = await fetch(
        ANNOUNCEMENTS_API,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      announcementData = await response.json();
    } catch (error) {
      console.error(
        "Load announcements error:",
        error
      );
      failed = true;
    }

    try {
      const response = await fetch(
        EVENTS_API,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      eventData = await response.json();
    } catch (error) {
      console.error(
        "Load events error:",
        error
      );
      failed = true;
    }

    setAnnouncements(announcementData);
    setEvents(eventData);
    setLoadError(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReport();

    const interval = setInterval(
      loadReport,
      POLL_INTERVAL_MS
    );

    return () => clearInterval(interval);
  }, [loadReport]);

  /* ─────────────────────────────────────────────
     Calculations
  ───────────────────────────────────────────── */

  const announcementCounts =
    tally(announcements);

  const eventCounts = tally(events);

  const advisoryTotal =
    announcementCounts.Advisory +
    eventCounts.Advisory;

  const allTotal =
    announcements.length + events.length;

  /* ─────────────────────────────────────────────
     Logout
  ───────────────────────────────────────────── */

  const handleLogout = () => {
    const keys = [
      TOKEN_KEY,
      USERNAME_KEY,
      ROLE_KEY,
      LEGACY_TOKEN_KEY,
      LEGACY_USERNAME_KEY,
      LEGACY_ROLE_KEY,
    ];

    keys.forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });

    window.location.href = "/login";
  };

  return (
    <div className="admin-page">

      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        onLogoutClick={() =>
          setLogoutModalOpen(true)
        }
      />

      <main className="content">

        {/* Authentication warning */}
        {authWarning && (
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

        {/* Header */}
        <div className="header">
          <h1>
            <LineChart size={20} />
            Reports
          </h1>

          <button
            type="button"
            className="export-btn"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print / Export
          </button>
        </div>

        <p className="subtitle">
          A category breakdown of everything posted
          across MyCalinan.
        </p>

        {/* Stats */}
        <div className="stats">

          <div className="stat-card">
            <Layers size={24} />
            <h2>{loading ? "—" : allTotal}</h2>
            <p>Total Postings</p>
          </div>

          <div className="stat-card">
            <Megaphone size={24} />
            <h2>
              {loading ? "—" : announcements.length}
            </h2>
            <p>Announcements</p>
          </div>

          <div className="stat-card">
            <CalendarDays size={24} />
            <h2>
              {loading ? "—" : events.length}
            </h2>
            <p>Events &amp; Festivals</p>
          </div>

          <div className="stat-card">
            <AlertCircle size={24} />
            <h2>
              {loading ? "—" : advisoryTotal}
            </h2>
            <p>Advisories</p>
          </div>

        </div>

        {/* Category breakdown */}
        <div className="panels">

          <BreakdownPanel
            title="Announcements by Category"
            icon={Megaphone}
            counts={announcementCounts}
            total={announcements.length}
            loading={loading}
            error={loadError}
          />

          <BreakdownPanel
            title="Events & Festivals by Category"
            icon={CalendarDays}
            counts={eventCounts}
            total={events.length}
            loading={loading}
            error={loadError}
          />

        </div>

        {/* Summary table */}
        <section className="table-section">

          <h2>
            Category Summary — All Postings
          </h2>

          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Announcements</th>
                <th className="num">
                  Events &amp; Festivals
                </th>
                <th className="num">Total</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="table-state">
                  <td colSpan={4}>
                    <Loader2
                      size={16}
                      className="spin"
                    />
                    Loading report…
                  </td>
                </tr>
              ) : loadError ? (
                <tr className="table-state">
                  <td colSpan={4}>
                    ⚠️ Cannot connect to server.
                    Check the browser console
                    for details.
                  </td>
                </tr>
              ) : (
                <>
                  {CATEGORIES.map((category) => (
                    <tr key={category}>
                      <td>{category}</td>

                      <td className="num">
                        {announcementCounts[category]}
                      </td>

                      <td className="num">
                        {eventCounts[category]}
                      </td>

                      <td className="num">
                        {announcementCounts[category] +
                          eventCounts[category]}
                      </td>
                    </tr>
                  ))}

                  <tr className="total-row">
                    <td>
                      <b>Total</b>
                    </td>

                    <td className="num">
                      <b>
                        {sumCounts(
                          announcementCounts
                        )}
                      </b>
                    </td>

                    <td className="num">
                      <b>
                        {sumCounts(eventCounts)}
                      </b>
                    </td>

                    <td className="num">
                      <b>
                        {sumCounts(
                          announcementCounts
                        ) +
                          sumCounts(eventCounts)}
                      </b>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

        </section>
      </main>

      <LogoutModal
        open={logoutModalOpen}
        onStay={() =>
          setLogoutModalOpen(false)
        }
        onConfirm={handleLogout}
      />

    </div>
  );
}
