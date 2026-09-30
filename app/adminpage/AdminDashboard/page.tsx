"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import useAdminGuard from "@/hooks/useAdminGuard";
import AdminSidebar from "@/components/AdminSidebar";

/* ── Types ── */
interface Posting {
  _id: string;
  title?: string;
  date?: string;
  category?: string;
  image?: string;
  description?: string;
  createdAt?: { toMillis?: () => number } | null;
}

interface PendingBusiness {
  id: string;
  businessName?: string;
  fullName?: string;
  businessType?: string;
  exploreCategory?: string;
  overallStatus?: string;
  submittedAt?: { toMillis?: () => number } | null;
  documents?: { businessPictures?: { urls?: { url: string }[] } };
}

const millis = (v?: { toMillis?: () => number } | null) => v?.toMillis?.() ?? 0;

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
  if (failed) return <div style={styles.panelState}>⚠️ Unable to load from Firestore.</div>;
  if (!items || items.length === 0) return <div style={styles.panelState}>{emptyLabel}</div>;

  const recent = items.slice(0, 5);

  return (
    <>
      {recent.map((item, idx) => {
        const tag = tagStyle(item.category);
        return (
          <div
            key={item._id}
            style={{
              ...styles.itemRow,
              borderBottom: idx === recent.length - 1 ? "none" : "1px solid #f0f4f0",
            }}
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
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

/* ── Pending business submissions (real-time) ── */
function PendingPanel({ items }: { items: PendingBusiness[] }) {
  if (items.length === 0) {
    return <div style={styles.panelState}>No pending business submissions.</div>;
  }

  return (
    <>
      {items.map((biz, idx) => {
        const pic = biz.documents?.businessPictures?.urls?.[0]?.url;
        return (
          <div
            key={biz.id}
            style={{
              ...styles.itemRow,
              alignItems: "center",
              borderBottom: idx === items.length - 1 ? "none" : "1px solid #f0f4f0",
            }}
          >
            {pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pic} alt="" style={styles.itemThumb} />
            ) : (
              <div style={styles.itemThumb} />
            )}
            <div style={styles.itemBody}>
              <div style={styles.itemTitle}>{biz.businessName || "—"}</div>
              <div style={styles.itemMeta}>
                {biz.fullName || "—"} • {biz.exploreCategory || biz.businessType || "—"}
              </div>
            </div>
            <Link href="/adminpage/AdminListings" style={styles.reviewBtn}>
              Review
            </Link>
          </div>
        );
      })}
    </>
  );
}

/* ── Main component ── */
export default function AdminDashboard() {
  const { ready } = useAdminGuard();

  const [announcements, setAnnouncements] = useState<Posting[]>([]);
  const [events, setEvents] = useState<Posting[]>([]);
  const [announcementsFailed, setAnnouncementsFailed] = useState(false);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [businessesFailed, setBusinessesFailed] = useState(false);

  /* Announcements + Events (Firestore, real-time) */
  useEffect(() => {
    if (!ready) return;

    const toPostings = (snap: import("firebase/firestore").QuerySnapshot): Posting[] =>
      snap.docs
        .map((d) => ({ _id: d.id, ...(d.data() as Omit<Posting, "_id">) }))
        .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));

    const unsubAnn = onSnapshot(
      collection(db, "announcements"),
      (snap) => {
        setAnnouncements(toPostings(snap));
        setAnnouncementsFailed(false);
      },
      (err) => {
        console.error("Announcements listener error:", err);
        setAnnouncementsFailed(true);
      }
    );

    const unsubEvt = onSnapshot(
      collection(db, "events"),
      (snap) => {
        setEvents(toPostings(snap));
        setEventsFailed(false);
      },
      (err) => {
        console.error("Events listener error:", err);
        setEventsFailed(true);
      }
    );

    return () => {
      unsubAnn();
      unsubEvt();
    };
  }, [ready]);

  /* Pending business applications (real-time) */
  useEffect(() => {
    if (!ready) return;

    const q = query(collection(db, "businesses"), where("overallStatus", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: PendingBusiness[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PendingBusiness, "id">) }))
          .sort((a, b) => millis(b.submittedAt) - millis(a.submittedAt));
        setPendingBusinesses(items);
        setBusinessesFailed(false);
      },
      (err) => {
        console.error("Pending businesses listener error:", err);
        setBusinessesFailed(true);
      }
    );
    return () => unsub();
  }, [ready]);

  if (!ready) return null;

  const bothFailed = announcementsFailed && eventsFailed;
  const totalPostings = bothFailed ? "—" : announcements.length + events.length;
  const annTotal = announcementsFailed ? "—" : announcements.length;
  const evtTotal = eventsFailed ? "—" : events.length;
  const advTotal = bothFailed
    ? "—"
    : (announcementsFailed ? 0 : countByCategory(announcements, "advisory")) +
      (eventsFailed ? 0 : countByCategory(events, "advisory"));
  const pendingTotal = businessesFailed ? "—" : pendingBusinesses.length;

  return (
    <div style={styles.body}>
      <style>{`
        @media (max-width: 768px) {
          .admin-content { margin-left: 200px !important; padding: 18px !important; }
          .admin-panels { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .admin-content { margin-left: 0 !important; }
        }
      `}</style>

      <AdminSidebar />

      <main className="admin-content" style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.headerH1}>
            <i className="fas fa-gauge-high" style={{ color: "#1a5c38", marginRight: 8 }} />
            Dashboard
          </h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/adminpage/AdminEvents" style={{ ...styles.addBtn, ...styles.addBtnOutline }}>
              <i className="fas fa-plus" /> Add Event
            </Link>
            <Link href="/adminpage/AdminAnnouncements" style={styles.addBtn}>
              <i className="fas fa-plus" /> Add Announcement
            </Link>
          </div>
        </div>
        <p style={styles.subtitle}>
          Welcome back, Admin. Here&apos;s what&apos;s happening across MyCalinan right now.
        </p>

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
          <div style={styles.statCard}>
            <i className="fas fa-store" style={styles.statIcon} />
            <h2 style={styles.statH2}>{pendingTotal}</h2>
            <p style={styles.statP}>Pending Businesses</p>
          </div>
        </div>

        <section style={{ ...styles.panel, marginBottom: 24 }}>
          <div style={styles.panelHead}>
            <h2 style={styles.panelH2}>
              <i className="fas fa-store" style={{ color: "#1a5c38", marginRight: 6 }} />
              Pending Business Applications
            </h2>
            <span style={styles.panelHeadLink}>
              {businessesFailed ? "⚠️ Connection error" : "Live"}
            </span>
          </div>
          {businessesFailed ? (
            <div style={styles.panelState}>⚠️ Unable to load applications from Firestore.</div>
          ) : (
            <PendingPanel items={pendingBusinesses} />
          )}
        </section>

        <div className="admin-panels" style={styles.panels}>
          <section style={styles.panel}>
            <div style={styles.panelHead}>
              <h2 style={styles.panelH2}>
                <i className="fas fa-bullhorn" style={{ color: "#1a5c38", marginRight: 6 }} />
                Recent Announcements
              </h2>
              <Link href="/adminpage/AdminAnnouncements" style={styles.panelHeadLink}>
                Manage all &rarr;
              </Link>
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
              <Link href="/adminpage/AdminEvents" style={styles.panelHeadLink}>
                Manage all &rarr;
              </Link>
            </div>
            <RecentList items={events} failed={eventsFailed} emptyLabel="No events yet." />
          </section>
        </div>
      </main>
    </div>
  );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f0f4f8",
    display: "flex",
    minHeight: "100vh",
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
  itemThumb: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: 8,
    flexShrink: 0,
    background: "#e8f0ec",
  },
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
  tag: {
    display: "inline-block",
    padding: "3px 11px",
    borderRadius: 20,
    fontSize: ".72rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  panelState: { textAlign: "center", padding: "30px 10px", color: "#888", fontSize: ".86rem" },
  reviewBtn: {
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: ".8rem",
    fontWeight: 600,
    background: "#1a5c38",
    color: "#fff",
    textDecoration: "none",
    flexShrink: 0,
  },
};