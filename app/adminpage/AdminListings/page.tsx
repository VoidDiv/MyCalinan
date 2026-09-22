/* ============================================================
   FILE: app/adminpage/AdminListings/page.tsx   (REPLACE whole file)
   PAGE: Listings — Admin dashboard (ADMIN ONLY)
   URL:  /adminpage/AdminListings
   TABS: Applications     -> review business applications, approve & publish
         Explore Listings -> manage EVERYTHING shown on the Explore pages
   ============================================================ */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  serverTimestamp,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/Firebase";
import type { BusinessRegistration, DocStatus, DocumentEntry } from "@/types/business";
import {
  EXPLORE_PAGES,
  PAGE_COLLECTION,
  toExploreDoc,
  type ListingData,
} from "@/types/listing";
import ListingModal from "./ListingModal";
import ExplorePanel from "./ExplorePanel";
import { styles } from "./styles";

type AdminBusiness = BusinessRegistration & {
  rejectionReason?: string | null;
  reviewedBy?: string;
  address?: string; // optional: collected by the registration form
  description?: string;
  listing?: ListingData; // what was published to Explore
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

/* What the owner picked when registering, e.g. "Food & Dining › Bakeshop".
   Older applications only have the free-form businessType. */
function requestedTypeLabel(biz: AdminBusiness): string {
  if (biz.explorePage && EXPLORE_PAGES[biz.explorePage]) {
    return `${EXPLORE_PAGES[biz.explorePage].label} › ${biz.exploreCategory ?? biz.businessType}`;
  }
  return biz.businessType;
}

function picsOf(biz: AdminBusiness): string[] {
  return (biz.documents?.businessPictures?.urls ?? []).map((p) => p.url);
}

/* Starting values for the Approve & Publish / Edit form */
function publishInitial(biz: AdminBusiness): Partial<ListingData> {
  if (biz.listing) return biz.listing;

  const requestedPage =
    biz.explorePage && EXPLORE_PAGES[biz.explorePage] ? biz.explorePage : undefined;
  const requestedCategory =
    requestedPage && EXPLORE_PAGES[requestedPage].categories.includes(biz.exploreCategory ?? "")
      ? (biz.exploreCategory as string)
      : "";

  return {
    name: biz.businessName,
    page: requestedPage ?? "food",
    category: requestedCategory,
    description: biz.description ?? "",
    address: biz.address ?? "",
    image: picsOf(biz)[0] ?? "",
    published: true,
  };
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

/* ── Delete confirmation modal (applications) ── */
function DeleteModal({
  biz,
  onCancel,
  onConfirm,
}: {
  biz: AdminBusiness | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  if (!biz) return null;
  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modalBox}>
        <i className="fas fa-trash" style={{ color: "#c0392b", fontSize: "2rem", marginBottom: 10 }} />
        <h3 style={styles.modalTitle}>Delete “{biz.businessName}”?</h3>
        <p style={styles.modalText}>
          This removes it from Explore, deletes the application and its uploaded files. This can’t be undone.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={styles.modalCancelBtn} onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            style={styles.modalRejectBtn}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Preview" style={styles.imageModalImg} />
    </div>
  );
}

/* ── Business card ── */
function BusinessCard({
  biz,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onPreview,
}: {
  biz: AdminBusiness;
  onApprove: (b: AdminBusiness) => void;
  onReject: (id: string) => void;
  onEdit: (b: AdminBusiness) => void;
  onDelete: (b: AdminBusiness) => void;
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
            Owner: {biz.fullName} &middot; {requestedTypeLabel(biz)}
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
            // eslint-disable-next-line @next/next/no-img-element
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
            <a key={key} href={entry.url} target="_blank" rel="noopener noreferrer" style={styles.docLink}>
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

      {biz.overallStatus === "approved" && biz.listing && (
        <div style={biz.listing.published ? styles.liveBadge : styles.hiddenBadge}>
          {biz.listing.published ? "🟢 Live" : "⚪ Hidden"} on {EXPLORE_PAGES[biz.listing.page]?.label} ›{" "}
          {biz.listing.category}
        </div>
      )}

      {biz.overallStatus === "approved" && !biz.listing && (
        <div style={styles.hiddenBadge}>Approved, but not published to Explore yet.</div>
      )}

      <div style={styles.bizActions}>
        {biz.overallStatus !== "approved" && (
          <button style={styles.approveBtn} onClick={() => onApprove(biz)}>
            <i className="fas fa-check" /> Approve &amp; Publish
          </button>
        )}
        {biz.overallStatus === "pending" && (
          <button style={styles.rejectBtn} onClick={() => onReject(biz.id!)}>
            <i className="fas fa-times" /> Reject
          </button>
        )}
        {biz.overallStatus === "approved" && (
          <button style={styles.approveBtn} onClick={() => onEdit(biz)}>
            <i className="fas fa-pen" /> {biz.listing ? "Edit" : "Publish to Explore"}
          </button>
        )}
        <button style={styles.rejectBtn} onClick={() => onDelete(biz)}>
          <i className="fas fa-trash" /> Delete
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminListingsPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState({ username: "Admin", role: "admin" });
  const [tab, setTab] = useState<"applications" | "explore">("applications");
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState<DocStatus | "all">("pending");
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<AdminBusiness | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBusiness | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* Admin-only guard (same check as the dashboard) */
  useEffect(() => {
    const role =
      localStorage.getItem("mycalinan_role") || sessionStorage.getItem("mycalinan_role");
    if (role !== "admin") {
      router.push("/login");
      return;
    }
    setAdmin(getStoredAdmin());
  }, [router]);

  /* Real-time list of applications */
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

  /* Approve (first publish) or edit. Writes into the existing category collection. */
  const saveListing = useCallback(
    async (biz: AdminBusiness, data: ListingData) => {
      const batch = writeBatch(db);
      const oldPage = biz.listing?.page;
      const moved = !!oldPage && oldPage !== data.page;
      const firstPublish = !biz.listing;

      // Admin moved it to a different Explore page -> remove the old copy
      if (oldPage && moved) {
        batch.delete(doc(db, PAGE_COLLECTION[oldPage], biz.id!));
      }

      // Public copy in food / shopping / healthcare / ...
      // (merge keeps the display order + created date when re-saving)
      batch.set(
        doc(db, PAGE_COLLECTION[data.page], biz.id!),
        {
          ...toExploreDoc(data, biz.id!),
          ...(firstPublish || moved ? { order: Date.now() } : {}),
          ...(firstPublish ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Keep the private application in sync
      batch.update(doc(db, "businesses", biz.id!), {
        overallStatus: "approved",
        businessName: data.name,
        rejectionReason: null,
        listing: data,
        ...(biz.overallStatus !== "approved"
          ? { reviewedAt: serverTimestamp(), reviewedBy: admin.username }
          : {}),
      });

      await batch.commit();
      setPublishTarget(null);
    },
    [admin.username]
  );

  const confirmReject = useCallback(
    async (reason: string) => {
      if (!rejectTargetId) return;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "businesses", rejectTargetId), {
          overallStatus: "rejected",
          reviewedAt: serverTimestamp(),
          reviewedBy: admin.username,
          rejectionReason: reason || "No reason provided.",
        });
        await batch.commit();
      } catch (err) {
        console.error("Reject error:", err);
      } finally {
        setRejectTargetId(null);
      }
    },
    [rejectTargetId, admin.username]
  );

  /* Delete: Explore doc first, then the application, then files (best effort) */
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return;

    const urls: string[] = [];
    Object.entries(deleteTarget.documents ?? {}).forEach(([key, entry]) => {
      if (key === "businessPictures") {
        (entry as unknown as { urls?: { url: string }[] }).urls?.forEach((p) => urls.push(p.url));
      } else if ((entry as DocumentEntry).url) {
        urls.push((entry as DocumentEntry).url);
      }
    });

    try {
      if (deleteTarget.listing) {
        await deleteDoc(doc(db, PAGE_COLLECTION[deleteTarget.listing.page], deleteTarget.id));
      }
      await deleteDoc(doc(db, "businesses", deleteTarget.id));
      await Promise.allSettled(urls.map((u) => deleteObject(storageRef(storage, u))));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const photoLookup = useCallback(
    (businessId: string) => {
      const biz = businesses.find((b) => b.id === businessId);
      return biz ? picsOf(biz) : [];
    },
    [businesses]
  );

  const filtered =
    filter === "all" ? businesses : businesses.filter((b) => b.overallStatus === filter);
  const pendingCount = businesses.filter((b) => b.overallStatus === "pending").length;
  const approvedCount = businesses.filter((b) => b.overallStatus === "approved").length;
  const rejectedCount = businesses.filter((b) => b.overallStatus === "rejected").length;

  const requestedPage =
    publishTarget?.explorePage && EXPLORE_PAGES[publishTarget.explorePage]
      ? publishTarget.explorePage
      : undefined;

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
            Listings
          </h1>
        </div>
        <p style={styles.subtitle}>
          {tab === "applications"
            ? "Approve applications to publish them on Explore. Approved listings can be edited, hidden or deleted."
            : "Everything shown on the Explore pages. Add, edit, hide or delete any establishment."}
        </p>

        <div style={styles.tabRow}>
          <button
            style={{ ...styles.tabBtn, ...(tab === "applications" ? styles.tabBtnActive : {}) }}
            onClick={() => setTab("applications")}
          >
            <i className="fas fa-inbox" /> Applications
            {pendingCount > 0 && <span style={styles.tabCount}>{pendingCount}</span>}
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "explore" ? styles.tabBtnActive : {}) }}
            onClick={() => setTab("explore")}
          >
            <i className="fas fa-map-location-dot" /> Explore Listings
          </button>
        </div>

        {tab === "explore" && <ExplorePanel photoLookup={photoLookup} />}

        {tab === "applications" && (
          <>
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

            <div style={styles.filterRow}>
              {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{ ...styles.filterChip, ...(filter === f ? styles.filterChipActive : {}) }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {loading && <div style={styles.panelState}>Loading applications...</div>}
            {loadFailed && (
              <div style={styles.panelState}>⚠️ Cannot connect to Firestore. Check your Firebase config and rules.</div>
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
                    onApprove={setPublishTarget}
                    onEdit={setPublishTarget}
                    onReject={(id) => setRejectTargetId(id)}
                    onDelete={setDeleteTarget}
                    onPreview={setPreviewUrl}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {publishTarget && (
        <ListingModal
          key={publishTarget.id}
          title={publishTarget.listing ? "Edit Listing" : "Approve & Publish to Explore"}
          submitLabel={publishTarget.listing ? "Save changes" : "Approve & Publish"}
          initial={publishInitial(publishTarget)}
          notice={
            !publishTarget.listing && requestedPage
              ? `Owner registered as ${EXPLORE_PAGES[requestedPage].label} › ${publishTarget.exploreCategory}. Change it below if it doesn't fit.`
              : undefined
          }
          photoChoices={picsOf(publishTarget)}
          onClose={() => setPublishTarget(null)}
          onSave={(data) => saveListing(publishTarget, data)}
        />
      )}
      <RejectModal open={!!rejectTargetId} onCancel={() => setRejectTargetId(null)} onConfirm={confirmReject} />
      <DeleteModal biz={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
      <ImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}