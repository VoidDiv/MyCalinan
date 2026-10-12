/* ============================================================
   FILE: components/OperatingHoursEditor.tsx
   Form control for setting a business's days open and hours.
   Used in Business Registration (Step 2) and on the Profile page
   ("Edit hours"). Later also in Admin > Listings.

   - "Open 24 hours, every day" switch
   - Quick picks: Mon–Fri, Mon–Sat, Every day
   - "Use Monday's times for all open days" so owners only type once
   - A closing time earlier than the opening time = closes after midnight
   ============================================================ */

"use client";

import type { CSSProperties } from "react";
import {
  DAY_KEYS,
  DAY_LABELS,
  MAX_NOTE_LENGTH,
  toMinutes,
  type DayHours,
  type DayKey,
  type OperatingHours,
} from "@/lib/OperatingHours";

interface Props {
  value: OperatingHours;
  onChange: (next: OperatingHours) => void;
  disabled?: boolean;
}

const PRESETS: { label: string; days: DayKey[] }[] = [
  { label: "Mon–Fri", days: ["mon", "tue", "wed", "thu", "fri"] },
  { label: "Mon–Sat", days: ["mon", "tue", "wed", "thu", "fri", "sat"] },
  { label: "Every day", days: [...DAY_KEYS] },
];

const styles: Record<string, CSSProperties> = {
  box: {
    border: "1px solid #dce8e0",
    borderRadius: 10,
    padding: 14,
    background: "#fbfdfc",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: ".9rem",
    fontWeight: 600,
    color: "#1a3a2a",
    cursor: "pointer",
  },
  presetRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    fontSize: ".78rem",
    color: "#4a5a50",
  },
  presetBtn: {
    border: "1px solid #cfe3d6",
    background: "#eef6f0",
    color: "#1a5c38",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: ".78rem",
    cursor: "pointer",
  },
  dayRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: "6px 0",
    borderTop: "1px solid #eef3f0",
  },
  dayLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 120,
    fontSize: ".88rem",
    color: "#1a3a2a",
    cursor: "pointer",
  },
  timeInput: {
    border: "1px solid #cfdcd4",
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: ".85rem",
    background: "#fff",
  },
  muted: { fontSize: ".82rem", color: "#7a8a80" },
  hint: { fontSize: ".75rem", color: "#8a5300" },
  noteInput: {
    width: "100%",
    border: "1px solid #cfdcd4",
    borderRadius: 6,
    padding: "7px 9px",
    fontSize: ".85rem",
    marginTop: 4,
  },
};

export default function OperatingHoursEditor({ value, onChange, disabled = false }: Props) {
  function setDay(key: DayKey, patch: Partial<DayHours>) {
    onChange({ ...value, days: { ...value.days, [key]: { ...value.days[key], ...patch } } });
  }

  function applyPreset(days: DayKey[]) {
    const next = { ...value.days };
    for (const key of DAY_KEYS) next[key] = { ...next[key], open: days.includes(key) };
    onChange({ ...value, alwaysOpen: false, days: next });
  }

  const firstOpen = DAY_KEYS.find((k) => value.days[k].open);

  function copyFirstOpenTimes() {
    if (!firstOpen) return;
    const { from, to } = value.days[firstOpen];
    const next = { ...value.days };
    for (const key of DAY_KEYS) {
      if (next[key].open) next[key] = { ...next[key], from, to };
    }
    onChange({ ...value, days: next });
  }

  return (
    <div style={styles.box}>
      <label style={styles.checkLabel}>
        <input
          type="checkbox"
          checked={value.alwaysOpen}
          onChange={(e) => onChange({ ...value, alwaysOpen: e.target.checked })}
          disabled={disabled}
        />
        Open 24 hours, every day
      </label>

      {!value.alwaysOpen && (
        <>
          <div style={styles.presetRow}>
            <span>Quick pick:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                style={styles.presetBtn}
                onClick={() => applyPreset(p.days)}
                disabled={disabled}
              >
                {p.label}
              </button>
            ))}
            {firstOpen && (
              <button
                type="button"
                style={styles.presetBtn}
                onClick={copyFirstOpenTimes}
                disabled={disabled}
              >
                Use {DAY_LABELS[firstOpen]}&rsquo;s times for all open days
              </button>
            )}
          </div>

          {DAY_KEYS.map((key) => {
            const day = value.days[key];
            const overnight =
              day.open && day.from !== day.to && toMinutes(day.to) < toMinutes(day.from);

            return (
              <div key={key} style={styles.dayRow}>
                <label style={styles.dayLabel}>
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(e) => setDay(key, { open: e.target.checked })}
                    disabled={disabled}
                  />
                  {DAY_LABELS[key]}
                </label>

                {day.open ? (
                  <>
                    <input
                      type="time"
                      style={styles.timeInput}
                      value={day.from}
                      onChange={(e) => setDay(key, { from: e.target.value })}
                      aria-label={`${DAY_LABELS[key]} opening time`}
                      disabled={disabled}
                    />
                    <span style={styles.muted}>to</span>
                    <input
                      type="time"
                      style={styles.timeInput}
                      value={day.to}
                      onChange={(e) => setDay(key, { to: e.target.value })}
                      aria-label={`${DAY_LABELS[key]} closing time`}
                      disabled={disabled}
                    />
                    {overnight && <span style={styles.hint}>closes after midnight</span>}
                  </>
                ) : (
                  <span style={styles.muted}>Closed</span>
                )}
              </div>
            );
          })}
        </>
      )}

      <div>
        <label style={{ fontSize: ".82rem", color: "#4a5a50" }}>Note (optional)</label>
        <input
          type="text"
          style={styles.noteInput}
          value={value.note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="e.g. Closed on holidays · Lunch break 12–1 PM"
          disabled={disabled}
        />
      </div>
    </div>
  );
}