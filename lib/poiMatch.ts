/* ============================================================
   FILE: lib/poiMatch.ts   (NEW)
   Matches one of YOUR places to the place Mapbox draws on its own map.

   Why: the pins in the database were typed in by hand and are often 100-500 m
   away from the real building. Mapbox's map already draws every place at the
   right spot, so we find "the same place" on Mapbox's map (by name) and measure
   how far apart the two are.

   Pure functions: no browser, no Mapbox, easy to test.
   ============================================================ */

import { metersBetween } from "./geo";

/** A place as drawn on the Mapbox map (its icon + label). */
export interface MapPoi {
  /** The names Mapbox has for it (local name and English name). */
  names: string[];
  lat: number;
  lng: number;
}

export interface PoiMatch {
  poi: MapPoi;
  /** 0..1 — how alike the two names are */
  score: number;
  /** meters between YOUR pin and Mapbox's icon */
  distanceM: number;
  /** the Mapbox name that matched best */
  matchedName: string;
}

/** Words that say nothing about WHICH place it is. */
const STOP_WORDS = new Set([
  "the", "of", "and", "at", "in", "inc", "corp", "corporation", "co", "ltd", "branch", "main",
  "calinan", "davao", "city", "poblacion", "district",
]);

/** Different words for the same kind of place. */
const SYNONYMS: Record<string, string> = { parish: "church", chapel: "church" };

/** "Lt. C. Villafuerte Sr." → ["lt", "c", "villafuerte", "sr"] */
export function nameTokens(name: string): string[] {
  const all = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // é → e
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((t) => SYNONYMS[t] ?? t);
  const meaningful = all.filter((t) => !STOP_WORDS.has(t));
  return meaningful.length > 0 ? meaningful : all;
}

/** Same word, or an initial for it ("c" ~ "cipriano"). */
function sameToken(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length === 1 && b.startsWith(a)) return true;
  if (b.length === 1 && a.startsWith(b)) return true;
  return false;
}

/** 0 (nothing alike) … 1 (same name). Handles extra words ("Chicken House"), initials and punctuation. */
export function nameScore(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const free = [...tb];
  let matched = 0;
  for (const t of ta) {
    const i = free.findIndex((u) => sameToken(t, u));
    if (i >= 0) {
      matched += 1;
      free.splice(i, 1);
    }
  }
  if (matched === 0) return 0;

  const smaller = Math.min(ta.length, tb.length);
  const jaccard = matched / (ta.length + tb.length - matched);
  const containment = matched / smaller;
  // ALL words of the shorter name appear in the longer one ("Nam Manok" in "Nam Manok Chicken House"):
  // strong for 2+ words, weaker for a single word. Partly overlapping names ("Holy Cross College" vs
  // "Holy Cross Academy") only get the plain overlap score, so they do NOT count as the same place.
  const contained = containment === 1 ? (smaller >= 2 ? 0.9 : 0.7) : 0;
  return Math.max(jaccard, contained);
}

export const MIN_NAME_SCORE = 0.6;

/**
 * The Mapbox places that are "the same place" as `placeName`, best first.
 * Only places within `maxDistanceM` of the pin count (a pin that is 5 km off is a typo, not a match).
 */
export function findPoiMatches(
  placeName: string,
  pin: { lat: number; lng: number },
  pois: MapPoi[],
  maxDistanceM = 900
): PoiMatch[] {
  const out: PoiMatch[] = [];
  for (const poi of pois) {
    const distanceM = metersBetween(pin.lat, pin.lng, poi.lat, poi.lng);
    if (distanceM > maxDistanceM) continue;

    let best = 0;
    let bestName = "";
    for (const n of poi.names) {
      const s = nameScore(placeName, n);
      if (s > best) {
        best = s;
        bestName = n;
      }
    }
    if (best >= MIN_NAME_SCORE) out.push({ poi, score: best, distanceM, matchedName: bestName });
  }
  // better name first; between equal names, the closer one
  out.sort((x, y) => (Math.abs(y.score - x.score) > 0.05 ? y.score - x.score : x.distanceM - y.distanceM));
  return out;
}

/** An icon within this many meters of the pin counts as "the pin is right". */
export const PIN_OK_WITHIN_M = 35;

export type PinStatus = "ok" | "off" | "none";

export interface PinAudit {
  status: PinStatus;
  /** meters between the saved pin and Mapbox's icon (null when Mapbox has no such place) */
  offsetM: number | null;
  suggestion: { lat: number; lng: number; name: string } | null;
}

export function auditPin(
  placeName: string,
  pin: { lat: number; lng: number },
  pois: MapPoi[],
  maxDistanceM = 900
): PinAudit {
  const best = findPoiMatches(placeName, pin, pois, maxDistanceM)[0];
  if (!best) return { status: "none", offsetM: null, suggestion: null };
  return {
    status: best.distanceM <= PIN_OK_WITHIN_M ? "ok" : "off",
    offsetM: best.distanceM,
    suggestion: { lat: best.poi.lat, lng: best.poi.lng, name: best.matchedName },
  };
}