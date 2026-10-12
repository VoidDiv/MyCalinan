/* ============================================================
   FILE: lib/operatingHours.ts
   Operating hours (days open + opening/closing times) for businesses
   and Explore listings. Pure TypeScript — safe to import on both the
   client (forms, badges) and the server (API routes).

   Stored in Firestore as:
     operatingHours: {
       alwaysOpen: boolean,                 // open 24 hours, every day
       days: { mon: { open, from, to }, … sun: { … } },  // "HH:MM", 24-hour
       note: string                         // e.g. "Closed on holidays"
     }

   - A closing time EARLIER than the opening time means the business
     closes after midnight (e.g. a bar open 18:00 → 02:00).
   - "Open now" is always worked out in Philippine time (Asia/Manila),
     no matter what timezone the visitor's phone is set to.
   ============================================================ */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_SHORT: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export interface DayHours {
  open: boolean;
  from: string; // "HH:MM", 24-hour
  to: string; // "HH:MM", 24-hour
}

export interface OperatingHours {
  alwaysOpen: boolean;
  days: Record<DayKey, DayHours>;
  note: string;
}

export const HOURS_TIMEZONE = "Asia/Manila";
export const MAX_NOTE_LENGTH = 120;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_FROM = "08:00";
const DEFAULT_TO = "17:00";

/** A blank schedule: every day closed, times pre-filled so ticking a day is one click. */
export function emptyHours(): OperatingHours {
  const days = {} as Record<DayKey, DayHours>;
  for (const key of DAY_KEYS) days[key] = { open: false, from: DEFAULT_FROM, to: DEFAULT_TO };
  return { alwaysOpen: false, days, note: "" };
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "13:30" → "1:30 PM" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(day: DayHours): string {
  return `${formatTime12(day.from)} – ${formatTime12(day.to)}`;
}

/** True when the schedule says anything at all (24/7 or at least one open day). */
export function hasAnyHours(hours: OperatingHours | null | undefined): hours is OperatingHours {
  if (!hours) return false;
  return hours.alwaysOpen || DAY_KEYS.some((k) => hours.days[k].open);
}

/** Returns an error message, or "" when the schedule is valid. */
export function validateHours(hours: OperatingHours): string {
  if (hours.note.length > MAX_NOTE_LENGTH) {
    return `The hours note can be at most ${MAX_NOTE_LENGTH} characters.`;
  }
  if (hours.alwaysOpen) return "";

  const openDays = DAY_KEYS.filter((k) => hours.days[k].open);
  if (openDays.length === 0) {
    return 'Please tick at least one day your business is open, or choose "Open 24 hours, every day".';
  }
  for (const key of openDays) {
    const day = hours.days[key];
    if (!TIME_RE.test(day.from) || !TIME_RE.test(day.to)) {
      return `Please enter both the opening and closing time for ${DAY_LABELS[key]}.`;
    }
    if (day.from === day.to) {
      return `The opening and closing time for ${DAY_LABELS[key]} can't be the same. If you never close, choose "Open 24 hours, every day".`;
    }
  }
  return "";
}

/**
 * Turns whatever is stored in Firestore (or sent to an API) into a clean
 * OperatingHours object. Returns null when there are no hours at all.
 */
export function sanitizeHours(raw: unknown): OperatingHours | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rawDays =
    r.days && typeof r.days === "object" ? (r.days as Record<string, unknown>) : {};

  const result = emptyHours();
  result.alwaysOpen = r.alwaysOpen === true;
  result.note = typeof r.note === "string" ? r.note.trim().slice(0, MAX_NOTE_LENGTH) : "";

  for (const key of DAY_KEYS) {
    const d = rawDays[key];
    if (!d || typeof d !== "object") continue;
    const day = d as Record<string, unknown>;
    result.days[key] = {
      open: day.open === true,
      from: typeof day.from === "string" && TIME_RE.test(day.from) ? day.from : DEFAULT_FROM,
      to: typeof day.to === "string" && TIME_RE.test(day.to) ? day.to : DEFAULT_TO,
    };
  }

  return hasAnyHours(result) ? result : null;
}

/* ── "Open now" ───────────────────────────────────────────── */

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/** The current day and minute-of-day in Philippine time. */
export function manilaNow(date: Date = new Date()): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HOURS_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24; // some engines print "24" at midnight
  const minute = Number(get("minute"));

  return { day: WEEKDAY_TO_KEY[get("weekday")] ?? "mon", minutes: hour * 60 + minute };
}

export type OpenState = "open" | "closing-soon" | "closed" | "unknown";

export interface OpenStatus {
  state: OpenState;
  label: string;
}

const CLOSING_SOON_MINUTES = 60;

function isOvernight(day: DayHours): boolean {
  return toMinutes(day.to) <= toMinutes(day.from);
}

function openUntil(nowMinutes: number, closeAtMinutes: number, closeTime: string): OpenStatus {
  if (closeAtMinutes - nowMinutes <= CLOSING_SOON_MINUTES) {
    return { state: "closing-soon", label: `Closing soon · ${formatTime12(closeTime)}` };
  }
  return { state: "open", label: `Open · closes ${formatTime12(closeTime)}` };
}

export function getOpenStatus(
  hours: OperatingHours | null | undefined,
  date: Date = new Date()
): OpenStatus {
  if (!hasAnyHours(hours)) return { state: "unknown", label: "Hours not listed" };
  if (hours.alwaysOpen) return { state: "open", label: "Open 24 hours" };

  const { day, minutes } = manilaNow(date);
  const idx = DAY_KEYS.indexOf(day);
  const today = hours.days[day];
  const yesterday = hours.days[DAY_KEYS[(idx + 6) % 7]];

  // 1. Still inside last night's shift that runs past midnight?
  if (yesterday.open && isOvernight(yesterday) && minutes < toMinutes(yesterday.to)) {
    return openUntil(minutes, toMinutes(yesterday.to), yesterday.to);
  }

  // 2. Inside today's shift?
  if (today.open) {
    const from = toMinutes(today.from);
    const to = toMinutes(today.to);
    if (isOvernight(today)) {
      if (minutes >= from) return openUntil(minutes, to + 24 * 60, today.to);
    } else if (minutes >= from && minutes < to) {
      return openUntil(minutes, to, today.to);
    }
  }

  // 3. Closed — find the next opening (later today, then the coming days)
  for (let offset = 0; offset < 7; offset++) {
    const key = DAY_KEYS[(idx + offset) % 7];
    const d = hours.days[key];
    if (!d.open) continue;
    if (offset === 0 && toMinutes(d.from) <= minutes) continue;

    const when = offset === 0 ? "" : offset === 1 ? " tomorrow" : ` ${DAY_SHORT[key]}`;
    return { state: "closed", label: `Closed · opens ${formatTime12(d.from)}${when}` };
  }

  // Only open on this same weekday, and today's opening has already passed
  if (today.open) {
    return {
      state: "closed",
      label: `Closed · opens ${formatTime12(today.from)} next ${DAY_SHORT[day]}`,
    };
  }
  return { state: "closed", label: "Closed" };
}

/* ── Weekly summary ──────────────────────────────────────── */

export interface HoursLine {
  days: string;
  hours: string;
}

/**
 * Groups consecutive days with the same hours:
 *   Mon–Fri  8:00 AM – 5:00 PM
 *   Sat      8:00 AM – 12:00 PM
 *   Sun      Closed
 */
export function summarizeHours(hours: OperatingHours | null | undefined): HoursLine[] {
  if (!hasAnyHours(hours)) return [];
  if (hours.alwaysOpen) return [{ days: "Every day", hours: "Open 24 hours" }];

  const signature = (key: DayKey) => {
    const d = hours.days[key];
    return d.open ? `${d.from}-${d.to}` : "closed";
  };

  const lines: HoursLine[] = [];
  let start = 0;

  for (let i = 1; i <= DAY_KEYS.length; i++) {
    if (i < DAY_KEYS.length && signature(DAY_KEYS[i]) === signature(DAY_KEYS[start])) continue;

    const first = DAY_KEYS[start];
    const last = DAY_KEYS[i - 1];
    let days =
      start === i - 1 ? DAY_SHORT[first] : `${DAY_SHORT[first]}–${DAY_SHORT[last]}`;
    if (start === 0 && i === DAY_KEYS.length) days = "Every day";

    const d = hours.days[first];
    lines.push({ days, hours: d.open ? formatRange(d) : "Closed" });
    start = i;
  }

  return lines;
}