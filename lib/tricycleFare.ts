/* ============================================================
   FILE: lib/tricycleFare.ts
   Shared, editable-in-one-place tricycle fare estimate for the
   Calinan area. These are MINIMUM estimated fares only — actual
   drivers may charge more depending on distance, time of day,
   traffic, or negotiation. Update the two numbers below and every
   Explore page + the Barangay Map picks up the change.
   ============================================================ */

export const TRICYCLE_FARE = {
  /** Regular adult minimum fare, in pesos. */
  regular: 15,
  /** Discounted minimum fare for students, PWD, and senior citizens, in pesos. */
  discounted: 10,
} as const;

/** Short label for inline display, e.g. next to road distance / travel time. */
export const TRICYCLE_FARE_LABEL = `₱${TRICYCLE_FARE.regular} regular · ₱${TRICYCLE_FARE.discounted} student/PWD/senior`;

/** Longer note clarifying these are minimums, not exact fares. */
export const TRICYCLE_FARE_NOTE =
  "Estimated minimum fare within Calinan only — actual fare may vary.";