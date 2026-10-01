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
/* ── Shape returned by /api/business/profile (one entry per business
   the logged-in owner has submitted) ── */
interface DocEntry {
  label: string;
  url: string;
  status: "pending" | "approved" | "rejected";
}

interface BusinessSummary {
  id: string;
  businessName: string;
  businessType: string;
  yearOperating: string;
  overallStatus: "pending" | "approved" | "rejected";
  pictures: { name: string; url: string }[];
  documents: DocEntry[];
  rejectionReason: string | null;
  submittedAt: string | null;
}

const STATUS_STYLES: Record<
  BusinessSummary["overallStatus"],
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Review" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
};

export default function ProfilePage() {
  const router = useRouter();

  // Session / auth
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  // Businesses list — loading and error are scoped to THIS section only,
  // so a failed fetch never hides the profile picture header above it.
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState("");

  // Delete flow: which business is being confirmed, request state, messages
  const [deleteTarget, setDeleteTarget] = useState<BusinessSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  // Personal profile picture — separate from any business's photos.
  // Stored at users/{uid}.profilePictureUrl, read/written directly with
  // the client Firestore SDK (same pattern as business-registration.tsx).
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState("");
  const picInputRef = useRef<HTMLInputElement>(null);

  /* ── Auth guard — same pattern as business-registration.tsx.
     Doesn't touch businessesLoading; that's owned by the fetch below. */
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

  /* ── Business applications list — independent of the auth effect above ── */
  useEffect(() => {
    async function fetchBusinesses() {
      setBusinessesLoading(true);
      setBusinessesError("");
      try {
        const token =
          localStorage.getItem("mycalinan_token") ||
          sessionStorage.getItem("mycalinan_token");

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

  /* ── Hide the "deleted" notice after a few seconds ── */
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  /* ── Esc closes the delete dialog (unless a delete is in progress) ── */
  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setDeleteTarget(null);
        setDeleteError("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget, deleting]);

  function askToDelete(biz: BusinessSummary) {
    setDeleteError("");
    setDeleteTarget(biz);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setDeleting(true);
    setDeleteError("");
    try {
      // The login token expires after about an hour, so ask Firebase for a fresh one
      const freshToken = await auth.currentUser?.getIdToken();
      const token =
        freshToken ||
        localStorage.getItem("mycalinan_token") ||
        sessionStorage.getItem("mycalinan_token");

      const response = await fetch(`/api/business/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setDeleteError(data?.error ?? "Could not delete this business. Please try again.");
        return;
      }

      setBusinesses((prev) => prev.filter((b) => b.id !== target.id));
      setNotice(`"${target.businessName}" was deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete business failed:", err);
      setDeleteError("Cannot connect to the server. Please try again.");
    } finally {
      setDeleting(false);
    }
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

      {/* ── Businesses list / history ── */}
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
        <div
          role="status"
          className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
        >
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
          <h3 className="text-base font-semibold text-ink-900">
            No business profile submitted yet.
          </h3>
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
            <BusinessCard key={biz.id} biz={biz} onDelete={askToDelete} />
          ))}
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-business-title"
          onClick={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <i className="fas fa-trash" />
            </div>
            <h3
              id="delete-business-title"
              className="text-center text-base font-semibold text-ink-900"
            >
              Delete this business?
            </h3>
            <p className="mt-2 text-center text-sm text-ink-700">
              <strong>{deleteTarget.businessName}</strong> will be removed from your profile.
              This can&apos;t be undone.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                className="flex-1 rounded-full border border-canopy-100 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-canopy-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessCard({
  biz,
  onDelete,
}: {
  biz: BusinessSummary;
  onDelete: (biz: BusinessSummary) => void;
}) {
  const tag = STATUS_STYLES[biz.overallStatus] ?? STATUS_STYLES.pending;
  const cover = biz.pictures[0]?.url;

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
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tag.bg} ${tag.text}`}>
            {tag.label}
          </span>
        </div>

        {biz.overallStatus === "rejected" && (
          <>
            {biz.rejectionReason && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <i className="fas fa-info-circle" /> {biz.rejectionReason}
              </div>
            )}
            {biz.documents.length > 0 && (
              <DocumentList documents={biz.documents} />
            )}
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

        <BusinessReviewsPanel businessId={biz.id} />

        {/* ── Delete ── */}
        <div className="flex justify-end border-t border-canopy-100 pt-4">
          <button
            type="button"
            onClick={() => onDelete(biz)}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <i className="fas fa-trash" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentList({ documents }: { documents: DocEntry[] }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase text-ink-700">
        Submitted Documents
      </span>
      <ul className="mt-1 space-y-1">
        {documents.map((d) => (
          <li key={d.label}>
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-canopy-700 underline"
            >
              <i className="fas fa-file-alt" /> {d.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}