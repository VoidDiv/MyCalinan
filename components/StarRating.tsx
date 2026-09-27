/* ============================================================
   FILE: components/StarRating.tsx   (NEW)
   Read-only star display (rounds to the nearest whole star) or
   an interactive 1-5 star picker, depending on `interactive`.
   Used by every Explore page's cards and by ReviewsModal.
   ============================================================ */

"use client";

export interface StarRatingProps {
  /** 0-5, may be fractional for display (rounded to the nearest whole star). */
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export default function StarRating({
  value,
  size = 16,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {stars.map((s) => {
        const filled = s <= Math.round(value);
        return (
          <span
            key={s}
            onClick={interactive ? () => onChange?.(s) : undefined}
            style={{
              cursor: interactive ? "pointer" : "default",
              fontSize: size,
              lineHeight: 1,
              color: filled ? "#f5a623" : "#d9d9d9",
              userSelect: "none",
            }}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `${s} star${s > 1 ? "s" : ""}` : undefined}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}