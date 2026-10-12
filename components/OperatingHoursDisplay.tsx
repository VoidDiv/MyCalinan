/* ============================================================
   FILE: components/OperatingHoursDisplay.tsx
   Read-only views of a schedule:
   - <OpenStatusBadge hours={…} />  →  "Open · closes 9:00 PM"
     (updates itself every minute, always in Philippine time)
   - <HoursTable hours={…} />       →  Mon–Fri 8:00 AM – 5:00 PM, …
   Used on the Profile page now, and on the Explore cards next.
   ============================================================ */

"use client";

import { useEffect, useState } from "react";
import {
  getOpenStatus,
  summarizeHours,
  type OpenState,
  type OpenStatus,
  type OperatingHours,
} from "@/lib/OperatingHours";

const BADGE_COLORS: Record<OpenState, { bg: string; fg: string; dot: string }> = {
  open: { bg: "#e6f4ea", fg: "#1a5c38", dot: "#2e8b57" },
  "closing-soon": { bg: "#fff4e0", fg: "#8a5300", dot: "#e69500" },
  closed: { bg: "#fdecea", fg: "#a12a1f", dot: "#d64535" },
  unknown: { bg: "#f1f3f2", fg: "#5d6b63", dot: "#a0aaa4" },
};

/* Worked out after mount (not during server render) so the server's clock
   can't cause a hydration mismatch, then refreshed every minute. */
function useOpenStatus(hours: OperatingHours | null | undefined): OpenStatus | null {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(getOpenStatus(hours));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  return status;
}

export function OpenStatusBadge({
  hours,
  hideUnknown = false,
}: {
  hours: OperatingHours | null | undefined;
  /** don't render anything when the place has no hours on file */
  hideUnknown?: boolean;
}) {
  const status = useOpenStatus(hours);
  if (!status) return null;
  if (hideUnknown && status.state === "unknown") return null;

  const c = BADGE_COLORS[status.state];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: ".75rem",
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }}
      />
      {status.label}
    </span>
  );
}

export function HoursTable({ hours }: { hours: OperatingHours | null | undefined }) {
  const lines = summarizeHours(hours);

  if (lines.length === 0) {
    return <p style={{ fontSize: ".85rem", color: "#7a8a80", margin: 0 }}>Hours not listed yet.</p>;
  }

  return (
    <div>
      <table style={{ borderCollapse: "collapse", fontSize: ".85rem" }}>
        <tbody>
          {lines.map((line) => (
            <tr key={line.days}>
              <td style={{ padding: "2px 16px 2px 0", color: "#4a5a50", whiteSpace: "nowrap" }}>
                {line.days}
              </td>
              <td
                style={{
                  padding: "2px 0",
                  color: line.hours === "Closed" ? "#a12a1f" : "#1a3a2a",
                  fontWeight: 500,
                }}
              >
                {line.hours}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hours?.note && (
        <p style={{ fontSize: ".8rem", color: "#5d6b63", margin: "6px 0 0" }}>{hours.note}</p>
      )}
    </div>
  );
}