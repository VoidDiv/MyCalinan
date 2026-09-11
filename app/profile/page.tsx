"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/Firebase";

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
  const [uid, setUid] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Personal profile picture — separate from any business's photos.
  // Stored at users/{uid}.profilePictureUrl, read/written directly with
  // the client Firestore SDK (same pattern as business-registration.tsx).
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUid(user.uid);
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
  }, []);

  useEffect(() => {
    async function fetchBusinesses() {
      try {
        const token =
          localStorage.getItem("mycalinan_token") ||
          sessionStorage.getItem("mycalinan_token");

        const response = await fetch("/api/business/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          setBusinesses([]);
          return;
        }

        const data: { businesses: BusinessSummary[] } = await response.json();
        setBusinesses(data.businesses ?? []);
      } catch (err) {
        console.error("Failed to load business profile:", err);
        setError("Cannot connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    fetchBusinesses();
  }, []);

  async function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

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
      setError("Could not upload your profile picture. Please try again.");
    } finally {
      setUploadingPic(false);
      if (picInputRef.current) picInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-16 text-center text-sm text-ink-700">
        Loading your profile...
      </div>
    );
  }

  if (error) {
    return <div className="px-6 py-16 text-center text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
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

      {businesses.length === 0 && (
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

      <div className="space-y-5">
        {businesses.map((biz) => (
          <BusinessCard key={biz.id} biz={biz} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({ biz }: { biz: BusinessSummary }) {
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