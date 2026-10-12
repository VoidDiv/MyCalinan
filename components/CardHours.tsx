/* ============================================================
   FILE: components/CardHours.tsx   (NEW FILE)
   The operating-hours block on an Explore card:
   - live badge ("Open · closes 5:00 PM", "Closing soon", "Closed · opens …")
   - tap-to-open "Opening hours" list for the whole week
   Renders nothing when the listing has no hours, so cards without
   hours look the same as before.
   ============================================================ */

"use client";

import type { OperatingHours } from "@/lib/OperatingHours";
import { HoursTable, OpenStatusBadge } from "@/components/OperatingHoursDisplay";

export default function CardHours({
  hours,
  accent = "#2b6b45",
}: {
  hours: OperatingHours | null;
  /** colour of the "Opening hours" link — use the page's accent colour */
  accent?: string;
}) {
  if (!hours) return null;

  return (
    <div style={{ margin: "8px 0 2px" }}>
      <OpenStatusBadge hours={hours} />
      <details style={{ marginTop: 6, fontSize: ".78rem" }}>
        <summary style={{ cursor: "pointer", color: accent, fontWeight: 600 }}>
          Opening hours
        </summary>
        <div style={{ marginTop: 6 }}>
          <HoursTable hours={hours} />
        </div>
      </details>
    </div>
  );
}