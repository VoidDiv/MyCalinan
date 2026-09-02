"use client";
import { useEffect, useState, useCallback } from "react";

/* ── Types ── */
interface Posting {
  _id?: string;
  title?: string;
  date?: string;
  category?: string;
  image?: string;
  description?: string;
}

/* ── Same public read endpoints used by the Announcements and Events admin pages. ── */
const ANNOUNCEMENTS_API = "http://localhost:5000/api/announcements";
const EVENTS_API = "http://localhost:5000/api/events";

function getToken(): string {
  return (
    localStorage.getItem("mycalinan_admin_token") ||
    sessionStorage.getItem("mycalinan_admin_token") ||
    ""
  );
}

function getStoredAdmin() {
  const username =
    localStorage.getItem("mycalinan_admin_username") ||
    sessionStorage.getItem("mycalinan_admin_username") ||
    "Admin";
  const role =
    localStorage.getItem("mycalinan_admin_role") ||
    sessionStorage.getItem("mycalinan_admin_role") ||
    "admin";
  return { username, role };
}

function tagStyle(category?: string): { background: string; color: string } {
  const c = (category || "").toLowerCase();
  if (c.includes("event")) return { background: "#e3f0ff", color: "#1a56a0" };
  if (c.includes("advisory")) return { background: "#fff3cd", color: "#856404" };
  if (c.includes("program")) return { background: "#d4edda", color: "#155724" };
  if (c.includes("festival")) return { background: "#fde8f5", color: "#8b1a6b" };
  return { background: "#e8f5ee", color: "#1a5c38" };
}

function countByCategory(items: Posting[], keyword: string): number {
  return items.filter((i) => (i.category || "").toLowerCase().includes(keyword)).length;
}

/* ── Recent list panel ── */
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
    return <div style={styles.panelState}>⚠️ Cannot connect to server.</div>;
  }
  if (!items || items.length === 0) {
    return <div style={styles.panelState}>{emptyLabel}</div>;
  }

  const recent = items.slice(-5).reverse();

  return (
    <>
      {recent.map((item, idx) => {
        const tag = tagStyle(item.category);
        return (
          <div
            key={item._id || idx}
            style={{
              ...styles.itemRow,
              borderBottom: idx === recent.length - 1 ? "none" : "1px solid #f0f4f0",
            }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt=""
                style={styles.itemThumb}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div style={styles.itemThumb} />
            )}
            <div style={styles.itemBody}>
              <div style={styles.itemTitle}>{item.title || "—"}</div>
              <div style={styles.itemMeta}>{item.date || "No date set"}</div>
            </div>
            <span style={{ ...styles.tag, background: tag.background, color: tag.color }}>
              {item.category || "General"}
            </span>
          </div>
        );
      })}
    </>
  );
}

/* ── Logout confirm modal ── */
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
      style={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
    >
      <div style={styles.modalBox}>
        <i className="fas fa-sign-out-alt" style={{ color: "#1a5c38", fontSize: "2rem", marginBottom: 10, display: "block" }} />
        <h3 style={styles.modalTitle}>Log Out?</h3>
        <p style={styles.modalText}>
          You will be returned to the login page. Any unsaved changes will be lost.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onStay} style={styles.modalCancelBtn}>
            Stay
          </button>
          <button onClick={onConfirm} style={styles.modalConfirmBtn}>
            Log Out
            
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function AdminDashboard() {
  const [admin, setAdmin] = useState({ username: "Admin", role: "admin" });
  const [authed, setAuthed] = useState(true);
  const [announcements, setAnnouncements] = useState<Posting[]>([]);
  const [events, setEvents] = useState<Posting[]>([]);
  const [announcementsFailed, setAnnouncementsFailed] = useState(false);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setAdmin(getStoredAdmin());
    setAuthed(!!getToken());
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(ANNOUNCEMENTS_API);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setAnnouncements(data);
      setAnnouncementsFailed(false);
    } catch (err) {
      console.error("Load announcements error:", err);
      setAnnouncementsFailed(true);
    }

    try {
      const res = await fetch(EVENTS_API);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setEvents(data);
      setEventsFailed(false);
    } catch (err) {
      console.error("Load events error:", err);
      setEventsFailed(true);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  function doLogout() {
    localStorage.removeItem("mycalinan_admin_token");
    localStorage.removeItem("mycalinan_admin_username");
    localStorage.removeItem("mycalinan_admin_role");
    sessionStorage.removeItem("mycalinan_admin_token");
    sessionStorage.removeItem("mycalinan_admin_username");
    sessionStorage.removeItem("mycalinan_admin_role");
    window.location.href = "/login";
  }

  const bothFailed = announcementsFailed && eventsFailed;
  const totalPostings = bothFailed ? "—" : announcements.length + events.length;
  const annTotal = announcementsFailed ? "—" : announcements.length;
  const evtTotal = eventsFailed ? "—" : events.length;
  const advTotal =
    announcementsFailed && eventsFailed
      ? "—"
      : (announcementsFailed ? 0 : countByCategory(announcements, "advisory")) +
        (eventsFailed ? 0 : countByCategory(events, "advisory"));

  return (
    <div style={styles.body}>
      {/* ── SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.logoBlock}>
          <h2 style={styles.logoH2}>MyCalinan</h2>
          <p style={styles.logoP}>Admin Panel</p>
        </div>

        <div style={styles.adminBadge}>
          <div style={styles.adminAvatar}>{admin.username.charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.adminName}>{admin.username}</div>
            <div style={styles.adminRole}>{admin.role}</div>
          </div>
        </div>

        <ul style={styles.menu}>
          <li>
            <a href="/adminpage/AdminDashboard" style={{ ...styles.menuLink, ...styles.menuLinkActive }}>
              <i className="fas fa-gauge-high" style={styles.menuIcon} /> Dashboard
            </a>
          </li>
          <li>
            <a href="/" style={styles.menuLink}>
              <i className="fas fa-home" style={styles.menuIcon} /> Home Page
            </a>
          </li>
          <li>
            <a href="/adminpage/AdminEvents" style={styles.menuLink}>
              <i className="fas fa-calendar-alt" style={styles.menuIcon} /> Events &amp; Festivals
            </a>
          </li>
          <li>
            <a href="/adminpage/AdminAnnouncements" style={styles.menuLink}>
              <i className="fas fa-bullhorn" style={styles.menuIcon} /> Announcements
            </a>
          </li>
          <li>
            <a href="/adminpage/AdminReports" style={styles.menuLink}>
              <i className="fas fa-chart-line" style={styles.menuIcon} /> Reports
            </a>
          </li>
        </ul>

        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={() => setLogoutOpen(true)}>
            <i className="fas fa-sign-out-alt" /> Log Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={styles.content}>
        {!authed && (
          <div style={styles.authWarning}>
            <i className="fas fa-exclamation-triangle" /> You are not logged in.{" "}
            <a href="/login">Click here to log in</a>.
          </div>
        )}

        <div style={styles.header}>
          <h1 style={styles.headerH1}>
            <i className="fas fa-gauge-high" style={{ color: "#1a5c38", marginRight: 8 }} />
            Dashboard
          </h1>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/adminpage/AdminEvents" style={{ ...styles.addBtn, ...styles.addBtnOutline }}>
              <i className="fas fa-plus" /> Add Event
            </a>
            <a href="/adminpage/AdminAnnouncements" style={styles.addBtn}>
              <i className="fas fa-plus" /> Add Announcement
            </a>
          </div>
        </div>
        <p style={styles.subtitle}>
          Welcome back, {admin.username}. Here&apos;s what&apos;s happening across MyCalinan right now.
        </p>

        {/* Combined stats */}
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <i className="fas fa-layer-group" style={styles.statIcon} />
            <h2 style={styles.statH2}>{totalPostings}</h2>
            <p style={styles.statP}>Total Postings</p>
          </div>
          <div style={styles.statCard}>
            <i className="fas fa-bullhorn" style={styles.statIcon} />
            <h2 style={styles.statH2}>{annTotal}</h2>
            <p style={styles.statP}>Announcements</p>
          </div>
          <div style={styles.statCard}>
            <i className="fas fa-calendar-alt" style={styles.statIcon} />
            <h2 style={styles.statH2}>{evtTotal}</h2>
            <p style={styles.statP}>Events &amp; Festivals</p>
          </div>
          <div style={styles.statCard}>
            <i className="fas fa-exclamation-circle" style={styles.statIcon} />
            <h2 style={styles.statH2}>{advTotal}</h2>
            <p style={styles.statP}>Advisories</p>
          </div>
        </div>

        {/* Recent panels */}
        <div style={styles.panels}>
          <section style={styles.panel}>
            <div style={styles.panelHead}>
              <h2 style={styles.panelH2}>
                <i className="fas fa-bullhorn" style={{ color: "#1a5c38", marginRight: 6 }} />
                Recent Announcements
              </h2>
              <a href="/adminpage/AdminAnnouncements" style={styles.panelHeadLink}>
                Manage all &rarr;
              </a>
            </div>
            <RecentList
              items={announcements}
              failed={announcementsFailed}
              emptyLabel="No announcements yet."
            />
          </section>

          <section style={styles.panel}>
            <div style={styles.panelHead}>
              <h2 style={styles.panelH2}>
                <i className="fas fa-calendar-alt" style={{ color: "#1a5c38", marginRight: 6 }} />
                Recent Events &amp; Festivals
              </h2>
              <a href="/adminpage/AdminEvents" style={styles.panelHeadLink}>
                Manage all &rarr;
              </a>
            </div>
            <RecentList items={events} failed={eventsFailed} emptyLabel="No events yet." />
          </section>
        </div>
      </main>

      <LogoutModal
        open={logoutOpen}
        onStay={() => setLogoutOpen(false)}
        onConfirm={doLogout}
      />
    </div>
  );
}

/* ── Styles (mirrors the original Admin-Dashboard.html CSS) ── */
const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f0f4f8",
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: 240,
    background: "#1a5c38",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 50,
  },
  logoBlock: { padding: "24px 24px 18px", borderBottom: "1px solid rgba(255,255,255,.15)" },
  logoH2: { fontSize: "1.2rem", fontWeight: 700 },
  logoP: { fontSize: ".75rem", opacity: 0.65, marginTop: 2 },
  adminBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 24px",
    borderBottom: "1px solid rgba(255,255,255,.1)",
    background: "rgba(0,0,0,.12)",
  },
  adminAvatar: {
    width: 34,
    height: 34,
    background: "rgba(255,255,255,.25)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: ".9rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  adminName: {
    fontSize: ".82rem",
    fontWeight: 600,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  adminRole: { fontSize: ".7rem", color: "rgba(255,255,255,.6)", textTransform: "capitalize" },
  menu: { listStyle: "none", padding: "16px 0", flex: 1 },
  menuLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 24px",
    color: "rgba(255,255,255,.82)",
    textDecoration: "none",
    fontSize: ".88rem",
  },
  menuLinkActive: { background: "rgba(255,255,255,.15)", color: "#fff" },
  menuIcon: { width: 16, textAlign: "center" },
  sidebarFooter: { padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.1)" },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 16px",
    background: "rgba(231,76,60,.2)",
    border: "1px solid rgba(231,76,60,.35)",
    color: "#ff8f85",
    borderRadius: 8,
    fontSize: ".85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  content: { marginLeft: 240, padding: "32px 36px", flex: 1 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 12,
  },
  headerH1: { fontSize: "1.4rem", color: "#1a3d28", fontWeight: 700 },
  subtitle: { fontSize: ".85rem", color: "#778", marginBottom: 28 },
  addBtn: {
    background: "#1a5c38",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: ".88rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
  },
  addBtnOutline: { background: "#fff", color: "#1a5c38", border: "1.5px solid #1a5c38" },
  authWarning: {
    background: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: 10,
    padding: "14px 20px",
    marginBottom: 22,
    fontSize: ".88rem",
    color: "#856404",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 18,
    marginBottom: 28,
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 18px",
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
  },
  statIcon: { fontSize: "1.5rem", color: "#1a5c38", marginBottom: 6, display: "block" },
  statH2: { fontSize: "1.7rem", fontWeight: 700, color: "#1a3d28" },
  statP: { fontSize: ".78rem", color: "#777", marginTop: 2 },
  panels: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  panel: {
    background: "#fff",
    borderRadius: 12,
    padding: "24px 26px",
    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
  },
  panelHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "2px solid #e8f5ee",
  },
  panelH2: { fontSize: "1rem", fontWeight: 700, color: "#1a3d28" },
  panelHeadLink: { fontSize: ".8rem", color: "#1a5c38", fontWeight: 600, textDecoration: "none" },
  itemRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0" },
  itemThumb: { width: 40, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: "#e8f0ec" },
  itemBody: { minWidth: 0, flex: 1 },
  itemTitle: {
    fontSize: ".86rem",
    fontWeight: 600,
    color: "#1a3d28",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemMeta: { fontSize: ".75rem", color: "#888", marginTop: 2 },
  tag: { display: "inline-block", padding: "3px 11px", borderRadius: 20, fontSize: ".72rem", fontWeight: 700, flexShrink: 0 },
  panelState: { textAlign: "center", padding: "30px 10px", color: "#888", fontSize: ".86rem" },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8000,
  },
  modalBox: {
    background: "#fff",
    borderRadius: 14,
    padding: "30px 32px",
    maxWidth: 380,
    width: "90%",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,.18)",
  },
  modalTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#1a3d28", marginBottom: 8 },
  modalText: { fontSize: ".88rem", color: "#666", marginBottom: 22 },
  modalCancelBtn: {
    padding: "9px 24px",
    borderRadius: 8,
    fontSize: ".88rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "#e8f0ec",
    color: "#333",
  },
  modalConfirmBtn: {
    padding: "9px 24px",
    borderRadius: 8,
    fontSize: ".88rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "#1a5c38",
    color: "#fff",
  },
};



