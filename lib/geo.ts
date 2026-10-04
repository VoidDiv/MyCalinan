/* ============================================================
   FILE: lib/geo.ts   (NEW)
   Small map-maths helpers shared by the Barangay Map.
   (Pure functions: no browser, no Mapbox, easy to test.)
   ============================================================ */

import type { Feature, Polygon } from "geojson";

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance between two points, in METERS. */
export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "850 m" / "1.2 km" */
export function formatMeters(m: number): string {
  if (!Number.isFinite(m)) return "";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** "5 min" / "1h 5m" */
export function formatMinutes(mins: number): string {
  const m = Math.max(1, Math.round(mins));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** A circle on the earth (center + radius in meters) as a GeoJSON polygon — used to draw the GPS "±accuracy" circle. */
export function circlePolygon(
  lat: number,
  lng: number,
  radiusM: number,
  steps = 64
): Feature<Polygon> {
  const ring: [number, number][] = [];
  const latRad = toRad(lat);
  const dLat = radiusM / EARTH_RADIUS_M;
  const dLng = radiusM / (EARTH_RADIUS_M * Math.cos(latRad));

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([lng + (dLng * Math.cos(angle) * 180) / Math.PI, lat + (dLat * Math.sin(angle) * 180) / Math.PI]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

/** Davao City area. A pin outside this box is almost certainly a typo (swapped lat/lng, missing minus ...). */
export const DAVAO_BOUNDS = { minLat: 6.9, maxLat: 7.7, minLng: 125.2, maxLng: 125.75 };

export function isInDavao(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= DAVAO_BOUNDS.minLat &&
    lat <= DAVAO_BOUNDS.maxLat &&
    lng >= DAVAO_BOUNDS.minLng &&
    lng <= DAVAO_BOUNDS.maxLng
  );
}