'use client';

import { useEffect, useMemo, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/Firebase';
import { useExploreListings } from '@/hooks/useLiveListings';
import { PAGE_COLLECTION, type ExplorePage } from '@/types/listing';
import { GpsFilter, type GpsQuality } from '@/lib/gps';
import { circlePolygon, formatMeters, formatMinutes, isInDavao, metersBetween } from '@/lib/geo';
import { auditPin, PIN_OK_WITHIN_M, type MapPoi, type PinAudit } from '@/lib/poiMatch';
import { TRICYCLE_FARE_LABEL, TRICYCLE_FARE_NOTE } from '@/lib/tricycleFare';

/* ============================================================
   BARANGAY MAP  (accuracy update)

   What is new in this version
   1. GPS: the blue dot now has a "±accuracy" circle, readings are cleaned by
      lib/gps.ts (no more jumping dot or rough first guess stuck on screen), and
      the sidebar says honestly how precise your position is.
   2. Routes: shows distance, time and tricycle fare; draws a dashed line when
      your position or the pin is not exactly on a road (so a pin that is a
      little off the road is visible, not hidden); a slow answer can no longer
      overwrite a newer route; clear messages when Mapbox cannot route.
   3. Emergency buttons: the "nearest" hospital / police / fire station is now
      chosen by DRIVING time (Mapbox Matrix), not by straight-line distance.
   4. The map is locked north-up and flat (no accidental rotating or tilting).
   5. Admin only: "Fix pin positions" — the easy way to put a pin on the right spot:
        - choose a place (search) -> the map zooms to it with a BIG pin, the other pins fade
        - 🛰 Satellite view: see the real roof and drop the pin right on it
        - drag the pin, OR pan the map until the crosshair is on the building and press 🎯
        - nudge buttons move it 1 / 3 / 10 meters at a time
        - Save (one place) or Save all
        - "Check all pins": the map finds every place of yours on Mapbox's own map
          (by name), measures how far your pin is from where Mapbox draws it, and
          offers to move the pin there.
        - Or drag a pin onto the real building yourself.
      Saved positions fix the pin on this map AND on every Explore page.
   ============================================================ */

// ══════════════════════════════════════════
// MAPBOX ACCESS TOKEN
// ══════════════════════════════════════════
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

// Calinan (Proper) is at about 7.1876, 125.4532.
// The old map started at 7.1648 — roughly 2.5 km SOUTH of the town — which is
// why the pins looked like they were in the wrong place.
const CALINAN_CENTER: [number, number] = [125.4532, 7.1876];

// ══════════════════════════════════════════
// PLACES COME FROM THE SAME LISTINGS AS THE EXPLORE PAGES
// (Admin > Listings > Explore). That means a pin sits on exactly the same
// coordinates as that place's "View on Map" button, and anything the admin
// adds, edits or deletes shows up here automatically.
//
// The map starts CLEAN: no place is shown until the visitor clicks one
// (in the Nearby list, a search result, the Directions list, or an
// Emergency button). Then only that one place gets its pin.
// ══════════════════════════════════════════
const SECTIONS = [
  { key: 'healthcare', label: 'Health', icon: '🏥' },
  { key: 'education', label: 'School', icon: '🎓' },
  { key: 'food', label: 'Food', icon: '🍽️' },
  { key: 'hotspots', label: 'Tourist', icon: '🌴' },
  { key: 'community', label: 'Community', icon: '🏛️' },
  { key: 'finance', label: 'Finance', icon: '🏦' },
  { key: 'transport', label: 'Transport', icon: '🚌' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️' },
  { key: 'lifestyle', label: 'Lifestyle', icon: '🏨' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type Category = 'all' | SectionKey;

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  ...(Object.fromEntries(SECTIONS.map((s) => [s.key, s.label])) as Record<SectionKey, string>),
};

interface Place {
  id: string;
  /** which Explore page it belongs to (needed to save a corrected position) */
  section: SectionKey;
  /** the Firestore document id (needed to save a corrected position) */
  docId: string;
  name: string;
  category: SectionKey;
  lat: number;
  lng: number;
  address: string;
  tag: string;
  icon: string;
}

interface PlaceWithDistance extends Place {
  /** straight-line distance from you, in meters */
  dist: number | null;
}

// The few fields we read from an Explore listing
interface ListingLike {
  docId: string;
  name?: string;
  lat?: number;
  lng?: number;
  tag?: string;
  pin?: string;
  address?: string;
}

function toPlaces(section: (typeof SECTIONS)[number], listings: unknown[]): Place[] {
  return (listings as ListingLike[])
    .filter(
      (l) =>
        l &&
        typeof l.lat === 'number' &&
        typeof l.lng === 'number' &&
        Number.isFinite(l.lat) &&
        Number.isFinite(l.lng) &&
        !(l.lat === 0 && l.lng === 0)
    )
    .map((l) => ({
      id: `${section.key}:${l.docId}`,
      section: section.key,
      docId: l.docId,
      name: l.name ?? 'Unnamed place',
      category: section.key,
      lat: l.lat as number,
      lng: l.lng as number,
      address: l.address ?? '',
      tag: l.tag ?? '',
      icon: l.pin || section.icon,
    }));
}

// Words used to find the nearest hospital / police / fire station in the listings
const EMERGENCY: Record<'hospital' | 'police' | 'fire', { label: string; match: RegExp }> = {
  hospital: { label: 'hospital', match: /hospital|medical center|medical centre/i },
  police: { label: 'police station', match: /police|pnp/i },
  fire: { label: 'fire station', match: /fire|bfp/i },
};

// Names of the map layers that this page draws on top of the Mapbox map
const ACCURACY_SRC = 'user-accuracy';
const ROUTE_SRC = 'route';
const GAPS_SRC = 'route-gaps';
const MOVE_SRC = 'pin-move';

type Lines = FeatureCollection<LineString>;
const EMPTY_LINES: Lines = { type: 'FeatureCollection', features: [] };
const EMPTY_AREAS: FeatureCollection = { type: 'FeatureCollection', features: [] };

/** The last data of each overlay layer (used to redraw them after a base-map change). */
const overlayCache = new Map<string, FeatureCollection | Feature>();

const STREETS_STYLE = 'mapbox://styles/mapbox/streets-v12';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

/** Pins within this distance of the selected pin stay visible (small) while fixing, for context. */
const NEAR_PIN_CONTEXT_M = 450;
const NUDGE_STEPS_M = [1, 3, 10] as const;

const SECTION_COLORS: Record<SectionKey, string> = {
  healthcare: '#d93025', education: '#1a73e8', food: '#e8710a', hotspots: '#188038', community: '#7b1fa2',
  finance: '#00838f', transport: '#5f6368', shopping: '#c2185b', lifestyle: '#6d4c41',
};

interface RouteSummary {
  name: string;
  distanceM: number;
  minutes: number;
  /** how far your position was from the nearest road (meters) */
  startGapM: number;
  /** how far the pin is from the nearest road (meters) */
  destGapM: number;
}

const QUALITY_TEXT: Record<GpsQuality, string> = {
  precise: 'precise',
  good: 'good',
  fair: 'fair',
  approximate: 'approximate',
};

/** How far to zoom so that the whole ±accuracy circle is comfortably visible. */
function zoomForAccuracy(accuracyM: number | null): number {
  if (accuracyM === null) return 15;
  if (accuracyM <= 30) return 17;
  if (accuracyM <= 100) return 16;
  if (accuracyM <= 300) return 15;
  if (accuracyM <= 1000) return 14;
  return 12;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Tells the visitor WHY Mapbox could not make a route (instead of a vague "No route found"). */
function routeErrorMessage(data: { code?: string; message?: string } | null | undefined): string {
  switch (data?.code) {
    case 'NoRoute':
      return 'No road connects you to that place';
    case 'NoSegment':
      return 'Could not find a road near you or near that place';
    case 'InvalidInput':
      return 'That location is not valid for directions';
    case 'ProfileNotFound':
      return 'Directions are not available right now';
    default:
      return data?.message ? `Directions error: ${data.message}` : 'Could not calculate route';
  }
}

/** Dashed straight line from A to B (used where a position is not exactly on a road). */
function dashedLine(from: [number, number], to: [number, number]): Feature<LineString> {
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [from, to] } };
}

/** Adds (once) every extra layer this page draws: GPS accuracy circle, route, dashed gaps, pin-move line. */
function addOverlays(map: mapboxgl.Map): void {
  // Switching the base map (streets <-> satellite) throws away every extra layer, so each source
  // starts with the last data it had (kept in overlayCache) instead of being empty.
  const had = (id: string, empty: FeatureCollection | Feature) => overlayCache.get(id) ?? empty;
  if (!map.getSource(ACCURACY_SRC)) map.addSource(ACCURACY_SRC, { type: 'geojson', data: had(ACCURACY_SRC, EMPTY_AREAS) });
  if (!map.getLayer('user-accuracy-fill')) {
    map.addLayer({ id: 'user-accuracy-fill', type: 'fill', source: ACCURACY_SRC, paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.13 } });
  }
  if (!map.getLayer('user-accuracy-line')) {
    map.addLayer({ id: 'user-accuracy-line', type: 'line', source: ACCURACY_SRC, paint: { 'line-color': '#1a73e8', 'line-width': 1.5, 'line-opacity': 0.5 } });
  }
  if (!map.getSource(ROUTE_SRC)) map.addSource(ROUTE_SRC, { type: 'geojson', data: had(ROUTE_SRC, EMPTY_LINES) });
  if (!map.getLayer('route')) {
    map.addLayer({
      id: 'route', type: 'line', source: ROUTE_SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#2b6b45', 'line-width': 6, 'line-opacity': 0.85 },
    });
  }
  if (!map.getSource(GAPS_SRC)) map.addSource(GAPS_SRC, { type: 'geojson', data: had(GAPS_SRC, EMPTY_LINES) });
  if (!map.getLayer('route-gaps')) {
    map.addLayer({
      id: 'route-gaps', type: 'line', source: GAPS_SRC,
      paint: { 'line-color': '#2b6b45', 'line-width': 3, 'line-opacity': 0.9, 'line-dasharray': [1.2, 1.4] },
    });
  }
  if (!map.getSource(MOVE_SRC)) map.addSource(MOVE_SRC, { type: 'geojson', data: had(MOVE_SRC, EMPTY_LINES) });
  if (!map.getLayer('pin-move')) {
    map.addLayer({
      id: 'pin-move', type: 'line', source: MOVE_SRC,
      paint: { 'line-color': '#d93025', 'line-width': 3, 'line-dasharray': [1, 1.2] },
    });
  }
}

/** Where does this map keep its "place" icons (hospitals, schools, shops ...)? */
function poiSource(map: mapboxgl.Map): { id: string; vector: boolean } | null {
  const layer = map.getStyle()?.layers?.find((l) => (l as { 'source-layer'?: string })['source-layer'] === 'poi_label');
  const id = layer && 'source' in layer && typeof layer.source === 'string' ? layer.source : map.getSource('composite') ? 'composite' : null;
  if (!id) return null;
  return { id, vector: (map.getSource(id) as { type?: string } | undefined)?.type === 'vector' };
}

/** Every place icon Mapbox has loaded for the part of the map that is on screen. */
function readMapPois(map: mapboxgl.Map): MapPoi[] {
  const src = poiSource(map);
  if (!src) return [];
  const features = map.querySourceFeatures(src.id, src.vector ? { sourceLayer: 'poi_label' } : undefined) as unknown as {
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown> | null;
  }[];
  const seen = new Set<string>();
  const out: MapPoi[] = [];
  for (const f of features) {
    if (f.geometry.type !== 'Point') continue;
    const [lng, lat] = f.geometry.coordinates as [number, number];
    const props = f.properties ?? {};
    const names = [props.name_en, props.name].filter((n): n is string => typeof n === 'string' && n.trim() !== '');
    if (names.length === 0 || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${names[0]}|${lat.toFixed(5)}|${lng.toFixed(5)}`; // the same icon appears in several tiles
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ names, lat, lng });
  }
  return out;
}

/** Waits until the map has finished drawing (so its place data is loaded), but never longer than a few seconds. */
function whenMapIdle(map: mapboxgl.Map, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      map.off('idle', finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    map.once('idle', finish);
    map.triggerRepaint();
  });
}

const AUDIT_SEARCH_RADIUS_M = 900;

function setSourceData(map: mapboxgl.Map | null, id: string, data: FeatureCollection | Feature): void {
  overlayCache.set(id, data);
  const src = map?.getSource(id) as mapboxgl.GeoJSONSource | undefined;
  src?.setData(data);
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
/* Place pin: a green teardrop with the place's emoji.
   The teardrop is an INNER element — Mapbox positions a marker by writing its own
   `transform` onto the marker element, which would wipe out a rotation set on that
   same element and leave the pin misaligned. Built with textContent so a place name
   or emoji can never inject HTML. */
function createPinElement(icon: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cursor = 'pointer';

  const drop = document.createElement('div');
  drop.style.cssText =
    'background:#2b6b45;color:#fff;font-size:16px;width:36px;height:36px;' +
    'border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;' +
    'align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);' +
    'border:2px solid #fff;';

  const emoji = document.createElement('span');
  emoji.style.transform = 'rotate(45deg)';
  emoji.textContent = icon;

  drop.appendChild(emoji);
  el.appendChild(drop);
  return el;
}

/* The pins used ONLY in "Fix pin positions" mode (all draggable).
   - 'selected': a BIG ring with a crosshair; its CENTER is the exact spot, and the ring is see-through
                 so (on the satellite view) you can see the roof under it
   - 'near':     a small dot (other places close to the selected one, for context)
   - 'far':      a tiny faint dot (still there when you zoom out, and still clickable)
   - 'hidden':   not shown ("Hide other pins")
   The marker's own box keeps a fixed center, so the coordinate never shifts when the look changes. */
type PinLook = 'selected' | 'near' | 'far' | 'hidden';

function createEditPinElement(icon: string, color: string): HTMLDivElement {
  const el = document.createElement('div');
  el.dataset.icon = icon;
  el.dataset.color = color;
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;';
  el.appendChild(document.createElement('div'));
  applyPinLook(el, 'near');
  return el;
}

function applyPinLook(el: HTMLDivElement, look: PinLook): void {
  const color = el.dataset.color ?? '#555';
  const inner = el.firstElementChild as HTMLDivElement;
  el.dataset.look = look;

  if (look === 'hidden') {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';

  if (look === 'selected') {
    el.style.width = '56px';
    el.style.height = '56px';
    el.style.zIndex = '5';
    inner.style.cssText =
      `position:relative;width:48px;height:48px;border-radius:50%;border:3px solid ${color};` +
      'background:rgba(255,255,255,.22);box-shadow:0 0 0 2px #fff,0 3px 10px rgba(0,0,0,.5);';
    inner.textContent = '';
    const lineStyle = 'position:absolute;background:#e11d1d;border-radius:1px;';
    const vertical = document.createElement('div');
    vertical.style.cssText = `${lineStyle}left:50%;top:5px;bottom:5px;width:2px;margin-left:-1px;`;
    const horizontal = document.createElement('div');
    horizontal.style.cssText = `${lineStyle}top:50%;left:5px;right:5px;height:2px;margin-top:-1px;`;
    inner.appendChild(vertical);
    inner.appendChild(horizontal);
  } else if (look === 'far') {
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.zIndex = '0';
    inner.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;opacity:.6;`;
    inner.textContent = '';
  } else {
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.zIndex = '1';
    inner.style.cssText =
      `width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid ${color};opacity:.85;` +
      'display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.35);';
    inner.textContent = el.dataset.icon ?? '';
  }
}

/* "You are here" — the same pulsing blue dot used on the Explore pages
   (styles .user-dot-wrapper / -ring / -inner live in globals.css). */
function createUserDotElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'user-dot-wrapper';
  el.innerHTML = '<div class="user-dot-ring"></div><div class="user-dot-inner"></div>';
  return el;
}

// Phone-sized screen? (below Tailwind's "md" breakpoint, 768px)
const PHONE_QUERY = '(max-width: 767px)';
function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const getPhoneSnapshot = () => window.matchMedia(PHONE_QUERY).matches;
const getPhoneServerSnapshot = () => false;

export default function BarangayMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pinMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleans the raw GPS readings (see lib/gps.ts)
  const gpsFilterRef = useRef<GpsFilter>(new GpsFilter());
  // Makes sure a slow route answer can never overwrite a newer one
  const routeRequestRef = useRef(0);
  const routeAbortRef = useRef<AbortController | null>(null);

  // Always holds the latest GPS position. Popup buttons and routing read from
  // here, so they never use a stale (null) position captured at map load.
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const userAccRef = useRef<number | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsQuality, setGpsQuality] = useState<GpsQuality>('approximate');
  const [gpsStatus, setGpsStatus] = useState<'ok' | 'denied' | 'unsupported'>('unsupported');

  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // The ONE place that has been clicked — the only pin on the map
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [routeInfo, setRouteInfo] = useState<RouteSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // On a phone the sidebar covers the map, so it starts CLOSED there and closes
  // again by itself once you pick a place. On a computer it starts open.
  const isPhone = useSyncExternalStore(subscribePhone, getPhoneSnapshot, getPhoneServerSnapshot);
  const isPhoneRef = useRef(false);
  isPhoneRef.current = isPhone;
  const [sidebarOverride, setSidebarOverride] = useState<boolean | null>(null);
  const sidebarOpen = sidebarOverride ?? !isPhone;
  const gpsDeniedRef = useRef(false);

  // ── Admin only: "Fix pin positions" ──
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pinEdits, setPinEdits] = useState<Record<string, { lat: number; lng: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  // result of "Check all pins" / "Find on Mapbox", by place id
  const [audit, setAudit] = useState<Record<string, PinAudit>>({});
  const [auditProgress, setAuditProgress] = useState<{ done: number; total: number } | null>(null);
  const [auditOnlyOff, setAuditOnlyOff] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  // easy pin placing
  const [satellite, setSatellite] = useState(false);
  const satelliteShownRef = useRef(false);
  const [hideOthers, setHideOthers] = useState(false);
  const [fixQuery, setFixQuery] = useState('');
  const [nudgeStep, setNudgeStep] = useState<number>(3);
  const auditCancelRef = useRef(false);
  const pinEditsRef = useRef(pinEdits);
  pinEditsRef.current = pinEdits;
  const pinModeRef = useRef(false);
  pinModeRef.current = pinMode;
  const selectedPlaceRef = useRef<Place | null>(null);
  selectedPlaceRef.current = selectedPlace;

  // ═══════════════════════════════════════
  // PLACES (live from the Explore listings)
  // ═══════════════════════════════════════
  const healthcare = useExploreListings('healthcare').listings;
  const education = useExploreListings('education').listings;
  const food = useExploreListings('food').listings;
  const hotspots = useExploreListings('hotspots').listings;
  const community = useExploreListings('community').listings;
  const finance = useExploreListings('finance').listings;
  const transport = useExploreListings('transport').listings;
  const shopping = useExploreListings('shopping').listings;
  const lifestyle = useExploreListings('lifestyle').listings;

  const allPlaces: Place[] = useMemo(() => {
    const bySection: Record<SectionKey, unknown[]> = {
      healthcare, education, food, hotspots, community, finance, transport, shopping, lifestyle,
    };
    return SECTIONS.flatMap((s) => toPlaces(s, bySection[s.key] ?? []));
  }, [healthcare, education, food, hotspots, community, finance, transport, shopping, lifestyle]);

  // Only offer a filter chip for categories that actually have places
  const availableCategories: Category[] = useMemo(
    () => ['all', ...SECTIONS.filter((s) => allPlaces.some((p) => p.category === s.key)).map((s) => s.key)],
    [allPlaces]
  );

  const categoryPlaces: Place[] = useMemo(
    () => (activeCategory === 'all' ? allPlaces : allPlaces.filter((p) => p.category === activeCategory)),
    [allPlaces, activeCategory]
  );

  // ═══════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  // ═══════════════════════════════════════
  // IS THIS AN ADMIN? (only admins see "Fix pin positions")
  // The real protection is the Firestore rules; this only decides what to SHOW.
  // ═══════════════════════════════════════
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setPinMode(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setIsAdmin(snap.exists() && snap.data()?.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    });
  }, []);

  // ═══════════════════════════════════════
  // GPS ACCURACY CIRCLE
  // ═══════════════════════════════════════
  const updateAccuracyCircle = useCallback((lat: number, lng: number, acc: number) => {
    setSourceData(mapRef.current, ACCURACY_SRC, { type: 'FeatureCollection', features: [circlePolygon(lat, lng, acc)] });
  }, []);

  // ═══════════════════════════════════════
  // ROUTE
  // ═══════════════════════════════════════
  const clearRouteLayers = useCallback(() => {
    routeAbortRef.current?.abort();
    routeRequestRef.current += 1;
    setSourceData(mapRef.current, ROUTE_SRC, EMPTY_LINES);
    setSourceData(mapRef.current, GAPS_SRC, EMPTY_LINES);
    setRouteInfo(null);
  }, []);

  const drawRoute = useCallback(
    async (destLat: number, destLng: number, label: string) => {
      const pos = userPosRef.current;
      const map = mapRef.current;
      if (!pos || !map) {
        showToast(
          gpsDeniedRef.current
            ? 'Turn on location (GPS) for this site to get directions'
            : 'Waiting for your GPS location...'
        );
        return;
      }

      // A newer request replaces an older one (answers can arrive out of order)
      const requestId = ++routeRequestRef.current;
      routeAbortRef.current?.abort();
      const controller = new AbortController();
      routeAbortRef.current = controller;

      // overview=full returns the detailed route line (the default is
      // simplified and can cut corners on curvy roads).
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${pos.lng},${pos.lat};${destLng},${destLat}` +
        `?geometries=geojson&overview=full&alternatives=false&access_token=${mapboxgl.accessToken}`;

      try {
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (requestId !== routeRequestRef.current || !mapRef.current) return; // outdated answer

        const route = data.routes?.[0];
        if (data.code !== 'Ok' || !route?.geometry) {
          showToast(routeErrorMessage(data));
          return;
        }

        setSourceData(mapRef.current, ROUTE_SRC, { type: 'Feature', properties: {}, geometry: route.geometry });

        // Mapbox "snaps" your position and the pin to the nearest road. When the
        // snapped point is far from the real one, show the gap as a dashed line.
        const waypoints = (data.waypoints ?? []) as { location?: [number, number]; distance?: number }[];
        const startGapM = Math.round(waypoints[0]?.distance ?? 0);
        const destGapM = Math.round(waypoints[1]?.distance ?? 0);
        const gaps: Feature<LineString>[] = [];
        if (waypoints[0]?.location && startGapM > 8) gaps.push(dashedLine([pos.lng, pos.lat], waypoints[0].location));
        if (waypoints[1]?.location && destGapM > 8) gaps.push(dashedLine(waypoints[1].location, [destLng, destLat]));
        setSourceData(mapRef.current, GAPS_SRC, { type: 'FeatureCollection', features: gaps });

        setRouteInfo({
          name: label,
          distanceM: route.distance,
          minutes: route.duration / 60,
          startGapM,
          destGapM,
        });

        // Fit the view to the route AND both ends (you + the destination pin)
        const bounds = new mapboxgl.LngLatBounds();
        route.geometry.coordinates.forEach((c: [number, number]) => bounds.extend(c));
        bounds.extend([pos.lng, pos.lat]);
        bounds.extend([destLng, destLat]);
        mapRef.current.fitBounds(bounds, { padding: 60 });

        showToast(`Route to ${label}: ${formatMeters(route.distance)} · ${formatMinutes(route.duration / 60)}`);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return; // replaced by a newer request
        console.error('Routing error:', err);
        showToast('Could not calculate route');
      }
    },
    [showToast]
  );

  // ═══════════════════════════════════════
  // REVEAL A PLACE (the only way a pin appears)
  // ═══════════════════════════════════════
  const revealPlace = useCallback((place: Place, fly = true) => {
    setSelectedPlace(place);
    setSelectedDestinationId(place.id);
    if (isPhoneRef.current) setSidebarOverride(false); // show the map on phones
    if (fly) mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 16 });
  }, []);

  // ═══════════════════════════════════════
  // YOU-ARE-HERE MARKER
  // ═══════════════════════════════════════
  const placeUserMarker = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat]);
      return;
    }

    userMarkerRef.current = new mapboxgl.Marker({ element: createUserDotElement(), anchor: 'center' })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Your Current Location'))
      .addTo(map);
  }, []);

  // ═══════════════════════════════════════
  // ADMIN: remember a moved pin (not saved until "Save position")
  // ═══════════════════════════════════════
  const setPinEdit = useCallback((place: Place, lat: number, lng: number) => {
    const next = { ...pinEditsRef.current, [place.id]: { lat: round6(lat), lng: round6(lng) } };
    pinEditsRef.current = next;
    setPinEdits(next);
  }, []);

  // ═══════════════════════════════════════
  // MAP INITIALIZATION
  // ═══════════════════════════════════════
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      setMapError('Missing Mapbox access token.');
      return;
    }

    overlayCache.clear();
    satelliteShownRef.current = false;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: STREETS_STYLE,
      center: CALINAN_CENTER,
      zoom: 14,
      // Always north-up and flat. A map that was turned or tilted by accident (right-click drag,
      // two-finger twist, Shift+arrow keys) makes distances look wrong and pins look misplaced, and
      // most visitors do not know how to straighten it again.
      bearing: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // Compact attribution: Mapbox/OpenStreetMap credit stays (required),
      // but collapses into a small "i" button.
      attributionControl: false,
    });

    mapRef.current = map;
    map.touchZoomRotate.disableRotation(); // pinch to zoom still works, twisting does not
    map.keyboard.disableRotation();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    let loaded = false;

    map.on('load', () => {
      loaded = true;
      addOverlays(map);
      setMapLoaded(true);
      requestAnimationFrame(() => map.resize());
    });

    // A new base map (streets <-> satellite) removes our extra layers: put them back.
    // (addOverlays only adds what is missing, so calling it several times is harmless.)
    const restoreOverlays = () => {
      if (loaded && map.isStyleLoaded()) addOverlays(map);
    };
    map.on('style.load', restoreOverlays);
    map.on('styledata', restoreOverlays);

    map.on('click', (e) => {
      // Development only: click the map to print exact coordinates in the
      // browser console, for checking the position of a listing.
      if (process.env.NODE_ENV === 'development') {
        console.log(`lat: ${e.lngLat.lat.toFixed(6)}, lng: ${e.lngLat.lng.toFixed(6)}`);
      }
      // Admin "Fix pin positions": tap the map to move the selected pin there
      const target = selectedPlaceRef.current;
      if (pinModeRef.current && target) {
        pinMarkersRef.current.get(target.id)?.setLngLat(e.lngLat);
        setPinEdit(target, e.lngLat.lat, e.lngLat.lng);
      }
    });

    // Only a failure BEFORE the map has loaded is fatal. A later error (one tile
    // that couldn't load, a dropped connection) must not cover the whole map.
    map.on('error', (e) => {
      console.error('[Mapbox error]', e?.error?.message || e);
      if (!loaded) setMapError(e?.error?.message || 'Unknown Mapbox error');
    });

    const pinMarkers = pinMarkersRef.current;
    return () => {
      // Forget every marker that belonged to this map, so a remount
      // (hot reload / React Strict Mode) rebuilds them on the NEW map.
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      pinMarkers.forEach((m) => m.remove());
      pinMarkers.clear();

      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [setPinEdit]);

  // ═══════════════════════════════════════
  // THE CLICKED PLACE — its pin + popup (nothing else is ever pinned)
  // (Hidden while an admin is fixing pins: then every pin is a draggable dot.)
  // ═══════════════════════════════════════
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    const place = selectedPlace;
    if (!place || pinMode) return;

    const popupNode = document.createElement('div');
    popupNode.className = 'place-popup';

    const title = document.createElement('h4');
    title.textContent = `${place.icon} ${place.name}`;
    popupNode.appendChild(title);

    if (place.tag) {
      const tag = document.createElement('div');
      tag.className = 'popup-tag';
      tag.textContent = place.tag;
      popupNode.appendChild(tag);
    }
    if (place.address) {
      const addr = document.createElement('p');
      addr.textContent = place.address;
      popupNode.appendChild(addr);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🧭 Directions';
    btn.style.cssText =
      'margin-top:8px;padding:6px 14px;border:none;border-radius:999px;' +
      'background:#2b6b45;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    btn.onclick = () => drawRoute(place.lat, place.lng, place.name);
    popupNode.appendChild(btn);

    // offset [0,-7]: the rotated teardrop's tip sticks out ~7px below its box,
    // so lift it by 7px to land exactly on the coordinates.
    const marker = new mapboxgl.Marker({
      element: createPinElement(place.icon),
      anchor: 'bottom',
      offset: [0, -7],
    })
      .setLngLat([place.lng, place.lat])
      .setPopup(new mapboxgl.Popup({ offset: 50, maxWidth: '260px' }).setDOMContent(popupNode))
      .addTo(map);

    marker.togglePopup(); // show its details right away — it was just clicked
    selectedMarkerRef.current = marker;
  }, [selectedPlace, mapLoaded, drawRoute, pinMode]);

  // ═══════════════════════════════════════
  // ADMIN: "Fix pin positions" — one draggable pin for every place
  // ═══════════════════════════════════════
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const markers = pinMarkersRef.current;
    markers.forEach((m) => m.remove());
    markers.clear();
    if (!pinMode || !isAdmin) return;

    allPlaces.forEach((place) => {
      const start = pinEditsRef.current[place.id] ?? { lat: place.lat, lng: place.lng };
      const el = createEditPinElement(place.icon, SECTION_COLORS[place.section]);
      el.title = place.name;

      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([start.lng, start.lat])
        .addTo(map);

      el.addEventListener('click', (ev) => {
        ev.stopPropagation(); // don't also count as a map click
        setSelectedPlace(place);
        setSelectedDestinationId(place.id);
      });
      marker.on('dragend', () => {
        const ll = marker.getLngLat();
        setSelectedPlace(place);
        setSelectedDestinationId(place.id);
        setPinEdit(place, ll.lat, ll.lng);
      });

      markers.set(place.id, marker);
    });
  }, [pinMode, isAdmin, allPlaces, mapLoaded, setPinEdit]);

  // The selected pin is BIG; the others are small, and the ones far away are tiny
  useEffect(() => {
    if (!pinMode || !isAdmin) return;
    const markers = pinMarkersRef.current;
    const selected = selectedPlace ? markers.get(selectedPlace.id)?.getLngLat() : undefined;

    markers.forEach((marker, id) => {
      const el = marker.getElement() as HTMLDivElement;
      if (selectedPlace && id === selectedPlace.id) {
        applyPinLook(el, 'selected');
        return;
      }
      if (!selected) {
        applyPinLook(el, 'near'); // nothing chosen yet: show them all, small
        return;
      }
      if (hideOthers) {
        applyPinLook(el, 'hidden');
        return;
      }
      const ll = marker.getLngLat();
      applyPinLook(el, metersBetween(selected.lat, selected.lng, ll.lat, ll.lng) <= NEAR_PIN_CONTEXT_M ? 'near' : 'far');
    });
  }, [pinMode, isAdmin, selectedPlace, hideOthers, allPlaces, mapLoaded, pinEdits]);

  // 🛰 Satellite <-> streets (only the admin fixing pins can switch it; leaving the tool turns it off)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (satelliteShownRef.current === satellite) return;
    satelliteShownRef.current = satellite;
    // diff:false = build the new base map from scratch (a clean 'style.load', no half-updated layers)
    map.setStyle(satellite ? SATELLITE_STYLE : STREETS_STYLE, { diff: false } as Parameters<mapboxgl.Map['setStyle']>[1]);
  }, [satellite, mapLoaded]);

  // red dashed line from the saved position to the moved position of the selected pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const place = selectedPlace;
    const edit = place ? pinEdits[place.id] : undefined;
    if (!pinMode || !place || !edit) {
      setSourceData(map, MOVE_SRC, EMPTY_LINES);
      return;
    }
    setSourceData(map, MOVE_SRC, {
      type: 'FeatureCollection',
      features: [dashedLine([place.lng, place.lat], [edit.lng, edit.lat])],
    });
  }, [pinMode, selectedPlace, pinEdits, mapLoaded]);

  // ═══════════════════════════════════════
  // GEOLOCATION TRACKING
  // ═══════════════════════════════════════
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }

    const filter = gpsFilterRef.current;
    filter.reset();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // lib/gps.ts decides: keep this reading, or ignore it (rough guess, jitter, teleport)
        const decision = filter.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: pos.timestamp || Date.now(),
        });
        if (!decision) return;

        const { fix, quality } = decision;
        gpsDeniedRef.current = false;
        userPosRef.current = { lat: fix.lat, lng: fix.lng };
        userAccRef.current = fix.accuracy;
        setGpsStatus('ok');
        setGpsQuality(quality);
        setAccuracy(Math.round(fix.accuracy));
        setUserLat(fix.lat);
        setUserLng(fix.lng);

        placeUserMarker(fix.lat, fix.lng);
        updateAccuracyCircle(fix.lat, fix.lng, fix.accuracy);
      },
      (err) => {
        console.warn(`GPS Error: ${err.message}`);
        gpsDeniedRef.current = true;
        setGpsStatus('denied');
      },
      // maximumAge: 0 means it never reuses an old cached position
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [placeUserMarker, updateAccuracyCircle]);

  // The map may finish loading AFTER the first GPS fix — draw the dot + circle then too
  useEffect(() => {
    const pos = userPosRef.current;
    if (!mapLoaded || !pos) return;
    placeUserMarker(pos.lat, pos.lng);
    if (userAccRef.current !== null) updateAccuracyCircle(pos.lat, pos.lng, userAccRef.current);
  }, [mapLoaded, placeUserMarker, updateAccuracyCircle]);

  // Nudge the map to recalc size when the sidebar toggles or on mount
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 250);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  // ═══════════════════════════════════════
  // NEARBY LIST (derived) — follows the category chips
  // ═══════════════════════════════════════
  const nearbyList: PlaceWithDistance[] = (() => {
    const withDist: PlaceWithDistance[] = categoryPlaces.map((p) => ({
      ...p,
      dist: userLat !== null && userLng !== null ? metersBetween(userLat, userLng, p.lat, p.lng) : null,
    }));
    if (userLat !== null && userLng !== null) {
      withDist.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    } else {
      withDist.sort((a, b) => a.name.localeCompare(b.name));
    }
    return withDist.slice(0, 8);
  })();

  // ═══════════════════════════════════════
  // RECENTER (zooms to fit how precise your position is)
  // ═══════════════════════════════════════
  const recenterMap = () => {
    const pos = userPosRef.current;
    if (pos && mapRef.current) {
      mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: zoomForAccuracy(userAccRef.current) });
      showToast('Recentered to your location');
    } else {
      showToast('GPS position not acquired yet');
    }
  };

  // ═══════════════════════════════════════
  // CATEGORY FILTER — only filters the Nearby list; the map stays clean
  // ═══════════════════════════════════════
  const filterCat = (category: Category) => setActiveCategory(category);

  // ═══════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════
  const matchPlaces = (query: string) =>
    allPlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.tag.toLowerCase().includes(query) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(query)
    );

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const query = value.toLowerCase().trim();

    if (query.length < 2) {
      setShowSearchResults(false);
      return;
    }

    setSearchResults(matchPlaces(query));
    setShowSearchResults(true);
  };

  // "Go" lists the matches — a place only appears on the map when you click it.
  // (If there is exactly one match, it is opened straight away.)
  const doSearch = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return;

    const matches = matchPlaces(query);
    if (matches.length === 0) {
      setShowSearchResults(false);
      showToast('No locations matched your query');
    } else if (matches.length === 1) {
      setShowSearchResults(false);
      revealPlace(matches[0]);
      showToast(`Showing ${matches[0].name}`);
    } else {
      setSearchResults(matches);
      setShowSearchResults(true);
      showToast(`Found ${matches.length} places — tap one to show it`);
    }
  };

  const selectSearchResult = (id: string) => {
    const place = allPlaces.find((p) => p.id === id);
    setShowSearchResults(false);
    if (place) {
      revealPlace(place);
      showToast(`Showing ${place.name}`);
    }
  };

  // ═══════════════════════════════════════
  // ROUTING — clear and get directions
  // ═══════════════════════════════════════
  const clearMap = useCallback(() => {
    // Back to a clean map: no route and no place pin
    setSelectedPlace(null);
    setSelectedDestinationId('');
    clearRouteLayers();
    showToast('Map cleared');
  }, [clearRouteLayers, showToast]);

  const getDirections = useCallback(() => {
    if (!userPosRef.current) {
      showToast(
        gpsDeniedRef.current
          ? 'Turn on location (GPS) for this site to get directions'
          : 'Waiting for your GPS location...'
      );
      return;
    }
    if (!selectedDestinationId) {
      showToast('Please select a destination first');
      return;
    }
    const target = allPlaces.find((p) => p.id === selectedDestinationId);
    if (!target) return;

    revealPlace(target, false); // show the destination pin; the route view fits both ends
    drawRoute(target.lat, target.lng, target.name);
  }, [selectedDestinationId, allPlaces, drawRoute, revealPlace, showToast]);

  // ═══════════════════════════════════════
  // EMERGENCY SEARCH
  // Finds the hospital / police / fire station in the listings (matched by name
  // or tag). The NEAREST is chosen by DRIVING time (Mapbox Matrix), not by
  // straight-line distance — a station across the river can be close as the
  // crow flies but far by road.
  // ═══════════════════════════════════════
  const nearestByRoad = useCallback(
    async (pos: { lat: number; lng: number }, candidates: Place[]): Promise<Place> => {
      const byStraightLine = [...candidates].sort(
        (a, b) => metersBetween(pos.lat, pos.lng, a.lat, a.lng) - metersBetween(pos.lat, pos.lng, b.lat, b.lng)
      );
      const top = byStraightLine.slice(0, 5);
      if (top.length <= 1) return top[0];

      try {
        const coords = [`${pos.lng},${pos.lat}`, ...top.map((p) => `${p.lng},${p.lat}`)].join(';');
        const url =
          `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
          `?sources=0&annotations=duration&access_token=${mapboxgl.accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        const durations: (number | null)[] | undefined = data?.durations?.[0];
        if (!durations) return top[0];

        let best = -1;
        let bestSeconds = Infinity;
        for (let i = 1; i < durations.length; i++) {
          const seconds = durations[i];
          if (typeof seconds === 'number' && seconds < bestSeconds) {
            bestSeconds = seconds;
            best = i - 1;
          }
        }
        return best >= 0 ? top[best] : top[0];
      } catch {
        return top[0]; // no internet / Mapbox busy → fall back to straight-line
      }
    },
    []
  );

  const findNearest = async (type: keyof typeof EMERGENCY) => {
    const { label, match } = EMERGENCY[type];
    const matches = allPlaces.filter((p) => match.test(p.name) || match.test(p.tag));

    if (matches.length === 0) {
      showToast(`No ${label} listed yet — add it in Admin > Listings`);
      return;
    }

    const pos = userPosRef.current;
    if (!pos) {
      // No GPS yet: show the first one, but there is no route to draw
      revealPlace(matches[0], true);
      showToast(
        gpsDeniedRef.current
          ? 'Turn on location (GPS) to find the nearest one'
          : `Waiting for your GPS location... showing ${matches[0].name}`
      );
      return;
    }

    showToast(`Finding the nearest ${label} by road...`);
    const target = await nearestByRoad(pos, matches);

    revealPlace(target, false);
    drawRoute(target.lat, target.lng, target.name);
    showToast(`Nearest ${label}: ${target.name}`);
  };

  // ═══════════════════════════════════════
  // ADMIN: save / undo a moved pin
  // ═══════════════════════════════════════
  // ADMIN: find ONE place on Mapbox's own map (flies there, waits for the map's place data, compares).
  // First look closely (zoom 16: every small shop is in the map's data). If the icon is not in view,
  // look once more from higher up (zoom 15: a wider area, which also catches icons that are far from the pin).
  const checkPlaceOnMapbox = useCallback(async (place: Place): Promise<PinAudit | null> => {
    const map = mapRef.current;
    if (!map) return null;
    const pin = { lat: place.lat, lng: place.lng };

    let result: PinAudit = { status: 'none', offsetM: null, suggestion: null };
    for (const zoom of [16, 15]) {
      map.jumpTo({ center: [place.lng, place.lat], zoom });
      await whenMapIdle(map);
      result = auditPin(place.name, pin, readMapPois(map), AUDIT_SEARCH_RADIUS_M);
      if (result.status !== 'none') break;
    }
    setAudit((prev) => ({ ...prev, [place.id]: result }));
    return result;
  }, []);

  // ADMIN: check every place in the current filter, one after the other (can be cancelled)
  const checkAllPins = useCallback(async () => {
    const list = categoryPlaces;
    if (list.length === 0 || auditProgress) return;
    auditCancelRef.current = false;
    setAudit({});
    setAuditProgress({ done: 0, total: list.length });

    for (let i = 0; i < list.length; i++) {
      if (auditCancelRef.current) break;
      await checkPlaceOnMapbox(list[i]);
      setAuditProgress({ done: i + 1, total: list.length });
    }
    setAuditProgress(null);
    showToast(auditCancelRef.current ? 'Check stopped' : 'Check finished — see the list');
  }, [categoryPlaces, auditProgress, checkPlaceOnMapbox, showToast]);

  // ADMIN: use Mapbox's position for a place (only a pending change — nothing is saved yet)
  const useSuggestion = useCallback(
    (place: Place) => {
      const sug = audit[place.id]?.suggestion;
      if (!sug) return;
      pinMarkersRef.current.get(place.id)?.setLngLat([sug.lng, sug.lat]);
      setPinEdit(place, sug.lat, sug.lng);
      setSelectedPlace(place);
      setSelectedDestinationId(place.id);
      mapRef.current?.flyTo({ center: [sug.lng, sug.lat], zoom: 17 });
    },
    [audit, setPinEdit]
  );

  const showPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
    setSelectedDestinationId(place.id);
    const edit = pinEditsRef.current[place.id];
    mapRef.current?.flyTo({ center: [edit?.lng ?? place.lng, edit?.lat ?? place.lat], zoom: 18 });
  }, []);

  // ADMIN: put the pin exactly under the crosshair (the center of the screen). Pan the map until the
  // crosshair is on the building, then press the button — your finger never covers the spot.
  const pinToCrosshair = (place: Place) => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    pinMarkersRef.current.get(place.id)?.setLngLat(c);
    setPinEdit(place, c.lat, c.lng);
  };

  // ADMIN: nudge the pin a few meters (N / S / E / W)
  const nudgePin = (place: Place, direction: 'n' | 's' | 'e' | 'w') => {
    const cur = pinEditsRef.current[place.id] ?? { lat: place.lat, lng: place.lng };
    const dLat = (nudgeStep / 110574) * (direction === 'n' ? 1 : direction === 's' ? -1 : 0);
    const dLng = (nudgeStep / (111320 * Math.cos((cur.lat * Math.PI) / 180))) * (direction === 'e' ? 1 : direction === 'w' ? -1 : 0);
    const lat = cur.lat + dLat;
    const lng = cur.lng + dLng;
    pinMarkersRef.current.get(place.id)?.setLngLat([lng, lat]);
    setPinEdit(place, lat, lng);
  };

  const undoPinEdit = (place: Place) => {
    const { [place.id]: _removed, ...rest } = pinEditsRef.current;
    void _removed;
    pinEditsRef.current = rest;
    setPinEdits(rest);
    pinMarkersRef.current.get(place.id)?.setLngLat([place.lng, place.lat]);
  };

  const savePinEdit = async (place: Place) => {
    const edit = pinEditsRef.current[place.id];
    if (!edit) return;

    if (!isInDavao(edit.lat, edit.lng)) {
      showToast('That position is outside Davao City — please check it');
      return;
    }
    const movedM = metersBetween(place.lat, place.lng, edit.lat, edit.lng);
    if (movedM > 1500 && !window.confirm(`Move "${place.name}" by ${formatMeters(movedM)}?`)) return;

    setSavingId(place.id);
    try {
      await updateDoc(doc(db, PAGE_COLLECTION[place.section as ExplorePage], place.docId), {
        lat: edit.lat,
        lng: edit.lng,
        coordsUpdatedAt: serverTimestamp(),
      });
      // the saved position is now the real one
      const { [place.id]: _saved, ...rest } = pinEditsRef.current;
      void _saved;
      pinEditsRef.current = rest;
      setPinEdits(rest);
      setSelectedPlace({ ...place, lat: edit.lat, lng: edit.lng });
      setAudit((prev) => ({ ...prev, [place.id]: { status: 'ok', offsetM: 0, suggestion: null } }));
      showToast(`Saved: ${place.name}`);
    } catch (err) {
      console.error('Saving the pin position failed:', err);
      showToast('Could not save — are you signed in as an admin?');
    } finally {
      setSavingId(null);
    }
  };

  // ADMIN: save every moved pin, one after the other
  const saveAllPinEdits = async () => {
    const entries = Object.entries(pinEditsRef.current);
    if (entries.length === 0) return;

    const byId = new Map(allPlaces.map((p) => [p.id, p]));
    const bad = entries.filter(([, e]) => !isInDavao(e.lat, e.lng));
    if (bad.length > 0) {
      showToast(`${bad.length} position(s) are outside Davao City — fix or undo them first`);
      return;
    }
    const far = entries.filter(([id, e]) => {
      const p = byId.get(id);
      return p ? metersBetween(p.lat, p.lng, e.lat, e.lng) > 1500 : false;
    });
    const question =
      far.length > 0
        ? `Save ${entries.length} moved pin(s)? ${far.length} of them move by more than 1.5 km.`
        : `Save ${entries.length} moved pin(s)?`;
    if (!window.confirm(question)) return;

    setSavingAll(true);
    let saved = 0;
    try {
      for (const [id, edit] of entries) {
        const place = byId.get(id);
        if (!place) continue;
        await updateDoc(doc(db, PAGE_COLLECTION[place.section as ExplorePage], place.docId), {
          lat: edit.lat,
          lng: edit.lng,
          coordsUpdatedAt: serverTimestamp(),
        });
        saved += 1;
        const { [id]: _done, ...rest } = pinEditsRef.current;
        void _done;
        pinEditsRef.current = rest;
        setPinEdits(rest);
        setAudit((prev) => ({ ...prev, [id]: { status: 'ok', offsetM: 0, suggestion: null } }));
      }
      showToast(`Saved ${saved} pin(s)`);
    } catch (err) {
      console.error('Saving the pin positions failed:', err);
      showToast(`Saved ${saved} of ${entries.length} — then it stopped. Are you signed in as an admin?`);
    } finally {
      setSavingAll(false);
    }
  };

  const togglePinMode = () => {
    const next = !pinMode;
    setPinMode(next);
    if (next && isPhoneRef.current) setSidebarOverride(false); // show the map on phones
    if (!next) {
      auditCancelRef.current = true;
      pinEditsRef.current = {};
      setPinEdits({});
      setAudit({});
      setAuditProgress(null);
      setSatellite(false);
      setHideOthers(false);
      setFixQuery('');
    }
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  const toggleSidebar = () => setSidebarOverride(!sidebarOpen);

  const gpsDotClass =
    gpsStatus !== 'ok'
      ? 'bg-red-500'
      : gpsQuality === 'precise' || gpsQuality === 'good'
      ? 'bg-green-600'
      : gpsQuality === 'fair'
      ? 'bg-amber-500'
      : 'bg-red-500';

  const pendingCount = Object.keys(pinEdits).length;
  const fixMatches = useMemo(() => {
    const q = fixQuery.toLowerCase().trim();
    if (q.length < 2) return [];
    return allPlaces.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [fixQuery, allPlaces]);
  const auditRows = useMemo(() => {
    const byId = new Map(allPlaces.map((p) => [p.id, p]));
    return Object.entries(audit)
      .map(([id, a]) => ({ place: byId.get(id), audit: a }))
      .filter((r): r is { place: Place; audit: PinAudit } => !!r.place)
      .filter((r) => !auditOnlyOff || r.audit.status !== 'ok')
      // places to fix first (worst first), then the ones Mapbox does not have, then the OK ones
      .sort((x, y) => {
        const rank = (a: PinAudit) => (a.status === 'off' ? 0 : a.status === 'none' ? 1 : 2);
        return rank(x.audit) - rank(y.audit) || (y.audit.offsetM ?? 0) - (x.audit.offsetM ?? 0);
      });
  }, [audit, allPlaces, auditOnlyOff]);
  const auditCounts = useMemo(() => {
    const all = Object.values(audit);
    const offs = all.filter((a) => a.status === 'off').map((a) => a.offsetM ?? 0).sort((a, b) => a - b);
    return {
      total: all.length,
      ok: all.filter((a) => a.status === 'ok').length,
      off: offs.length,
      none: all.filter((a) => a.status === 'none').length,
      medianOff: offs.length ? offs[Math.floor(offs.length / 2)] : 0,
    };
  }, [audit]);
  const editedAudit = selectedPlace ? audit[selectedPlace.id] : undefined;

  const editedPlace = selectedPlace && pinMode ? selectedPlace : null;
  const editedPos = editedPlace ? pinEdits[editedPlace.id] : undefined;
  const editedMovedM = editedPlace && editedPos ? metersBetween(editedPlace.lat, editedPlace.lng, editedPos.lat, editedPos.lng) : 0;

  return (
    <div className="relative flex w-full overflow-hidden bg-neutral-100" style={{ height: '100dvh' }}>
      {/* ─── SIDEBAR ───
          Phone: slides over the map (and closes itself when you pick a place).
          Computer: sits beside the map. */}
      <aside
        className={[
          'h-full flex-col overflow-hidden border-r border-neutral-200 bg-white',
          sidebarOpen ? 'flex' : 'hidden',
          'absolute inset-y-0 left-0 z-30 w-[88vw] max-w-sm shadow-xl',
          'md:static md:z-auto md:w-80 md:max-w-none md:flex-shrink-0 md:shadow-none',
        ].join(' ')}
      >
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-semibold text-neutral-800">Barangay Map</h1>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  ← Home
                </Link>
                {/* Close (phones only) */}
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 md:hidden"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-block w-2 h-2 rounded-full ${gpsDotClass}`} />
              <span className="text-xs text-neutral-500" data-testid="gps-status">
                {gpsStatus === 'ok'
                  ? `GPS Active${accuracy ? ` · ±${accuracy}m` : ''} · ${QUALITY_TEXT[gpsQuality]}`
                  : gpsStatus === 'unsupported'
                  ? 'GPS Unsupported'
                  : 'GPS Signal Weak / Denied'}
              </span>
            </div>
            {gpsStatus === 'ok' && gpsQuality === 'approximate' && (
              <p className="mt-1 text-[11px] leading-snug text-amber-700">
                Your location is only approximate. For exact directions, turn on your phone&apos;s GPS
                (&quot;Precise location&quot;) and, if you can, go outside.
              </p>
            )}
            {userLat !== null && userLng !== null && (
              <p className="text-[11px] text-neutral-400 mt-1">
                {userLat.toFixed(5)}, {userLng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Emergency quick-find */}
          <div className="px-4 py-3 border-b border-neutral-200">
            <p className="text-xs font-medium text-neutral-500 mb-2">Emergency</p>
            <div className="flex gap-2">
              <button
                onClick={() => findNearest('hospital')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                🏥 Hospital
              </button>
              <button
                onClick={() => findNearest('police')}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                🚔 Police
              </button>
              <button
                onClick={() => findNearest('fire')}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                🚒 Fire
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-neutral-200 relative">
            <p className="text-xs font-medium text-neutral-500 mb-2">Search</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="Search places..."
                className="flex-1 rounded-md px-3 py-1.5 border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/40"
              />
              <button
                onClick={doSearch}
                className="bg-green-700 hover:bg-green-800 text-white rounded-md px-3 text-sm font-medium transition-colors"
              >
                Go
              </button>
            </div>
            {showSearchResults && (
              <div className="absolute left-4 right-4 mt-1 bg-white rounded-md shadow-lg border border-neutral-200 divide-y divide-neutral-100 max-h-64 overflow-y-auto z-20">
                {searchResults.length === 0 ? (
                  <div className="p-2 text-sm text-neutral-500">No results found</div>
                ) : (
                  searchResults.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-50"
                      onClick={() => selectSearchResult(m.id)}
                    >
                      <span>{m.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-neutral-800">{m.name}</div>
                        <div className="text-xs text-neutral-500">{m.address || m.tag}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Category filters */}
          <div className="px-4 py-3 border-b border-neutral-200">
            <p className="text-xs font-medium text-neutral-500 mb-2">Filter</p>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => filterCat(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-green-700 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Nearby list */}
          <div className="px-4 py-3 border-b border-neutral-200 flex-1 min-h-0 overflow-y-auto">
            <p className="text-xs font-medium text-neutral-500">{userLat !== null ? 'Nearby' : 'Places'}</p>
            <p className="text-[11px] text-neutral-400 mb-2">Tap a place to show it on the map.</p>
            <ul className="text-sm divide-y divide-neutral-100">
              {nearbyList.length === 0 ? (
                <li className="py-2 text-neutral-400">No locations found</li>
              ) : (
                nearbyList.map((item) => (
                  <li
                    key={item.id}
                    className={`py-2 flex items-center gap-2 cursor-pointer hover:bg-neutral-50 rounded px-1 ${
                      selectedPlace?.id === item.id ? 'bg-green-50' : ''
                    }`}
                    onClick={() => {
                      revealPlace(item);
                      showToast(`Showing ${item.name}`);
                    }}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1 text-neutral-700 truncate">{item.name}</span>
                    {item.dist !== null && (
                      <span className="text-xs text-neutral-400 flex-shrink-0" title="Straight-line distance">
                        {formatMeters(item.dist)}
                      </span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Directions panel */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-neutral-500 mb-2">Directions</p>
            <select
              value={selectedDestinationId}
              onChange={(e) => {
                const place = allPlaces.find((p) => p.id === e.target.value);
                if (place) revealPlace(place);
                else {
                  setSelectedDestinationId('');
                  setSelectedPlace(null);
                }
              }}
              className="w-full text-sm border border-neutral-300 rounded-md px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-green-700/40"
            >
              <option value="">Select destination...</option>
              {SECTIONS.map((s) => {
                const inSection = allPlaces.filter((p) => p.category === s.key);
                if (inSection.length === 0) return null;
                return (
                  <optgroup key={s.key} label={CATEGORY_LABELS[s.key]}>
                    {inSection.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <div className="flex gap-2">
              <button
                onClick={getDirections}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-md py-1.5 text-sm font-medium transition-colors"
              >
                Get Directions
              </button>
              <button
                onClick={clearMap}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md px-3 text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              onClick={recenterMap}
              className="w-full mt-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md py-1.5 text-sm font-medium transition-colors"
            >
              📍 Recenter
            </button>

            {/* Route summary: distance, time, tricycle fare, and any gap to the road */}
            {routeInfo && (
              <div className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-900" data-testid="route-summary">
                <p className="font-semibold">{routeInfo.name}</p>
                <p>
                  🛣️ {formatMeters(routeInfo.distanceM)} · ⏱️ {formatMinutes(routeInfo.minutes)}
                </p>
                <p title={TRICYCLE_FARE_NOTE}>🛺 Est. tricycle fare: {TRICYCLE_FARE_LABEL}</p>
                {routeInfo.destGapM > 30 && (
                  <p className="mt-1 text-amber-800">
                    The pin is about {formatMeters(routeInfo.destGapM)} from the nearest road (dashed line).
                  </p>
                )}
                {routeInfo.startGapM > 30 && (
                  <p className="mt-1 text-amber-800">
                    Your location is about {formatMeters(routeInfo.startGapM)} from the nearest road (dashed line).
                  </p>
                )}
              </div>
            )}

            {/* Admin only */}
            {isAdmin && (
              <button
                onClick={togglePinMode}
                className={`w-full mt-3 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  pinMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                {pinMode ? '✅ Done fixing pins' : '🛠 Fix pin positions (admin)'}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAP ─── */}
      <div className="relative min-h-0 flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm">
            Loading map…
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-700 text-sm px-6 text-center">
            Map failed to load: {mapError}
          </div>
        )}

        {/* Menu button + Home (on a phone: shown only while the menu is closed) */}
        <div className={`absolute left-3 top-3 z-20 items-center gap-2 ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}>
          <button
            onClick={toggleSidebar}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-neutral-700 shadow-md hover:bg-neutral-50"
            aria-label="Toggle menu"
          >
            <span aria-hidden="true">{sidebarOpen ? '‹' : '☰'}</span>
            <span className="md:hidden">Menu</span>
          </button>
          <Link
            href="/"
            className="flex h-9 items-center rounded-md bg-white px-3 text-sm font-medium text-neutral-700 shadow-md hover:bg-neutral-50 md:hidden"
          >
            ← Home
          </Link>
        </div>

        {/* Admin: crosshair at the center of the map (shown while a pin is selected) */}
        {pinMode && isAdmin && selectedPlace && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            data-testid="crosshair"
            aria-hidden="true"
          >
            <svg width="40" height="40" viewBox="0 0 40 40">
              <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
                <path d="M20 3v11M20 26v11M3 20h11M26 20h11" />
              </g>
              <g stroke="#e11d1d" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 3v11M20 26v11M3 20h11M26 20h11" />
              </g>
            </svg>
          </div>
        )}

        {/* Admin: Fix pin positions */}
        {pinMode && isAdmin && (
          <div
            // The panel must NEVER cover the middle of the map (that is where the pin and the crosshair are):
            // on a phone / small screen it is a sheet at the bottom; on a big screen it sits at the left.
            className="absolute inset-x-0 bottom-0 z-20 max-h-[42dvh] overflow-y-auto rounded-t-xl bg-white p-3 text-sm shadow-lg ring-1 ring-black/10 lg:inset-x-auto lg:bottom-auto lg:left-3 lg:top-14 lg:max-h-[calc(100dvh-6rem)] lg:w-80 lg:rounded-xl"
            data-testid="pin-panel"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-neutral-800">🛠 Fix pin positions</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSatellite((v) => !v)}
                  aria-pressed={satellite}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    satellite ? 'bg-sky-700 text-white' : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                  }`}
                  title="See the real buildings from above"
                >
                  🛰 {satellite ? 'Satellite on' : 'Satellite'}
                </button>
                <button
                  onClick={togglePinMode}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-200"
                >
                  Done
                </button>
              </div>
            </div>

            {/* 1) Choose the place */}
            <div className="mt-2">
              <input
                type="text"
                value={fixQuery}
                onChange={(e) => setFixQuery(e.target.value)}
                placeholder="1. Type a place name to fix…"
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/40"
                data-testid="fix-search"
              />
              {fixMatches.length > 0 && (
                <ul className="mt-1 divide-y divide-neutral-100 rounded-md border border-neutral-200" data-testid="fix-results">
                  {fixMatches.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          showPlace(p);
                          setFixQuery('');
                        }}
                        className="block w-full px-2 py-1.5 text-left text-xs hover:bg-neutral-50"
                      >
                        {p.icon} {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 2) The selected pin */}
            {!editedPlace ? (
              <p className="mt-2 text-xs leading-snug text-neutral-500">
                Or tap a pin on the map. Then <strong>drag it onto the building</strong> — turn on 🛰 Satellite to see
                the roof. Nothing changes until you press Save.
              </p>
            ) : (
              <div className="mt-2 border-t border-neutral-100 pt-2">
                <p className="font-medium text-neutral-800">
                  {editedPlace.icon} {editedPlace.name}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Saved: {editedPlace.lat.toFixed(6)}, {editedPlace.lng.toFixed(6)}
                </p>

                <p className="mt-1 text-[11px] leading-snug text-neutral-600">
                  2. <strong>Drag the big ring</strong> onto the building, <em>or</em> move the map until the red
                  crosshair is on it and press the button below.
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => pinToCrosshair(editedPlace)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    data-testid="to-crosshair"
                  >
                    🎯 Put pin at the crosshair
                  </button>
                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                    <input type="checkbox" checked={hideOthers} onChange={(e) => setHideOthers(e.target.checked)} />
                    Hide other pins
                  </label>
                </div>

                {/* nudge */}
                <div className="mt-2 flex items-center gap-3">
                  <div className="grid grid-cols-3 gap-1" data-testid="nudge">
                    <span />
                    <button onClick={() => nudgePin(editedPlace, 'n')} aria-label="Move north" data-testid="nudge-n" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200">▲</button>
                    <span />
                    <button onClick={() => nudgePin(editedPlace, 'w')} aria-label="Move west" data-testid="nudge-w" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200">◀</button>
                    <span className="flex items-center justify-center text-[10px] text-neutral-400">nudge</span>
                    <button onClick={() => nudgePin(editedPlace, 'e')} aria-label="Move east" data-testid="nudge-e" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200">▶</button>
                    <span />
                    <button onClick={() => nudgePin(editedPlace, 's')} aria-label="Move south" data-testid="nudge-s" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200">▼</button>
                    <span />
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    <p className="mb-1">Step</p>
                    <div className="flex gap-1">
                      {NUDGE_STEPS_M.map((m) => (
                        <button
                          key={m}
                          onClick={() => setNudgeStep(m)}
                          aria-pressed={nudgeStep === m}
                          data-testid={`step-${m}`}
                          className={`rounded px-2 py-1 text-[11px] font-semibold ${nudgeStep === m ? 'bg-green-700 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                        >
                          {m} m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {editedPos ? (
                  <>
                    <p className="mt-2 text-[11px] text-neutral-700">
                      New: {editedPos.lat.toFixed(6)}, {editedPos.lng.toFixed(6)} · moved{' '}
                      <strong>{formatMeters(editedMovedM)}</strong>
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => savePinEdit(editedPlace)}
                        disabled={savingId === editedPlace.id || savingAll}
                        className="flex-1 rounded-md bg-green-700 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        {savingId === editedPlace.id ? 'Saving…' : '3. Save position'}
                      </button>
                      <button
                        onClick={() => undoPinEdit(editedPlace)}
                        className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200"
                      >
                        Undo
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] text-neutral-500">The pin has not been moved yet.</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => checkPlaceOnMapbox(editedPlace)}
                    className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-200"
                  >
                    🔎 Where does Mapbox put it?
                  </button>
                  {editedAudit?.status === 'off' && editedAudit.suggestion && !editedPos && (
                    <button
                      onClick={() => useSuggestion(editedPlace)}
                      className="rounded-md bg-green-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-green-800"
                    >
                      Use Mapbox&apos;s spot ({formatMeters(editedAudit.offsetM ?? 0)})
                    </button>
                  )}
                </div>
                {editedAudit?.status === 'ok' && (
                  <p className="mt-1 text-[11px] text-green-700">✔ Matches Mapbox (within {PIN_OK_WITHIN_M} m)</p>
                )}
                {editedAudit?.status === 'none' && (
                  <p className="mt-1 text-[11px] text-neutral-500">Mapbox does not show this place near the pin.</p>
                )}
              </div>
            )}

            {/* 3) Save everything that was moved */}
            {pendingCount > 0 && (
              <button
                onClick={saveAllPinEdits}
                disabled={savingAll}
                className="mt-2 w-full rounded-md bg-green-800 py-2 text-xs font-bold text-white hover:bg-green-900 disabled:opacity-60"
                data-testid="save-all"
              >
                {savingAll ? 'Saving…' : `💾 Save all ${pendingCount} moved pin${pendingCount === 1 ? '' : 's'}`}
              </button>
            )}

            {/* Optional: check every pin automatically against Mapbox's own map (can be wrong for small shops) */}
            <details
              className="mt-3 rounded-lg border border-neutral-200 p-2"
              open={auditOpen}
              onToggle={(e) => setAuditOpen((e.currentTarget as HTMLDetailsElement).open)}
              data-testid="audit-details"
            >
              <summary className="cursor-pointer text-xs font-semibold text-neutral-700">
                🔎 Check all pins against Mapbox (optional)
              </summary>

              <div className="mt-2">
                {auditProgress ? (
                  <div data-testid="audit-progress">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{ width: `${Math.round((auditProgress.done / auditProgress.total) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-neutral-600">
                      <span>
                        Checking {auditProgress.done} / {auditProgress.total} …
                      </span>
                      <button
                        onClick={() => {
                          auditCancelRef.current = true;
                        }}
                        className="font-semibold text-red-700"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={checkAllPins}
                    disabled={categoryPlaces.length === 0}
                    className="w-full rounded-md bg-green-700 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    🔎 Check {categoryPlaces.length} pin{categoryPlaces.length === 1 ? '' : 's'}
                    {activeCategory === 'all' ? '' : ` (${CATEGORY_LABELS[activeCategory]})`} against Mapbox
                  </button>
                )}
                <p className="mt-1 text-[11px] leading-snug text-neutral-500">
                  Matches by name, so it can be wrong for small shops. Always look at the result before you save.
                </p>
              </div>

              {auditCounts.total > 0 && (
                <div className="mt-2 rounded-lg bg-neutral-50 p-2" data-testid="audit-summary">
                  <p className="text-xs text-neutral-700">
                    <strong>{auditCounts.total}</strong> checked ·{' '}
                    <span className="text-green-700">{auditCounts.ok} OK</span> ·{' '}
                    <span className="text-red-700">{auditCounts.off} off</span>
                    {auditCounts.off > 0 && <> (typically {formatMeters(auditCounts.medianOff)})</>} ·{' '}
                    <span className="text-neutral-500">{auditCounts.none} not found on Mapbox</span>
                  </p>
                  <label className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-600">
                    <input type="checkbox" checked={auditOnlyOff} onChange={(e) => setAuditOnlyOff(e.target.checked)} />
                    Only show places to fix (hide the OK ones)
                  </label>
                  <ul className="mt-1 max-h-48 divide-y divide-neutral-100 overflow-y-auto" data-testid="audit-list">
                    {auditRows.map(({ place, audit: a }) => (
                      <li key={place.id} className="flex items-center gap-2 py-1.5">
                        <button onClick={() => showPlace(place)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-xs font-medium text-neutral-800">
                            {place.icon} {place.name}
                          </span>
                          <span className={`block text-[11px] ${a.status === 'off' ? 'text-red-700' : a.status === 'ok' ? 'text-green-700' : 'text-neutral-500'}`}>
                            {a.status === 'off' && `Mapbox shows it ${formatMeters(a.offsetM ?? 0)} away`}
                            {a.status === 'ok' && `OK (${formatMeters(a.offsetM ?? 0)})`}
                            {a.status === 'none' && 'Not on Mapbox — check it by eye'}
                          </span>
                        </button>
                        {a.status === 'off' && a.suggestion && !pinEdits[place.id] && (
                          <button
                            onClick={() => useSuggestion(place)}
                            className="rounded-md bg-green-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-green-800"
                          >
                            Use
                          </button>
                        )}
                        {pinEdits[place.id] && <span className="text-[11px] font-semibold text-amber-700">moved</span>}
                      </li>
                    ))}
                    {auditRows.length === 0 && <li className="py-2 text-center text-[11px] text-neutral-500">Nothing to fix here 🎉</li>}
                  </ul>
                </div>
              )}
            </details>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white text-sm px-4 py-2 rounded-full shadow-lg ${
              pinMode && isAdmin ? 'bottom-[44dvh] lg:bottom-6' : 'bottom-6'
            }`}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}