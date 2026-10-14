/* ============================================================
   FILE: app/adminpage/AdminListings/page.tsx
   PAGE: Listings — Admin dashboard (ADMIN ONLY)
   URL:  /adminpage/AdminListings
   TABS: Applications     -> review business applications, approve & publish,
                             and handle owners' deletion requests
         Explore Listings -> manage EVERYTHING shown on the Explore pages

   - Shared AdminSidebar (Admin lang, naa ang Rules ug Log Out)
   - Firebase Auth admin guard (wala nay localStorage)
   - Documents open in an in-app PreviewModal

   NEW IN THIS VERSION:
   - DELETION REQUESTS: owners can no longer delete a business themselves.
     Their request (with a reason) shows on the card and under the new
     "Deletion requests" filter. "Approve deletion" deletes the business,
     its Explore listing and files. "Decline" asks for the admin's reason,
     which the owner sees on their profile.
   - "Edited by owner" badge when the owner changed an approved business
     from their profile. It clears the next time you save the listing.

   FROM BEFORE: operating hours on cards and in the editor, the owner's map
   pin pre-filled on "Approve & Publish".
   ============================================================ */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  serverTimestamp,
  writeBatch,
  deleteDoc,
  deleteField,
  updateDoc,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/Firebase";
import useAdminGuard from "@/hooks/useAdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import type { BusinessRegistration, DocStatus, DocumentEntry } from "@/types/business";
import {
  EXPLORE_PAGES,
  PAGE_COLLECTION,
  toExploreDoc,
  type ListingData,
} from "@/types/listing";
import { sanitizeHours, summarizeHours, type OperatingHours } from "@/lib/OperatingHours";
import ListingModal from "./ListingModal";
import ExplorePanel from "./ExplorePanel";
import { styles } from "./styles";

type FirestoreTime = { toDate?: () => Date } | null | undefined;

type AdminBusiness = BusinessRegistration & {
  rejectionReason?: string | null;
  reviewedBy?: string;
  address?: string; // collected by the registration form
  description?: string;
  listing?: ListingData; // what was published to Explore
  // Where the owner pinned the business on the registration map
  lat?: number;
  lng?: number;
  locationMethod?: "map" | "gps" | "typed";
  locationAccuracyM?: number;
  // Days open + times (raw from Firestore; read it with sanitizeHours)
  operatingHours?: unknown;
  // Owner asked for the business to be deleted
  deletionRequest?: {
    status: "pending" | "declined";
    reason?: string;
    adminNote?: string | null;
    requestedAt?: FirestoreTime;
  };
  // Owner edited an approved business from their profile
  needsReview?: boolean;
};

type Filter = DocStatus | "all" | "deletion";

/** A file the admin can preview: a document, or a business picture. */
type PreviewFile = { url: string; name?: string };

const DOC_LABELS: Record<string, string> = {
  businessPermit: "Business Permit",
  dti: "DTI / SEC Registration",
  barangayClearance: "Barangay Clearance",
  barangayCertification: "Barangay Certification",
  cedula: "Cedula",
};

function statusStyle(status: DocStatus): { background: string; color: string } {
  if (status === "approved") return { background: "#d4edda", color: "#155724" };
  if (status === "rejected") return { background: "#fdecea", color: "#c0392b" };
  return { background: "#fff3cd", color: "#856404" };
}

const deletionPending = (biz: AdminBusiness): boolean => biz.deletionRequest?.status === "pending";

function formatTime(t: FirestoreTime): string {
  const d = t?.toDate?.();
  return d ? d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "";
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

const hasOwnerPin = (biz: AdminBusiness): boolean =>
  typeof biz.lat === "number" && Number.isFinite(biz.lat) && typeof biz.lng === "number" && Number.isFinite(biz.lng);

/* "Owner pinned it with GPS (±12 m)" / "Owner pinned it on the map" / "No location pinned" */
function ownerPinLabel(biz: AdminBusiness): string {
  if (!hasOwnerPin(biz)) return "📍 The owner did not pin a location (older application).";
  if (biz.locationMethod === "gps" && typeof biz.locationAccuracyM === "number") {
    return `📍 Pinned by the owner with GPS (±${Math.round(biz.locationAccuracyM)} m).`;
  }
  return "📍 Pinned by the owner on the map.";
}

const hoursOf = (biz: AdminBusiness): OperatingHours | null => sanitizeHours(biz.operatingHours);

/* "🕒 Mon–Fri 8:00 AM – 5:00 PM · Sun Closed" */
function hoursLabel(biz: AdminBusiness): string {
  const hours = hoursOf(biz);
  if (!hours) return "🕒 No operating hours given (older application).";
  return `🕒 ${summarizeHours(hours)
    .map((l) => `${l.days} ${l.hours}`)
    .join(" · ")}`;
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
    // the owner's pin (the admin checks it on the map before approving)
    ...(hasOwnerPin(biz) ? { lat: biz.lat as number, lng: biz.lng as number } : {}),
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

/* ── Decline a deletion request (reason required, shown to the owner) ── */
function DeclineDeletionModal({
  biz,
  onCancel,
  onConfirm,
}: {
  biz: AdminBusiness | null;
  onCancel: () => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setNote("");
    setErr("");
  }, [biz]);

  if (!biz) return null;
  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div style={styles.modalBox}>
        <i className="fas fa-ban" style={{ color: "#856404", fontSize: "2rem", marginBottom: 10 }} />
        <h3 style={styles.modalTitle}>Decline deletion of “{biz.businessName}”?</h3>
        <p style={styles.modalText}>
          The business stays. The owner will see your reason on their profile.
        </p>
        <textarea
          style={styles.modalTextarea}
          placeholder="Reason for declining (required)"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />
        {err && <div style={{ ...styles.rejectionNote, marginTop: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
          <button onClick={onCancel} style={styles.modalCancelBtn} disabled={busy}>Cancel</button>
          <button
            style={styles.approveBtnSolid}
            disabled={busy}
            onClick={async () => {
              if (note.trim().length < 5) {
                setErr("Please give the owner a short reason.");
                return;
              }
              setBusy(true);
              await onConfirm(note.trim());
              setBusy(false);
            }}
          >
            {busy ? "Saving…" : "Decline request"}
          </button>
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
  const requested = deletionPending(biz);
  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modalBox}>
        <i className="fas fa-trash" style={{ color: "#c0392b", fontSize: "2rem", marginBottom: 10 }} />
        <h3 style={styles.modalTitle}>
          {requested ? "Approve deletion of" : "Delete"} “{biz.businessName}”?
        </h3>
        {requested && biz.deletionRequest?.reason && (
          <div style={{ ...styles.requestNote, textAlign: "left" }}>
            Owner&apos;s reason: {biz.deletionRequest.reason}
          </div>
        )}
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
            {busy ? "Deleting…" : requested ? "Approve & delete" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Document / image preview modal ──
   Images render directly. PDFs render via an <iframe> using the
   browser's built-in PDF viewer. "Open in new tab" is always
   available as a fallback (e.g. if the iframe is blocked). */
function isPdfFile(url: string, name?: string): boolean {
  const target = (name || url).split("?")[0].toLowerCase();
  return target.endsWith(".pdf");
}

function PreviewModal({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  if (!file) return null;
  const pdf = isPdfFile(file.url, file.name);

  return (
    <div style={styles.imageModalOverlay} onClick={onClose}>
      <div
        style={{
          ...styles.imageModalImg,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid #eee",
            fontSize: ".85rem",
            flexShrink: 0,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name || "Preview"}
          </span>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
            <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: ".8rem" }}>
              <i className="fas fa-up-right-from-square" /> Open in new tab
            </a>
            <button
              onClick={onClose}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem" }}
              aria-label="Close"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {pdf ? (
            <iframe
              src={file.url}
              title={file.name || "Document preview"}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.name || "Preview"}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
      </div>
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
  onDeclineDeletion,
  onPreview,
}: {
  biz: AdminBusiness;
  onApprove: (b: AdminBusiness) => void;
  onReject: (id: string) => void;
  onEdit: (b: AdminBusiness) => void;
  onDelete: (b: AdminBusiness) => void;
  onDeclineDeletion: (b: AdminBusiness) => void;
  onPreview: (file: PreviewFile) => void;
}) {
  const tag = statusStyle(biz.overallStatus);
  const pictures = biz.documents?.businessPictures?.urls ?? [];
  const docEntries = Object.entries(biz.documents ?? {}).filter(
    ([key]) => key !== "businessPictures"
  ) as [string, DocumentEntry][];
  const requested = deletionPending(biz);

  return (
    <div
      style={{
        ...styles.bizCard,
        ...(requested ? { outline: "2px solid #f3dc8a" } : {}),
      }}
    >
      <div style={styles.bizCardHead}>
        <div>
          <div style={styles.bizName}>
            {biz.businessName}
            {biz.needsReview && (
              <span
                title="The owner changed this business from their profile. Open Edit to check it."
                style={{ ...styles.srcBadge, marginLeft: 8, background: "#e8f0fe", color: "#1a4fa0" }}
              >
                ✏️ Edited by owner
              </span>
            )}
          </div>
          <div style={styles.bizMeta}>
            Owner: {biz.fullName} &middot; {requestedTypeLabel(biz)}
          </div>
          <div style={styles.bizMeta}>Operating since {biz.yearOperation}</div>
          {biz.address && <div style={styles.bizMeta}>{biz.address}</div>}
          <div
            style={{ ...styles.bizMeta, color: hasOwnerPin(biz) ? "#1a5c38" : "#b9770e" }}
            data-testid="owner-pin-note"
          >
            {ownerPinLabel(biz)}
          </div>
          <div style={{ ...styles.bizMeta, color: hoursOf(biz) ? "#1a5c38" : "#b9770e" }}>
            {hoursLabel(biz)}
          </div>
        </div>
        <span style={{ ...styles.tag, background: tag.background, color: tag.color }}>
          {biz.overallStatus}
        </span>
      </div>

      {/* ── Owner's deletion request ── */}
      {requested && (
        <div style={{ background: "#fff8e1", border: "1px solid #f3dc8a", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#7a5b00" }}>
            🗑️ The owner asked to delete this business
            {formatTime(biz.deletionRequest?.requestedAt) ? ` (${formatTime(biz.deletionRequest?.requestedAt)})` : ""}
          </div>
          <div style={{ fontSize: ".8rem", color: "#5c4500", marginTop: 4 }}>
            Reason: {biz.deletionRequest?.reason || "—"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={styles.rejectBtn} onClick={() => onDelete(biz)}>
              <i className="fas fa-check" /> Approve deletion
            </button>
            <button style={styles.approveBtn} onClick={() => onDeclineDeletion(biz)}>
              <i className="fas fa-ban" /> Decline
            </button>
          </div>
        </div>
      )}

      {pictures.length > 0 && (
        <div style={styles.thumbRow}>
          {pictures.map((pic, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={pic.url ?? idx}
              src={pic.url}
              alt={pic.name}
              style={styles.thumb}
              onClick={() => onPreview({ url: pic.url, name: pic.name })}
            />
          ))}
        </div>
      )}

      {docEntries.length > 0 && (
        <div style={styles.docList}>
          {docEntries.map(([key, entry]) => (
            <button
              key={key}
              type="button"
              onClick={() => onPreview({ url: entry.url, name: entry.name })}
              style={{
                ...styles.docLink,
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 0,
                font: "inherit",
              }}
            >
              <i className="fas fa-file-alt" /> {DOC_LABELS[key] ?? entry.name}
            </button>
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
        {!requested && (
          <button style={styles.rejectBtn} onClick={() => onDelete(biz)}>
            <i className="fas fa-trash" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminListingsPage() {
  const { user, ready } = useAdminGuard();
  const reviewer = user?.email ?? "Admin";

  const [tab, setTab] = useState<"applications" | "explore">("applications");
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<AdminBusiness | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBusiness | null>(null);
  const [declineTarget, setDeclineTarget] = useState<AdminBusiness | null>(null);
  const [preview, setPreview] = useState<PreviewFile | null>(null);

  /* Real-time list of applications */
  useEffect(() => {
    if (!ready) return;

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
  }, [ready]);

  /* Approve (first publish) or edit. Writes into the existing category collection. */
  const saveListing = useCallback(
    async (biz: AdminBusiness, data: ListingData, hours: OperatingHours | null) => {
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
          // null = no hours on file -> remove the field
          operatingHours: hours ?? deleteField(),
          ...(firstPublish || moved ? { order: Date.now() } : {}),
          ...(firstPublish ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Keep the private application in sync (the owner sees these hours on their profile)
      batch.update(doc(db, "businesses", biz.id!), {
        overallStatus: "approved",
        businessName: data.name,
        rejectionReason: null,
        listing: data,
        operatingHours: hours ?? deleteField(),
        needsReview: false, // the admin has now checked the owner's edits
        ...(biz.overallStatus !== "approved"
          ? { reviewedAt: serverTimestamp(), reviewedBy: reviewer }
          : {}),
      });

      await batch.commit();
      setPublishTarget(null);
    },
    [reviewer]
  );

  const confirmReject = useCallback(
    async (reason: string) => {
      if (!rejectTargetId) return;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "businesses", rejectTargetId), {
          overallStatus: "rejected",
          reviewedAt: serverTimestamp(),
          reviewedBy: reviewer,
          rejectionReason: reason || "No reason provided.",
        });
        await batch.commit();
      } catch (err) {
        console.error("Reject error:", err);
      } finally {
        setRejectTargetId(null);
      }
    },
    [rejectTargetId, reviewer]
  );

  /* Decline an owner's deletion request (the owner sees the note on their profile) */
  const confirmDeclineDeletion = useCallback(
    async (note: string) => {
      if (!declineTarget?.id) return;
      try {
        await updateDoc(doc(db, "businesses", declineTarget.id), {
          "deletionRequest.status": "declined",
          "deletionRequest.adminNote": note,
          "deletionRequest.reviewedAt": serverTimestamp(),
          "deletionRequest.reviewedBy": reviewer,
        });
      } catch (err) {
        console.error("Decline deletion error:", err);
        alert("Could not save. Please try again.");
      } finally {
        setDeclineTarget(null);
      }
    },
    [declineTarget, reviewer]
  );

  /* Delete (also used to APPROVE a deletion request):
     Explore doc first, then the application, then files (best effort) */
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

  if (!ready) return null;

  const pendingCount = businesses.filter((b) => b.overallStatus === "pending").length;
  const approvedCount = businesses.filter((b) => b.overallStatus === "approved").length;
  const rejectedCount = businesses.filter((b) => b.overallStatus === "rejected").length;
  const deletionCount = businesses.filter(deletionPending).length;

  const filtered =
    filter === "all"
      ? businesses
      : filter === "deletion"
      ? businesses.filter(deletionPending)
      : businesses.filter((b) => b.overallStatus === filter);

  const requestedPage =
    publishTarget?.explorePage && EXPLORE_PAGES[publishTarget.explorePage]
      ? publishTarget.explorePage
      : undefined;

  /* The hint shown at the top of the Approve & Publish window */
  const approveNotice = (() => {
    if (!publishTarget) return undefined;
    if (publishTarget.listing) {
      return publishTarget.needsReview
        ? "The owner edited this business from their profile (name, address or description). Check the details below, then save to clear the “Edited by owner” mark."
        : undefined;
    }
    const parts: string[] = [];
    if (requestedPage) {
      parts.push(
        `Owner registered as ${EXPLORE_PAGES[requestedPage].label} › ${publishTarget.exploreCategory}. Change it below if it doesn't fit.`
      );
    }
    parts.push(
      hasOwnerPin(publishTarget)
        ? `${ownerPinLabel(publishTarget)} Check the pin on the 🛰 Satellite view and drag it if it is not on the building.`
        : "The owner did not pin a location. Put the pin on the building on the map below."
    );
    parts.push(
      hoursOf(publishTarget)
        ? "The owner's operating hours are filled in below. Check that they look right."
        : "The owner did not give operating hours. Add them below if you know them."
    );
    return parts.join(" ");
  })();

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "deletion", label: `Deletion requests${deletionCount ? ` (${deletionCount})` : ""}` },
    { value: "all", label: "All" },
  ];

  return (
    <div style={styles.body}>
      <AdminSidebar />

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
            ? "Approve applications to publish them on Explore, and review owners' deletion requests. Approved listings can be edited, hidden or deleted."
            : "Everything shown on the Explore pages. Add, edit, hide or delete any establishment."}
        </p>

        <div style={styles.tabRow}>
          <button
            style={{ ...styles.tabBtn, ...(tab === "applications" ? styles.tabBtnActive : {}) }}
            onClick={() => setTab("applications")}
          >
            <i className="fas fa-inbox" /> Applications
            {pendingCount + deletionCount > 0 && (
              <span style={styles.tabCount}>{pendingCount + deletionCount}</span>
            )}
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
                <i className="fas fa-trash-can" style={styles.statIcon} />
                <h2 style={styles.statH2}>{deletionCount}</h2>
                <p style={styles.statP}>Deletion Requests</p>
              </div>
              <div style={styles.statCard}>
                <i className="fas fa-store" style={styles.statIcon} />
                <h2 style={styles.statH2}>{businesses.length}</h2>
                <p style={styles.statP}>Total Applications</p>
              </div>
            </div>

            <div style={styles.filterRow}>
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  style={{ ...styles.filterChip, ...(filter === f.value ? styles.filterChipActive : {}) }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading && <div style={styles.panelState}>Loading applications...</div>}
            {loadFailed && (
              <div style={styles.panelState}>⚠️ Cannot connect to Firestore. Check your Firebase config and rules.</div>
            )}
            {!loading && !loadFailed && filtered.length === 0 && (
              <div style={styles.panelState}>
                {filter === "deletion"
                  ? "No deletion requests. 🎉"
                  : `No ${filter !== "all" ? filter : ""} applications yet.`}
              </div>
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
                    onDeclineDeletion={setDeclineTarget}
                    onPreview={setPreview}
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
          initialHours={hoursOf(publishTarget)}
          notice={approveNotice}
          photoChoices={picsOf(publishTarget)}
          onClose={() => setPublishTarget(null)}
          onSave={(data, hours) => saveListing(publishTarget, data, hours)}
        />
      )}
      <RejectModal open={!!rejectTargetId} onCancel={() => setRejectTargetId(null)} onConfirm={confirmReject} />
      <DeclineDeletionModal biz={declineTarget} onCancel={() => setDeclineTarget(null)} onConfirm={confirmDeclineDeletion} />
      <DeleteModal biz={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
      <PreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}