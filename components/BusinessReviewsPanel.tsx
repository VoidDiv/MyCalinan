"use client";

import { useState } from "react";
import StarRating from "./StarRating";
import { useBusinessReviews } from "@/lib/reviews";

export default function BusinessReviewsPanel({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const { reviews, summary, loading } = useBusinessReviews(open ? businessId : null);

  return (
    <div className="mt-2 rounded-lg border border-canopy-100 bg-canopy-50/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-ink-900"
      >
        <span className="flex items-center gap-2">
          <i className="fas fa-star text-durian-500" /> Customer Reviews
          {summary && summary.ratingCount > 0 && (
            <span className="font-normal text-ink-700">
              &middot; {summary.ratingAvg.toFixed(1)} ({summary.ratingCount})
            </span>
          )}
        </span>
        <i className={`fas fa-chevron-${open ? "up" : "down"} text-xs text-ink-500`} />
      </button>

      {open && (
        <div className="mt-3">
          {loading && <p className="text-xs text-ink-600">Loading reviews…</p>}

          {!loading && summary && !summary.listingFound && (
            <p className="text-xs text-ink-600">
              This business isn&apos;t published on Explore yet, so it has no reviews.
            </p>
          )}

          {!loading && summary?.listingFound && reviews.length === 0 && (
            <p className="text-xs text-ink-600">No reviews yet.</p>
          )}

          {!loading && reviews.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-canopy-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-900">{r.userName}</span>
                    <StarRating value={r.rating} size={12} />
                  </div>
                  {r.comment && <p className="mt-1 text-xs text-ink-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}