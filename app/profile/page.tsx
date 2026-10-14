/* ============================================================
   FILE: app/profile/page.tsx
   PAGE: Owner profile — personal photo + "My Businesses"

   NEW IN THIS VERSION:
   - "Edit" button on each business (pending or approved): owner name,
     email, phone, business name, address, description and year of
     operation. Saved through PATCH /api/business/update. For an approved
     business the Explore listing is updated too, and the admin is told
     it was edited.
   - "Delete" is now "Request deletion": the owner gives a reason and the
     request goes to Admin > Listings for approval. While it is pending the
     owner can cancel it. If the admin declines, the admin's reason shows here.

   FROM BEFORE: operating hours (view + "Edit hours"), profile picture,
   documents list, reviews panel.
   ============================================================ */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/Firebase";
import BusinessReviewsPanel from "@/components/BusinessReviewsPanel";
import OperatingHoursEditor from "@/components/OperatingHoursEditor";
import { HoursTable, OpenStatusBadge } from "@/components/OperatingHoursDisplay";
import { emptyHours, validateHours, type OperatingHours } from "@/lib/OperatingHours";

/* ── Shape returned by /api/business/profile ── */
interface DocEntry {
  label: string;
  url: string;
  status: "pending" | "approved" | "rejected";
}

interface DeletionRequest {
  status: "pending" | "declined";
  reason: string;
  adminNote: string | null;
  requestedAt: string | null;
  reviewedAt?: string | null;
}

interface BusinessSummary {
  id: string;
  businessName: string;
  businessType: string;
  yearOperating: string;
  overallStatus: "pending" | "approved" | "rejected";
  pictures: { name: string; url: string }[];
  documents: DocEntry[];
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  description: string;
  operatingHours: OperatingHours | null;
  rejectionReason: string | null;
  deletionRequest: DeletionRequest | null;
  submittedAt: string | null;
}

interface EditFields {
  businessName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  description: string;
  yearOperation: string;
}

const STATUS_STYLES: Record<
  BusinessSummary["overallStatus"],
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Review" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
};

const INPUT =
  "w-full rounded-lg border border-canopy-100 px-3 py-2 text-sm text-ink-900 focus:border-canopy-700 focus:outline-none";

/* The login token saved at sign-in expires after about an hour,
   so always ask Firebase for a fresh one first. */
async function getFreshToken(): Promise<string | null> {
  await auth.authStateReady();
  return (
    (await auth.currentUser?.getIdToken()) ||
    localStorage.getItem("mycalinan_token") ||
    sessionStorage.getItem("mycalinan_token")
  );
}

async function callApi(url: string, method: string, body: unknown) {
  const token = await getFreshToken();
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, data };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export default function ProfilePage() {
  const router = useRouter();

  // Session / auth
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  // Businesses list
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState("");
  const [notice, setNotice] = useState("");

  // Dialogs
  const [editTarget, setEditTarget] = useState<BusinessSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessSummary | null>(null);

  // Personal profile picture
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState("");
  const picInputRef = useRef<HTMLInputElement>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUid(user.uid);
      setCheckingAuth(false);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setProfilePictureUrl((snap.data().profilePictureUrl as string) ?? null);
        }
      } catch (err) {
        console.error("Failed to load profile picture:", err);
      }
    });
    return () => unsubscribe();
  }, [router]);

  /* ── Business list ── */
  useEffect(() => {
    async function fetchBusinesses() {
      setBusinessesLoading(true);
      setBusinessesError("");
      try {
        const token = await getFreshToken();
        const response = await fetch("/api/business/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          setBusinesses([]);
          setBusinessesError("Could not load your businesses right now.");
          return;
        }
        const data: { businesses: BusinessSummary[] } = await response.json();
        setBusinesses(data.businesses ?? []);
      } catch (err) {
        console.error("Failed to load business profile:", err);
        setBusinessesError("Cannot connect to the server.");
      } finally {
        setBusinessesLoading(false);
      }
    }
    fetchBusinesses();
  }, []);

  /* ── Hide the notice after a few seconds ── */
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  function patchBusiness(id: string, patch: Partial<BusinessSummary>) {
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function cancelDeletionRequest(biz: BusinessSummary) {
    const { ok, data } = await callApi("/api/business/delete-request", "DELETE", { businessId: biz.id });
    if (!ok) {
      setNotice(data?.error ?? "Could not cancel the request. Please try again.");
      return;
    }
    patchBusiness(biz.id, { deletionRequest: null });
    setNotice(`Deletion request for "${biz.businessName}" was cancelled.`);
  }

  async function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    setPicError("");
    setUploadingPic(true);
    try {
      const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const fileRef = ref(storage, `users/${uid}/profilePicture/${safeName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await setDoc(doc(db, "users", uid), { profilePictureUrl: url }, { merge: true });
      setProfilePictureUrl(url);
    } catch (err) {
      console.error("Profile picture upload failed:", err);
      setPicError("Could not upload your profile picture. Please try again.");
    } finally {
      setUploadingPic(false);
      if (picInputRef.current) picInputRef.current.value = "";
    }
  }

  if (checkingAuth) {
    return (
      <div className="px-6 py-16 text-center text-sm text-ink-700">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* ── Home button ── */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-canopy-100 bg-white px-4 py-2 text-xs font-semibold text-ink-900 shadow-sm hover:bg-canopy-50"
        >
          <i className="fas fa-home" /> Home
        </Link>
      </div>

      {/* ── Personal profile header ── */}
      <div className="mb-8 flex items-center gap-5 rounded-[var(--radius-stall)] border border-canopy-100 bg-white p-6 shadow-sm">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-canopy-100 bg-canopy-50">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt="Your profile picture"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-500">
                No photo
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => picInputRef.current?.click()}
            disabled={uploadingPic || !uid}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-durian-500 text-xs text-ink-900 shadow hover:bg-durian-400 disabled:opacity-60"
            title="Change profile picture"
          >
            <i className="fas fa-camera" />
          </button>
          <input
            ref={picInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePicChange}
          />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Your Profile</h1>
          <p className="text-sm text-ink-700">
            {uploadingPic ? "Uploading photo..." : "Tap the camera icon to update your photo."}
          </p>
          {picError && <p className="mt-1 text-xs text-red-600">{picError}</p>}
        </div>
      </div>

      {/* ── Businesses ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink-900">My Businesses</h2>
        <Link
          href="/business-registration"
          className="rounded-full bg-durian-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-durian-400"
        >
          <i className="fas fa-plus" /> Register a Business
        </Link>
      </div>

      {notice && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          <i className="fas fa-check-circle" /> {notice}
        </div>
      )}

      {businessesLoading && (
        <div className="rounded-[var(--radius-stall)] border border-canopy-100 bg-white px-6 py-10 text-center text-sm text-ink-700">
          Loading your businesses...
        </div>
      )}

      {!businessesLoading && businessesError && (
        <div className="rounded-[var(--radius-stall)] border border-red-100 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
          <i className="fas fa-triangle-exclamation" /> {businessesError}
        </div>
      )}

      {!businessesLoading && !businessesError && businesses.length === 0 && (
        <div className="rounded-[var(--radius-stall)] border border-dashed border-canopy-200 bg-canopy-50/40 px-6 py-14 text-center">
          <h3 className="text-base font-semibold text-ink-900">No business profile submitted yet.</h3>
          <p className="mt-2 text-sm text-ink-700">
            Submit the Business Form first so your establishment appears here.
          </p>
          <Link
            href="/business-registration"
            className="mt-4 inline-block rounded-full bg-durian-500 px-5 py-2 text-sm font-semibold text-ink-900 hover:bg-durian-400"
          >
            Submit Business Form
          </Link>
        </div>
      )}

      {!businessesLoading && !businessesError && businesses.length > 0 && (
        <div className="space-y-5">
          {businesses.map((biz) => (
            <BusinessCard
              key={biz.id}
              biz={biz}
              onEdit={() => setEditTarget(biz)}
              onRequestDelete={() => setDeleteTarget(biz)}
              onCancelDelete={() => cancelDeletionRequest(biz)}
              onHoursSaved={(hours) => {
                patchBusiness(biz.id, { operatingHours: hours });
                setNotice("Operating hours saved.");
              }}
            />
          ))}
        </div>
      )}

      {editTarget && (
        <EditBusinessDialog
          biz={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(fields) => {
            patchBusiness(editTarget.id, {
              businessName: fields.businessName,
              fullName: fields.fullName,
              email: fields.email,
              phoneNumber: fields.phoneNumber,
              address: fields.address,
              description: fields.description,
              yearOperating: fields.yearOperation,
            });
            setNotice(
              editTarget.overallStatus === "approved"
                ? "Changes saved. Your Explore listing is updated, and the admin was notified."
                : "Changes saved."
            );
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <RequestDeletionDialog
          biz={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSent={(request) => {
            patchBusiness(deleteTarget.id, { deletionRequest: request });
            setNotice(`Deletion request sent for "${deleteTarget.businessName}". The admin will review it.`);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   BUSINESS CARD
══════════════════════════════════════════ */

function BusinessCard({
  biz,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onHoursSaved,
}: {
  biz: BusinessSummary;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onHoursSaved: (hours: OperatingHours) => void;
}) {
  const tag = STATUS_STYLES[biz.overallStatus] ?? STATUS_STYLES.pending;
  const cover = biz.pictures[0]?.url;
  const deletionPending = biz.deletionRequest?.status === "pending";
  const canEdit = biz.overallStatus !== "rejected" && !deletionPending;

  return (
    <div className="overflow-hidden rounded-[var(--radius-stall)] border border-canopy-100 bg-white shadow-sm">
      {cover ? (
        <Image
          src={cover}
          alt={`${biz.businessName} picture`}
          width={800}
          height={320}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-canopy-50 text-sm text-ink-500">
          No picture uploaded
        </div>
      )}

      <div className="space-y-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink-900">{biz.businessName}</h3>
            <p className="text-xs text-ink-700">
              {biz.businessType} &middot; Operating since {biz.yearOperating}
            </p>
            {biz.address && <p className="text-xs text-ink-500">{biz.address}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tag.bg} ${tag.text}`}>
            {tag.label}
          </span>
        </div>

        {/* Deletion request status */}
        {deletionPending && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <p className="font-semibold">
              <i className="fas fa-hourglass-half" /> Deletion requested
              {biz.deletionRequest?.requestedAt ? ` on ${formatDate(biz.deletionRequest.requestedAt)}` : ""}
            </p>
            <p className="mt-1">Your reason: {biz.deletionRequest?.reason}</p>
            <p className="mt-1 text-xs">Waiting for the admin to review it. Editing is paused until then.</p>
          </div>
        )}
        {biz.deletionRequest?.status === "declined" && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">
              <i className="fas fa-info-circle" /> Your deletion request was declined
            </p>
            {biz.deletionRequest.adminNote && <p className="mt-1">Admin&apos;s reason: {biz.deletionRequest.adminNote}</p>}
          </div>
        )}

        {biz.overallStatus === "rejected" && (
          <>
            {biz.rejectionReason && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <i className="fas fa-info-circle" /> {biz.rejectionReason}
              </div>
            )}
            {biz.documents.length > 0 && <DocumentList documents={biz.documents} />}
            <Link
              href="/business-registration"
              className="mt-2 inline-block rounded-full bg-durian-500 px-5 py-2 text-sm font-semibold text-ink-900 hover:bg-durian-400"
            >
              Submit Again
            </Link>
          </>
        )}

        {biz.overallStatus === "pending" && (
          <p className="text-sm text-ink-700">
            Still in the admin&apos;s pending queue. You&apos;ll be notified once it&apos;s reviewed.
          </p>
        )}

        {biz.overallStatus === "approved" && biz.documents.length > 0 && (
          <DocumentList documents={biz.documents} />
        )}

        {biz.overallStatus !== "rejected" && (
          <HoursSection biz={biz} onSaved={onHoursSaved} disabled={deletionPending} />
        )}

        <BusinessReviewsPanel businessId={biz.id} />

        {/* ── Actions ── */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-canopy-100 pt-4">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-full border border-canopy-100 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-canopy-50"
            >
              <i className="fas fa-pen" /> Edit
            </button>
          )}
          {deletionPending ? (
            <button
              type="button"
              onClick={onCancelDelete}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-300 px-4 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-50"
            >
              <i className="fas fa-rotate-left" /> Cancel deletion request
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestDelete}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <i className="fas fa-trash" /> Request deletion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   EDIT DIALOG
══════════════════════════════════════════ */

function EditBusinessDialog({
  biz,
  onClose,
  onSaved,
}: {
  biz: BusinessSummary;
  onClose: () => void;
  onSaved: (fields: EditFields) => void;
}) {
  const [f, setF] = useState<EditFields>({
    businessName: biz.businessName,
    fullName: biz.fullName,
    email: biz.email,
    phoneNumber: biz.phoneNumber,
    address: biz.address,
    description: biz.description,
    yearOperation: biz.yearOperating,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof EditFields, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.businessName.trim()) return setError("Business name is required.");
    if (!f.fullName.trim()) return setError("Your full name is required.");
    if (!f.address.trim()) return setError("Business address is required.");

    setSaving(true);
    setError("");
    try {
      const { ok, data } = await callApi("/api/business/update", "PATCH", { businessId: biz.id, fields: f });
      if (!ok) {
        setError(data?.error ?? "Could not save your changes. Please try again.");
        return;
      }
      onSaved(data.fields as EditFields);
    } catch (err) {
      console.error("Edit business failed:", err);
      setError("Cannot connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title={`Edit ${biz.businessName}`} onClose={() => !saving && onClose()}>
      {biz.overallStatus === "approved" && (
        <p className="mb-3 rounded-lg bg-canopy-50 px-3 py-2 text-xs text-ink-700">
          Your business is live on Explore. Changes to the name, address and description show there right away,
          and the admin will be notified to check them.
        </p>
      )}

      <div className="space-y-3">
        <Field label="Business name">
          <input className={INPUT} value={f.businessName} maxLength={100} onChange={(e) => set("businessName", e.target.value)} />
        </Field>
        <Field label="Business address">
          <input className={INPUT} value={f.address} maxLength={200} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Short description (optional)">
          <textarea
            className={`${INPUT} min-h-[80px]`}
            value={f.description}
            maxLength={600}
            placeholder="What you sell or offer, in one or two sentences"
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Year of operation">
          <input
            className={INPUT}
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            value={f.yearOperation}
            onChange={(e) => set("yearOperation", e.target.value)}
          />
        </Field>
        <Field label="Owner's full name">
          <input className={INPUT} value={f.fullName} maxLength={100} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Email">
            <input className={INPUT} type="email" value={f.email} maxLength={120} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone number">
            <input className={INPUT} value={f.phoneNumber} maxLength={20} onChange={(e) => set("phoneNumber", e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-ink-500">
          To change documents or photos, please contact the barangay admin.
        </p>
      </div>

      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-full border border-canopy-100 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-canopy-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-full bg-durian-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-durian-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   REQUEST DELETION DIALOG
══════════════════════════════════════════ */

function RequestDeletionDialog({
  biz,
  onClose,
  onSent,
}: {
  biz: BusinessSummary;
  onClose: () => void;
  onSent: (request: DeletionRequest) => void;
}) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (reason.trim().length < 10) {
      setError("Please tell the admin why (at least 10 characters).");
      return;
    }
    setSending(true);
    setError("");
    try {
      const { ok, data } = await callApi("/api/business/delete-request", "POST", {
        businessId: biz.id,
        reason: reason.trim(),
      });
      if (!ok) {
        setError(data?.error ?? "Could not send the request. Please try again.");
        return;
      }
      onSent({
        status: "pending",
        reason: reason.trim(),
        adminNote: null,
        requestedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Request deletion failed:", err);
      setError("Cannot connect to the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog title="Request deletion" onClose={() => !sending && onClose()}>
      <p className="text-sm text-ink-700">
        <strong>{biz.businessName}</strong> will be removed only after the barangay admin approves your request.
        Until then it stays on your profile{biz.overallStatus === "approved" ? " and on Explore" : ""}.
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase text-ink-700">Reason for deletion</label>
      <textarea
        className={`${INPUT} mt-1 min-h-[100px]`}
        value={reason}
        maxLength={500}
        placeholder="e.g. The business has closed permanently."
        onChange={(e) => setReason(e.target.value)}
        disabled={sending}
      />
      <p className="mt-1 text-right text-xs text-ink-500">{reason.length}/500</p>

      {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          className="flex-1 rounded-full border border-canopy-100 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-canopy-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send request"}
        </button>
      </div>
    </Dialog>
  );
}

/* ══════════════════════════════════════════
   SMALL PIECES
══════════════════════════════════════════ */

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold text-ink-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function HoursSection({
  biz,
  onSaved,
  disabled,
}: {
  biz: BusinessSummary;
  onSaved: (hours: OperatingHours) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OperatingHours>(() => biz.operatingHours ?? emptyHours());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing() {
    setDraft(biz.operatingHours ?? emptyHours());
    setError("");
    setEditing(true);
  }

  async function save() {
    const problem = validateHours(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { ok, data } = await callApi("/api/business/hours", "PATCH", {
        businessId: biz.id,
        operatingHours: { ...draft, note: draft.note.trim() },
      });
      if (!ok) {
        setError(data?.error ?? "Could not save your hours. Please try again.");
        return;
      }
      onSaved(data.operatingHours as OperatingHours);
      setEditing(false);
    } catch (err) {
      console.error("Save hours failed:", err);
      setError("Cannot connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-canopy-100 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-ink-700">Operating Hours</span>
        {!editing && (
          <div className="flex items-center gap-2">
            <OpenStatusBadge hours={biz.operatingHours} hideUnknown />
            {!disabled && (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-full border border-canopy-100 px-3 py-1 text-xs font-semibold text-ink-900 hover:bg-canopy-50"
              >
                <i className="fas fa-clock" /> {biz.operatingHours ? "Edit hours" : "Add hours"}
              </button>
            )}
          </div>
        )}
      </div>

      {!editing && <HoursTable hours={biz.operatingHours} />}

      {editing && (
        <>
          <OperatingHoursEditor value={draft} onChange={setDraft} disabled={saving} />
          {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-full border border-canopy-100 bg-white px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-canopy-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-durian-500 px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-durian-400 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save hours"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DocumentList({ documents }: { documents: DocEntry[] }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase text-ink-700">Submitted Documents</span>
      <ul className="mt-1 space-y-1">
        {documents.map((d) => (
          <li key={d.label}>
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-canopy-700 underline">
              <i className="fas fa-file-alt" /> {d.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}