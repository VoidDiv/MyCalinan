/* ============================================================
   FILE: lib/gps.ts
   Cleans up the raw GPS readings so the blue dot is steady and honest.

   The browser sends a new reading every second or so. Raw readings are noisy:
   - the first one is often a rough guess from Wi-Fi / the network (±100 m to ±several km)
   - a stationary person's dot jumps around by the amount of the error
   - now and then a very bad reading arrives (a "teleport")

   GpsFilter decides, for every reading: keep it, or ignore it.
   It also says how GOOD the position is, so the screen can tell the visitor
   ("±12 m — precise" or "±800 m — approximate").
   ============================================================ */

import { metersBetween } from "./geo";

export interface GpsFix {
  lat: number;
  lng: number;
  /** Radius of uncertainty in meters (smaller = better). */
  accuracy: number;
  /** When the reading was taken (milliseconds). */
  at: number;
}

export type GpsQuality = "precise" | "good" | "fair" | "approximate";

export interface GpsDecision {
  /** true = this reading replaced the current position */
  accepted: boolean;
  /** the position to show (the new one if accepted, otherwise the previous one) */
  fix: GpsFix;
  quality: GpsQuality;
}

export interface GpsFilterOptions {
  /** For this long after the first reading, keep looking for a better one. */
  warmupMs: number;
  /** An accuracy at or below this ends the warm-up early. */
  goodAccuracyM: number;
  /** After warm-up, readings worse than this are ignored (unless nothing better arrives). */
  maxAcceptedAccuracyM: number;
  /** If no trustworthy reading was seen for this long, accept the next one whatever its accuracy. */
  staleAfterMs: number;
  /** Faster than this (m/s) with a poor accuracy = a "teleport" and is ignored. 55 m/s = ~200 km/h. */
  maxSpeedMps: number;
}

export const DEFAULT_GPS_OPTIONS: GpsFilterOptions = {
  warmupMs: 6000,
  goodAccuracyM: 30,
  maxAcceptedAccuracyM: 150,
  staleAfterMs: 20000,
  maxSpeedMps: 55,
};

export function gpsQuality(accuracyM: number): GpsQuality {
  if (accuracyM <= 20) return "precise";
  if (accuracyM <= 60) return "good";
  if (accuracyM <= 200) return "fair";
  return "approximate";
}

export function isValidFix(f: Partial<GpsFix> | null | undefined): f is GpsFix {
  return (
    !!f &&
    typeof f.lat === "number" &&
    typeof f.lng === "number" &&
    typeof f.accuracy === "number" &&
    typeof f.at === "number" &&
    Number.isFinite(f.lat) &&
    Number.isFinite(f.lng) &&
    Math.abs(f.lat) <= 90 &&
    Math.abs(f.lng) <= 180 &&
    !(f.lat === 0 && f.lng === 0) &&
    Number.isFinite(f.accuracy) &&
    f.accuracy > 0
  );
}

export class GpsFilter {
  private current: GpsFix | null = null;
  private firstAt = 0;
  /** Last time a reading agreed with (or replaced) the current position. */
  private lastConfirmedAt = 0;

  constructor(private readonly options: GpsFilterOptions = DEFAULT_GPS_OPTIONS) {}

  get position(): GpsFix | null {
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.firstAt = 0;
    this.lastConfirmedAt = 0;
  }

  /** Feed one raw reading. Returns what to do with it, or null if the reading is unusable. */
  push(raw: GpsFix): GpsDecision | null {
    if (!isValidFix(raw)) return null;
    const o = this.options;

    // 1) the very first reading is always shown (something is better than nothing)
    if (!this.current) {
      this.current = raw;
      this.firstAt = raw.at;
      this.lastConfirmedAt = raw.at;
      return { accepted: true, fix: raw, quality: gpsQuality(raw.accuracy) };
    }

    const cur = this.current;
    const dist = metersBetween(cur.lat, cur.lng, raw.lat, raw.lng);
    const dt = Math.max(1, (raw.at - cur.at) / 1000);
    const warming = raw.at - this.firstAt < o.warmupMs && cur.accuracy > o.goodAccuracyM;
    const stale = raw.at - this.lastConfirmedAt > o.staleAfterMs;
    const betterByALot = raw.accuracy < cur.accuracy * 0.7;

    let accept: boolean;
    let confirms = false; // true when an ignored reading still agrees with where we think you are

    if (warming) {
      // still looking for the best fix: only a more precise reading replaces the current one
      accept = raw.accuracy < cur.accuracy;
    } else if (stale) {
      accept = true; // never freeze on an old position
    } else if (dist / dt > o.maxSpeedMps && raw.accuracy > 50 && !betterByALot) {
      accept = false; // impossible jump, from a worse reading → ignore
    } else if (raw.accuracy > o.maxAcceptedAccuracyM && raw.accuracy > cur.accuracy * 1.5) {
      accept = false; // a much worse reading than what we already have
    } else {
      // Standing still? Then ignore tiny wobbles (smaller than the error itself) so the dot stays put.
      const wobble = Math.min(Math.max(cur.accuracy, raw.accuracy) * 0.3, 25);
      accept = dist >= wobble || betterByALot;
      confirms = !accept; // a wobble = the reading agrees with the current position
    }

    if (confirms) this.lastConfirmedAt = raw.at;

    if (accept) {
      this.current = raw;
      this.lastConfirmedAt = raw.at;
      return { accepted: true, fix: raw, quality: gpsQuality(raw.accuracy) };
    }

    // Ignored: keep the position, but remember if this reading is more precise
    if (raw.accuracy < cur.accuracy && dist < cur.accuracy) {
      this.current = { ...cur, accuracy: raw.accuracy };
      return { accepted: false, fix: this.current, quality: gpsQuality(raw.accuracy) };
    }
    return { accepted: false, fix: cur, quality: gpsQuality(cur.accuracy) };
  }
}