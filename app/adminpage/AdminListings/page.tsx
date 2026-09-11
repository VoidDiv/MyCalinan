/* ============================================================
   FILE: app/adminpage/AdminListings/page.tsx
   PAGE: Business Listings — Admin Review Dashboard (ADMIN ONLY)
   URL:  /adminpage/AdminListings
   WHO:  Admins use this page to Approve / Reject business
         registrations submitted via /business-registration.
         Linked from the "Listings" item in the sidebar menu.
   ============================================================ */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/Firebase";
import type { BusinessRegistration, DocStatus, DocumentEntry } from "@/types/business";

/* Admin dashboard reads/writes a couple of fields that live outside the
   shared BusinessRegistration shape (the overall rejection reason typed
   by the admin, plus who/when reviewed it). Extend locally instead of
   touching the shared type used by the registration form + profile API. */
type AdminBusiness = BusinessRegistration & {
  rejectionReason?: string | null;
  reviewedBy?: string;
};

const DOC_LABELS: Record<string, string> = {
  businessPermit: "Business Permit",
  dti: "DTI / SEC Registration",
  barangayClearance: "Barangay Clearance",
  barangayCertification: "Barangay Certification",
  cedula: "Cedula",
};

function getStoredAdmin() {
  const username =
    localStorage.getItem("mycalinan_username") ||
    sessionStorage.getItem("mycalinan_username") ||
    "Admin";
  const role =
    localStorage.getItem("mycalinan_role") ||
    sessionStorage.getItem("mycalinan_role") ||
    "admin";
  return { username, role };
}

function statusStyle(status: DocStatus): { background: string; color: string } {
  if (status === "approved") return { background: "#d4edda", color: "#155724" };
  if (status === "rejected") return { background: "#fdecea", color: "#c0392b" };
  return { background: "#fff3cd", color: "#856404" };
}

/* ── Reject reason modal ── */
function RejectModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;
  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modalBox}>
        <i className="fas fa-times-circle" style={{ color: "#c0392b", fontSize: "2rem", marginBottom: 10 }} />
        <h3 style={styles.modalTitle}>Reject Application?</h3>
        <p style={styles.modalText}>Optionally, let the applicant know why.</p>
        <textarea
          style={styles.modalTextarea}
          placeholder="Reason for rejection (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
          <button onClick={onCancel} style={styles.modalCancelBtn}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={styles.modalRejectBtn}>Reject</button>
        </div>
      </div>
    </div>
  );
}

/* ── Image lightbox ── */
function ImageModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null;
  return (
    <div style={styles.imageModalOverlay} onClick={onClose}>
      <img src={url} alt="Preview" style={styles.imageModalImg} />
    </div>
  );
}

/* ── Business card ── */
function BusinessCard({
  biz,
  onApprove,
  onReject,
  onPreview,
}: {
  biz: AdminBusiness;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPreview: (url: string) => void;
}) {
  const tag = statusStyle(biz.overallStatus);
  const pictures = biz.documents?.businessPictures?.urls ?? [];
  const docEntries = Object.entries(biz.documents ?? {}).filter(
    ([key]) => key !== "businessPictures"
  ) as [string, DocumentEntry][];

  return (
    <div style={styles.bizCard}>
      <div style={styles.bizCardHead}>
        <div>
          <div style={styles.bizName}>{biz.businessName}</div>
          <div style={styles.bizMeta}>
            Owner: {biz.fullName} &middot; {biz.businessType}
          </div>
          <div style={styles.bizMeta}>Operating since {biz.yearOperation}</div>
        </div>
        <span style={{ ...styles.tag, background: tag.background, color: tag.color }}>
          {biz.overallStatus}
        </span>
      </div>

      {pictures.length > 0 && (
        <div style={styles.thumbRow}>
          {pictures.map((pic, idx) => (
            <img
              key={pic.url ?? idx}
              src={pic.url}
              alt={pic.name}
              style={styles.thumb}
              onClick={() => onPreview(pic.url)}
            />
          ))}
        </div>
      )}

      {docEntries.length > 0 && (
        <div style={styles.docList}>
          {docEntries.map(([key, entry]) => (
            <a
              key={key}
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.docLink}
            >
              <i className="fas fa-file-alt" /> {DOC_LABELS[key] ?? entry.name}
            </a>
          ))}
        </div>
      )}

      {biz.overallStatus === "rejected" && biz.rejectionReason && (
        <div style={styles.rejectionNote}>
          <i className="fas fa-info-circle" /> {biz.rejectionReason}
        </div>
      )}

      {biz.overallStatus === "pending" && (
        <div style={styles.bizActions}>
          <button style={styles.approveBtn} onClick={() => onApprove(biz.id!)}>
            <i className="fas fa-check" /> Approve
          </button>
          <button style={styles.rejectBtn} onClick={() => onReject(biz.id!)}>
            <i className="fas fa-times" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function AdminListingsPage() {
  const [admin, setAdmin] = useState({ username: "Admin", role: "admin" });
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState<DocStatus | "all">("pending");
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setAdmin(getStoredAdmin());
  }, []);

  useEffect(() => {
    const q = query(collection(db, "businesses"), orderBy("submittedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AdminBusiness[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AdminBusiness, "id">),
        }));
        setBusinesses(items);
        setLoading(false);
        setLoadFailed(false);
      },
      (err) => {
        console.error("Firestore listen error:", err);
        setLoading(false);
        setLoadFailed(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const approve = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, "businesses", id), {
        overallStatus: "approved",
        reviewedAt: serverTimestamp(),
        reviewedBy: admin.username,
      });
    } catch (err) {
      console.error("Approve error:", err);
    }
  }, [admin.username]);

  const confirmReject = useCallback(async (reason: string) => {
    if (!rejectTargetId) return;
    try {
      await updateDoc(doc(db, "businesses", rejectTargetId), {
        overallStatus: "rejected",
        reviewedAt: serverTimestamp(),
        reviewedBy: admin.username,
        rejectionReason: reason || "No reason provided.",
      });
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setRejectTargetId(null);
    }
  }, [rejectTargetId, admin.username]);

  const filtered =
    filter === "all" ? businesses : businesses.filter((b) => b.overallStatus === filter);
  const pendingCount = businesses.filter((b) => b.overallStatus === "pending").length;
  const approvedCount = businesses.filter((b) => b.overallStatus === "approved").length;
  const rejectedCount = businesses.filter((b) => b.overallStatus === "rejected").length;

  return (
    <div style={styles.body}>
      {/* ── SIDEBAR (matches AdminDashboard) ── */}
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
            <Link href="/adminpage/AdminDashboard" style={styles.menuLink}>
              <i className="fas fa-gauge-high" style={styles.menuIcon} /> Dashboard
            </Link>
          </li>
          <li>
            <Link href="/" style={styles.menuLink}>
              <i className="fas fa-home" style={styles.menuIcon} /> Home Page
            </Link>
          </li>
          <li>
            <Link href="/adminpage/AdminEvents" style={styles.menuLink}>
              <i className="fas fa-calendar-alt" style={styles.menuIcon} /> Events &amp; Festivals
            </Link>
          </li>
          <li>
            <Link href="/adminpage/AdminAnnouncements" style={styles.menuLink}>
              <i className="fas fa-bullhorn" style={styles.menuIcon} /> Announcements
            </Link>
          </li>
          <li>
            <Link href="/adminpage/AdminListings" style={{ ...styles.menuLink, ...styles.menuLinkActive }}>
              <i className="fas fa-list" style={styles.menuIcon} /> Listings
            </Link>
          </li>
          <li>
            <Link href="/adminpage/AdminReports" style={styles.menuLink}>
              <i className="fas fa-chart-line" style={styles.menuIcon} /> Reports
            </Link>
          </li>
        </ul>
      </aside>

      {/* ── MAIN ── */}
      <main style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.headerH1}>
            <i className="fas fa-list" style={{ color: "#1a5c38", marginRight: 8 }} />
            Business Listings
          </h1>
        </div>
        <p style={styles.subtitle}>
          Review business registration applications submitted by the community.
        </p>

        {/* Stats */}
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <i className="fas fa-hourglass-half" style={styles.statIcon} />
            <h2 style={styles.statH2}>{pendingCount}</h2>
            <p style={styles.statP}>Pending Review</p>
          </div>
          <div style={styles.statCard}>
            <i className="fas fa-check-circle" style={styles.statIcon} />
            <h2 style={styles.statH2}>{approvedCount}</h2>
            <p style={styles.statP}>Approved</p>
          </div>
          <div style={styles.statCard}>
            <i className="fas fa-times-circle" style={styles.statIcon} />
            <h2 style={styles.statH2}>{rejectedCount}</h2>
            <p style={styles.statP}>Rejected</p>
          </div>
          <div style={styles.statCard}>
            <i className="fas fa-store" style={styles.statIcon} />
            <h2 style={styles.statH2}>{businesses.length}</h2>
            <p style={styles.statP}>Total Applications</p>
          </div>
        </div>

        {/* Filter chips */}
        <div style={styles.filterRow}>
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterChip,
                ...(filter === f ? styles.filterChipActive : {}),
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && <div style={styles.panelState}>Loading applications...</div>}
        {loadFailed && (
          <div style={styles.panelState}>⚠️ Cannot connect to Firestore. Check your Firebase config.</div>
        )}
        {!loading && !loadFailed && filtered.length === 0 && (
          <div style={styles.panelState}>No {filter !== "all" ? filter : ""} applications yet.</div>
        )}
        {!loading && !loadFailed && filtered.length > 0 && (
          <div style={styles.bizGrid}>
            {filtered.map((biz) => (
              <BusinessCard
                key={biz.id}
                biz={biz}
                onApprove={approve}
                onReject={(id) => setRejectTargetId(id)}
                onPreview={(url) => setPreviewUrl(url)}
              />
            ))}
          </div>
        )}
      </main>

      <RejectModal
        open={!!rejectTargetId}
        onCancel={() => setRejectTargetId(null)}
        onConfirm={confirmReject}
      />
      <ImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}

/* ── Styles (mirrors AdminDashboard.tsx) ── */
const styles: Record<string, React.CSSProperties> = {
  body: { fontFamily: "'Segoe UI', sans-serif", background: "#f0f4f8", display: "flex", minHeight: "100vh" },
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
  adminName: { fontSize: ".82rem", fontWeight: 600, color: "#fff" },
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
  content: { marginLeft: 240, padding: "32px 36px", flex: 1 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  headerH1: { fontSize: "1.4rem", color: "#1a3d28", fontWeight: 700 },
  subtitle: { fontSize: ".85rem", color: "#778", marginBottom: 28 },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 18,
    marginBottom: 24,
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
  filterRow: { display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" },
  filterChip: {
    padding: "8px 18px",
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#d8e2da",
    background: "#fff",
    color: "#556",
    fontSize: ".82rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  filterChipActive: { background: "#1a5c38", borderColor: "#1a5c38", color: "#fff" },
  panelState: {
    textAlign: "center",
    padding: "50px 10px",
    color: "#888",
    fontSize: ".9rem",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
  },
  bizGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 },
  bizCard: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,.07)" },
  bizCardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  bizName: { fontSize: "1rem", fontWeight: 700, color: "#1a3d28" },
  bizMeta: { fontSize: ".78rem", color: "#889", marginTop: 3 },
  tag: { padding: "4px 12px", borderRadius: 20, fontSize: ".72rem", fontWeight: 700, textTransform: "capitalize", flexShrink: 0 },
  thumbRow: { display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" },
  thumb: { width: 64, height: 64, objectFit: "cover", borderRadius: 8, cursor: "pointer", flexShrink: 0, background: "#e8f0ec" },
  docList: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  docLink: { fontSize: ".8rem", color: "#1a5c38", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 },
  rejectionNote: {
    fontSize: ".8rem",
    color: "#c0392b",
    background: "#fdecea",
    borderRadius: 8,
    padding: "8px 12px",
    marginBottom: 8,
  },
  bizActions: { display: "flex", gap: 10, marginTop: 8 },
  approveBtn: {
    flex: 1,
    background: "#1a5c38",
    color: "#fff",
    border: "none",
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: ".82rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    background: "#fff",
    color: "#c0392b",
    border: "1.5px solid #c0392b",
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: ".82rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
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
  modalText: { fontSize: ".85rem", color: "#666", marginBottom: 14 },
  modalTextarea: {
    width: "100%",
    minHeight: 80,
    border: "1px solid #d8e2da",
    borderRadius: 8,
    padding: 10,
    fontSize: ".85rem",
    resize: "vertical",
    fontFamily: "inherit",
  },
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
  modalRejectBtn: {
    padding: "9px 24px",
    borderRadius: 8,
    fontSize: ".88rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "#c0392b",
    color: "#fff",
  },
  imageModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9000,
    cursor: "zoom-out",
  },
  imageModalImg: { maxWidth: "90vw", maxHeight: "85vh", borderRadius: 10 },
};