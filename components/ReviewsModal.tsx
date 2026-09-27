/* ============================================================
   FILE: components/ReviewsModal.tsx
   One modal, two modes:
   - User mode (default): shows every review for a listing, plus
     a star-picker + comment box for the SIGNED-IN user's own
     review (create or edit — one review per user, editable
     anytime). Not signed in -> a "Log in to write a review" link
     instead of the form.
   - Admin mode (isAdmin): no submit form (admins don't leave
     reviews here); every review gets a Delete button for
     moderation, not just the current user's own.
   ============================================================ */

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/Firebase";
import { useListingReviews, submitReview, deleteReview, type ReviewDoc } from "@/lib/reviews";
import StarRating from "./StarRating";

export interface ReviewsModalProps {
  open: boolean;
  pageCollection: string;
  listingId: string;
  listingName: string;
  onClose: () => void;
  /** Admin moderation mode: every review gets a Delete button, no submit form. */
  isAdmin?: boolean;
}

function formatDate(ts: ReviewDoc["createdAt"]): string {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ReviewsModal({
  open,
  pageCollection,
  listingId,
  listingName,
  onClose,
  isAdmin = false,
}: ReviewsModalProps) {
  const { reviews, loading } = useListingReviews(pageCollection, open ? listingId : null);

  const [uid, setUid] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  /* Who's signed in right now (skip entirely in admin mode — admins don't
     submit here). We keep this live for as long as the modal is open, so if
     a session expires mid-visit the form disappears instead of silently
     trying (and failing) to write. */
  useEffect(() => {
    if (!open || isAdmin) {
      setCheckingAuth(false);
      return;
    }
    setCheckingAuth(true);
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setUid(null);
        setCheckingAuth(false);
        return;
      }
      setUid(user.uid);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setReviewerName(
          (snap.exists() && (snap.data().fullName as string)) || user.email || "MyCalinan user"
        );
      } catch {
        setReviewerName(user.email || "MyCalinan user");
      }
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [open, isAdmin]);

  /* Pre-fill the form with the signed-in user's existing review, once, so
     editing feels like editing rather than starting over. */
  useEffect(() => {
    if (!uid || prefilled) return;
    const mine = reviews.find((r) => r.id === uid);
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment);
      setPrefilled(true);
    }
  }, [uid, reviews, prefilled]);

  /* Reset local form state whenever the modal is closed/reopened for a new listing. */
  useEffect(() => {
    if (!open) {
      setRating(0);
      setComment("");
      setPrefilled(false);
      setError("");
    }
  }, [open, listingId]);

  if (!open) return null;

  const myReview = uid ? reviews.find((r) => r.id === uid) : undefined;

  async function handleSubmit() {
    // Hard re-check right before writing — never trust that `uid` from an
    // earlier render is still valid. If the session lapsed, refuse silently
    // rather than firing a doomed (and confusing) Firestore write.
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUid(null);
      setError("You've been signed out. Please log in again to submit a review.");
      return;
    }
    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await submitReview(pageCollection, listingId, currentUser.uid, reviewerName, rating, comment);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      if (message.toLowerCase().includes("permission")) {
        setError(
          "Could not save your review — this listing may not be fully published yet. Please try another listing, or ask an admin to import/publish it first."
        );
      } else {
        setError("Could not save your review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewUid: string) {
    setDeletingId(reviewUid);
    try {
      await deleteReview(pageCollection, listingId, reviewUid);
      if (reviewUid === uid) {
        setRating(0);
        setComment("");
        setPrefilled(false);
      }
    } catch (e) {
      console.error(e);
      setError("Could not delete this review. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Reviews</h3>
            <p style={{ margin: "2px 0 0", fontSize: ".85rem", color: "#666" }}>{listingName}</p>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {!isAdmin && !checkingAuth && (
          <div style={formBoxStyle}>
            {uid ? (
              <>
                <div style={{ fontSize: ".82rem", fontWeight: 600, marginBottom: 6 }}>
                  {myReview ? "Edit your review" : "Write a review"}
                </div>
                <StarRating value={rating} interactive size={22} onChange={setRating} />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience (optional)"
                  style={textareaStyle}
                />
                <button onClick={handleSubmit} disabled={submitting} style={submitBtnStyle}>
                  {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
                </button>
              </>
            ) : (
              <p style={{ fontSize: ".85rem", color: "#555", margin: 0 }}>
                <Link href="/login" style={{ color: "#1a5c38", fontWeight: 600 }}>
                  Log in
                </Link>{" "}
                to write a review.
              </p>
            )}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: ".82rem", fontWeight: 600, marginBottom: 8 }}>
            {loading ? "Loading reviews…" : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
          </div>

          {!loading && reviews.length === 0 && (
            <p style={{ fontSize: ".85rem", color: "#888" }}>No reviews yet. Be the first!</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
            {reviews.map((r) => (
              <div key={r.id} style={reviewRowStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{r.userName}</div>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: ".72rem", color: "#999" }}>{formatDate(r.createdAt)}</span>
                    {(isAdmin || r.id === uid) && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        style={deleteBtnStyle}
                      >
                        {deletingId === r.id ? "…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
                {r.comment && <p style={{ margin: "6px 0 0", fontSize: ".85rem", color: "#333" }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── inline styles (kept local so this drops into any page without a shared stylesheet) ── */
const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9000,
  padding: 16,
};
const boxStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: "20px 22px",
  maxWidth: 440,
  width: "100%",
  maxHeight: "85vh",
  overflowY: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,.18)",
};
const closeBtnStyle: CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: "1.1rem",
  color: "#666",
};
const formBoxStyle: CSSProperties = {
  background: "#f7faf8",
  border: "1px solid #e3ede6",
  borderRadius: 10,
  padding: 12,
};
const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 64,
  marginTop: 8,
  marginBottom: 8,
  padding: 8,
  borderRadius: 8,
  border: "1px solid #dce8e0",
  fontSize: ".85rem",
  resize: "vertical",
  fontFamily: "inherit",
};
const submitBtnStyle: CSSProperties = {
  background: "#1a5c38",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: ".82rem",
  fontWeight: 600,
  cursor: "pointer",
};
const reviewRowStyle: CSSProperties = {
  borderBottom: "1px solid #f0f4f0",
  paddingBottom: 8,
};
const deleteBtnStyle: CSSProperties = {
  border: "1px solid #e74c3c",
  background: "#fff",
  color: "#e74c3c",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: ".72rem",
  cursor: "pointer",
};
const errorStyle: CSSProperties = {
  background: "#fdecea",
  color: "#c0392b",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: ".8rem",
  marginBottom: 10,
};