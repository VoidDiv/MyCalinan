/* ============================================================
   FILE: components/LocationPicker.tsx   (NEW)
   A small map for choosing the EXACT spot of a place. Used by:
   - Admin > Listings (add / edit / approve an establishment)
   - Business registration (the owner pins their own business)

   How to use it (visitors of this component do any of these):
   - tap the map, or drag the big ring, onto the building
   - 🛰 Satellite: see the real roof and drop the pin right on it
   - move the map until the red crosshair is on the building, press 🎯
   - ▲ ▼ ◀ ▶ nudge the pin 1 / 3 / 10 meters
   - 📍 Use my current location (only if you are AT the place): picks the
     most precise GPS reading it can get, and shows the ±accuracy circle
   - "Find": looks the name up on Mapbox and FLIES the map there. It never
     fills in the coordinates for you — you put the pin yourself, so the saved
     position is the one you chose (search results are often a few hundred
     meters off, and Mapbox does not allow storing its search results).

   The component is CONTROLLED: give it lat / lng and listen to onChange.
   ============================================================ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, FeatureCollection } from "geojson";
import { circlePolygon, formatMeters, isInDavao, metersBetween } from "@/lib/geo";

const CALINAN_CENTER: [number, number] = [125.4532, 7.1876];
const STREETS_STYLE = "mapbox://styles/mapbox/streets-v12";
const SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
/** Search area for "Find": all of Davao City and a little around it (west, south, east, north). */
const DAVAO_BBOX = "125.30,7.00,125.65,7.35";
const NUDGE_STEPS_M = [1, 3, 10] as const;
const ACCURACY_SRC = "picker-accuracy";
/** A GPS reading this good (in meters) ends the search for a better one. */
const GPS_GOOD_ENOUGH_M = 12;
const GPS_MAX_WAIT_MS = 15000;
/** Worse than this and the owner is told to drag the pin by hand. */
const GPS_WEAK_M = 60;

export interface PickedLocation {
  lat: number;
  lng: number;
  /** only when the pin came from GPS: how precise the reading was, in meters */
  accuracyM?: number;
  method: "map" | "gps" | "typed";
}

export interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (picked: PickedLocation) => void;
  /** Text put in the "Find" box (for example the business name + address). */
  searchHint?: string;
  /** The position that is already saved (when editing): the picker shows how far the pin moved from it. */
  savedLat?: number | null;
  savedLng?: number | null;
  /** Show the "Use my current location" button (right for an owner at their shop; not for an admin at a desk). */
  allowGps?: boolean;
  /** Height of the map in pixels. */
  height?: number;
}

interface Suggestion {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
/** A real place on earth. (Typed numbers like 125.45 / 7.18 in the wrong boxes must not reach Mapbox: it would throw.) */
const isCoord = (la: unknown, ln: unknown): boolean => isNum(la) && isNum(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The big ring you drag. Its CENTER is the exact spot; the ring is see-through so you can see the roof under it. */
function createRingElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:56px;height:56px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;z-index:5;";
  const ring = document.createElement("div");
  ring.style.cssText =
    "position:relative;width:48px;height:48px;border-radius:50%;border:3px solid #1a5c38;background:rgba(255,255,255,.22);" +
    "box-shadow:0 0 0 2px #fff,0 3px 10px rgba(0,0,0,.5);";
  const line = "position:absolute;background:#e11d1d;border-radius:1px;";
  const v = document.createElement("div");
  v.style.cssText = `${line}left:50%;top:5px;bottom:5px;width:2px;margin-left:-1px;`;
  const h = document.createElement("div");
  h.style.cssText = `${line}top:50%;left:5px;right:5px;height:2px;margin-top:-1px;`;
  ring.appendChild(v);
  ring.appendChild(h);
  el.appendChild(ring);
  return el;
}

/** The blue dot that marks "Mapbox thinks the place is around here" (not draggable, not saved). */
function createSuggestionElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:22px;height:22px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 6px rgba(26,115,232,.3);pointer-events:none;";
  return el;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
  searchHint = "",
  savedLat = null,
  savedLng = null,
  allowGps = true,
  height = 300,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const suggestionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const loadedRef = useRef(false);
  const overlayRef = useRef<FeatureCollection | Feature | null>(null); // last GPS circle (redrawn after a base-map change)
  const lastEmittedRef = useRef<string>("");
  const satelliteShownRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // always call the LATEST onChange (the map handlers are created once)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [nudgeStep, setNudgeStep] = useState<number>(3);
  const [query, setQuery] = useState(searchHint);
  const queryTouchedRef = useRef(false); // true once the person has typed in the Find box themselves
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [gps, setGps] = useState<{ state: "idle" | "working" | "done" | "error"; accuracyM?: number; message?: string }>({ state: "idle" });

  const hasPin = isCoord(lat, lng);
  const invalidNumbers = isNum(lat) && isNum(lng) && !hasPin;
  const hasSaved = isNum(savedLat) && isNum(savedLng);

  /* The Find box follows the hint (name + address typed in the form) until the person types in it themselves */
  useEffect(() => {
    if (!queryTouchedRef.current) setQuery(searchHint);
  }, [searchHint]);

  /* ───────── tell the parent where the pin is ───────── */
  const emit = useCallback((p: PickedLocation) => {
    const rounded = { ...p, lat: round6(p.lat), lng: round6(p.lng) };
    lastEmittedRef.current = `${rounded.lat},${rounded.lng}`;
    onChangeRef.current(rounded);
  }, []);

  /* ───────── the GPS accuracy circle (kept in a ref so it survives a base-map change) ───────── */
  const drawAccuracy = useCallback((data: FeatureCollection | Feature | null) => {
    overlayRef.current = data;
    const src = mapRef.current?.getSource(ACCURACY_SRC) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(data ?? { type: "FeatureCollection", features: [] });
  }, []);

  const addOverlay = useCallback((map: mapboxgl.Map) => {
    if (!map.getSource(ACCURACY_SRC)) {
      map.addSource(ACCURACY_SRC, { type: "geojson", data: overlayRef.current ?? { type: "FeatureCollection", features: [] } });
    }
    if (!map.getLayer("picker-accuracy-fill")) {
      map.addLayer({ id: "picker-accuracy-fill", type: "fill", source: ACCURACY_SRC, paint: { "fill-color": "#1a73e8", "fill-opacity": 0.15 } });
    }
    if (!map.getLayer("picker-accuracy-line")) {
      map.addLayer({ id: "picker-accuracy-line", type: "line", source: ACCURACY_SRC, paint: { "line-color": "#1a73e8", "line-width": 1.5, "line-opacity": 0.6 } });
    }
  }, []);

  /* ───────── create the map once ───────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    if (!mapboxgl.accessToken) {
      setMapError("Missing Mapbox access token.");
      return;
    }

    const start = isCoord(lat, lng) ? ([lng as number, lat as number] as [number, number]) : CALINAN_CENTER;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STREETS_STYLE,
      center: start,
      zoom: isCoord(lat, lng) ? 17 : 14,
      // north-up and flat (a turned or tilted map makes it hard to see where the pin is)
      bearing: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // the mouse wheel must keep scrolling the page / the form, not zoom the map
      scrollZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;
    loadedRef.current = false;
    satelliteShownRef.current = false;
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      loadedRef.current = true;
      addOverlay(map);
      setMapReady(true);
      requestAnimationFrame(() => map.resize());
    });
    // a new base map (streets <-> satellite) removes our layer: put it back
    const restore = () => {
      if (loadedRef.current && map.isStyleLoaded()) addOverlay(map);
    };
    map.on("style.load", restore);
    map.on("styledata", restore);

    // tap the map = put the pin there
    map.on("click", (e) => emit({ lat: e.lngLat.lat, lng: e.lngLat.lng, method: "map" }));

    map.on("error", (e) => {
      if (!loadedRef.current) setMapError(e?.error?.message || "The map could not load.");
    });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
      suggestionMarkerRef.current?.remove();
      suggestionMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
      setMapReady(false);
    };
    // the map is created once; its start position is read only here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOverlay, emit]);

  /* ───────── the draggable pin follows lat / lng ───────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!isCoord(lat, lng)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const pinLat = lat as number;
    const pinLng = lng as number;

    if (!markerRef.current) {
      const marker = new mapboxgl.Marker({ element: createRingElement(), draggable: true }).setLngLat([pinLng, pinLat]).addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        setGps((g) => (g.state === "working" ? g : { state: "idle" })); // a hand-placed pin no longer has a GPS accuracy
        drawAccuracy(null);
        emit({ lat: ll.lat, lng: ll.lng, method: "map" });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([pinLng, pinLat]);
    }

    // the coordinates were TYPED (or changed from outside): bring the map to them
    if (lastEmittedRef.current !== `${round6(pinLat)},${round6(pinLng)}`) {
      map.easeTo({ center: [pinLng, pinLat], zoom: Math.max(map.getZoom(), 16), duration: 500 });
    }
  }, [lat, lng, mapReady, drawAccuracy, emit]);

  /* ───────── 🛰 satellite <-> streets ───────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (satelliteShownRef.current === satellite) return;
    satelliteShownRef.current = satellite;
    // diff:false = build the new base map from scratch (a clean 'style.load'; no half-updated layers)
    map.setStyle(satellite ? SATELLITE_STYLE : STREETS_STYLE, { diff: false } as Parameters<mapboxgl.Map["setStyle"]>[1]);
  }, [satellite, mapReady]);

  /* ───────── actions ───────── */
  const pinToCrosshair = () => {
    const c = mapRef.current?.getCenter();
    if (!c) return;
    drawAccuracy(null);
    setGps({ state: "idle" });
    emit({ lat: c.lat, lng: c.lng, method: "map" });
  };

  const nudge = (dir: "n" | "s" | "e" | "w") => {
    const ll = markerRef.current?.getLngLat();
    if (!ll) return;
    const dLat = (nudgeStep / 110574) * (dir === "n" ? 1 : dir === "s" ? -1 : 0);
    const dLng = (nudgeStep / (111320 * Math.cos((ll.lat * Math.PI) / 180))) * (dir === "e" ? 1 : dir === "w" ? -1 : 0);
    drawAccuracy(null);
    setGps({ state: "idle" });
    emit({ lat: ll.lat + dLat, lng: ll.lng + dLng, method: "map" });
  };

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    gpsTimerRef.current = null;
  }, []);

  /** Listens to the GPS for up to 15 s and keeps the MOST PRECISE reading (the first one is usually a rough guess). */
  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps({ state: "error", message: "This device cannot share its location. Tap the map instead." });
      return;
    }
    stopGps();
    setGps({ state: "working" });
    let bestAcc = Infinity;

    const finish = () => {
      stopGps();
      setGps((g) => (g.state === "working" ? (bestAcc === Infinity ? { state: "error", message: "No location received. Tap the map instead." } : { state: "done", accuracyM: bestAcc }) : g));
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        if (!(acc < bestAcc)) return; // keep only a better reading
        bestAcc = acc;
        const { latitude, longitude } = pos.coords;
        setGps({ state: "working", accuracyM: acc });
        drawAccuracy({ type: "FeatureCollection", features: [circlePolygon(latitude, longitude, acc)] });
        emit({ lat: latitude, lng: longitude, accuracyM: Math.round(acc), method: "gps" });
        mapRef.current?.easeTo({ center: [longitude, latitude], zoom: acc <= 30 ? 18 : acc <= 100 ? 17 : 16, duration: 400 });
        if (acc <= GPS_GOOD_ENOUGH_M) finish();
      },
      (err) => {
        // Only "permission denied" is final. A phone often reports "position unavailable" or "timeout" for a moment
        // (a weak signal indoors) and then recovers, so keep listening until the 15 seconds are over —
        // finish() tells the person if no reading ever arrived.
        if (err.code !== 1) return;
        stopGps();
        setGps({ state: "error", message: "Location is turned off for this site. Allow it in your browser, or tap the map." });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    gpsTimerRef.current = setTimeout(finish, GPS_MAX_WAIT_MS);
  };

  const find = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchNote(null);
    setResults([]);
    try {
      const text = /calinan|davao/i.test(q) ? q : `${q} Calinan Davao City`;
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json` +
        `?proximity=${CALINAN_CENTER[0]},${CALINAN_CENTER[1]}&bbox=${DAVAO_BBOX}&country=PH` +
        `&types=poi,address,neighborhood,locality&limit=6&language=en&access_token=${mapboxgl.accessToken}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { features?: { id: string; text?: string; place_name?: string; center?: [number, number] }[] };
      const list: Suggestion[] = (data.features ?? [])
        .filter((f) => Array.isArray(f.center) && f.center.length === 2)
        .map((f) => ({ id: f.id, name: f.text ?? "", fullName: f.place_name ?? "", lng: (f.center as [number, number])[0], lat: (f.center as [number, number])[1] }));
      setResults(list);
      if (list.length === 0) setSearchNote("Mapbox does not know this place. Tap the map to put the pin yourself.");
    } catch {
      setSearchNote("Could not search right now. Tap the map to put the pin yourself.");
    } finally {
      setSearching(false);
    }
  };

  /** Show where Mapbox thinks it is. Only a hint: the pin is placed by YOU. */
  const showSuggestion = (s: Suggestion) => {
    const map = mapRef.current;
    if (!map) return;
    setSuggestion(s);
    setResults([]);
    suggestionMarkerRef.current?.remove();
    suggestionMarkerRef.current = new mapboxgl.Marker({ element: createSuggestionElement(), anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(map);
    map.flyTo({ center: [s.lng, s.lat], zoom: 18, duration: 800 });
  };

  const clearSuggestion = () => {
    suggestionMarkerRef.current?.remove();
    suggestionMarkerRef.current = null;
    setSuggestion(null);
  };

  /* ───────── what to tell the person ───────── */
  const moved = hasPin && hasSaved ? metersBetween(lat as number, lng as number, savedLat as number, savedLng as number) : null;
  const outside = hasPin && !isInDavao(lat as number, lng as number);
  const btn = "rounded-md px-2.5 py-1.5 text-xs font-semibold";

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white text-sm" data-testid="location-picker">
      {/* Find */}
      <div className="border-b border-neutral-200 p-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              queryTouchedRef.current = true;
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void find();
              }
            }}
            placeholder="Find the place (name, street)…"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            data-testid="lp-search"
          />
          <button type="button" onClick={() => void find()} disabled={searching} className={`${btn} bg-green-700 text-white hover:bg-green-800 disabled:opacity-60`} data-testid="lp-find">
            {searching ? "…" : "Find"}
          </button>
        </div>

        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-neutral-100 rounded-md border border-neutral-200" data-testid="lp-results">
            {results.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => showSuggestion(r)} className="block w-full px-2 py-1.5 text-left hover:bg-neutral-50">
                  <span className="block text-xs font-semibold text-neutral-800">{r.name}</span>
                  <span className="block truncate text-[11px] text-neutral-500">{r.fullName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchNote && <p className="mt-1 text-[11px] text-amber-700">{searchNote}</p>}
        {suggestion && (
          <p className="mt-1 text-[11px] leading-snug text-sky-800" data-testid="lp-suggestion">
            🔵 Mapbox thinks <strong>{suggestion.name}</strong> is around the blue dot. It can be a little off — <strong>tap the map</strong> (or press 🎯)
            on the real building to put the pin yourself.{" "}
            <button type="button" onClick={clearSuggestion} className="font-semibold underline">
              hide
            </button>
          </p>
        )}
      </div>

      {/* Map */}
      <div className="relative" style={{ height }}>
        {/* Inline style on purpose: mapbox-gl.css sets ".mapboxgl-map { position: relative }" and, being outside
            Tailwind's layers, it would beat the "absolute inset-0" classes and leave the map with no height. */}
        <div ref={containerRef} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
        {!mapReady && !mapError && <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-xs text-neutral-500">Loading map…</div>}
        {mapError && <div className="absolute inset-0 flex items-center justify-center bg-red-50 px-4 text-center text-xs text-red-700">Map failed to load: {mapError}</div>}

        {/* crosshair at the center of the map */}
        {mapReady && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" data-testid="lp-crosshair" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 40 40">
              <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
                <path d="M20 3v11M20 26v11M3 20h11M26 20h11" />
              </g>
              <g stroke="#e11d1d" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 3v11M20 26v11M3 20h11M26 20h11" />
              </g>
            </svg>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSatellite((v) => !v)}
          aria-pressed={satellite}
          className={`absolute left-2 top-2 z-10 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow ${satellite ? "bg-sky-700 text-white" : "bg-white text-sky-900"}`}
          data-testid="lp-satellite"
        >
          🛰 {satellite ? "Satellite on" : "Satellite"}
        </button>
      </div>

      {/* Controls */}
      <div className="space-y-2 p-2">
        <p className="text-[11px] leading-snug text-neutral-600">
          <strong>Tap the map</strong> or <strong>drag the big ring</strong> onto the building. Turn on 🛰 Satellite to see the roof. Or move the map until the red crosshair is on it and
          press 🎯.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={pinToCrosshair} disabled={!mapReady} className={`${btn} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50`} data-testid="lp-crosshair-btn">
            🎯 Put pin at the crosshair
          </button>
          {allowGps && (
            <button type="button" onClick={useMyLocation} disabled={!mapReady || gps.state === "working"} className={`${btn} bg-sky-100 text-sky-900 hover:bg-sky-200 disabled:opacity-60`} data-testid="lp-gps">
              📍 {gps.state === "working" ? "Finding you…" : "Use my current location"}
            </button>
          )}
          {gps.state === "working" && (
            <button type="button" onClick={() => { stopGps(); setGps((g) => ({ ...g, state: g.accuracyM ? "done" : "idle" })); }} className={`${btn} bg-neutral-100 text-neutral-700`} data-testid="lp-gps-stop">
              Use this
            </button>
          )}
        </div>

        {allowGps && gps.state === "idle" && <p className="text-[11px] text-neutral-500">Only press 📍 if you are standing at the place right now.</p>}
        {gps.state === "working" && (
          <p className="text-[11px] text-sky-800" data-testid="lp-gps-status">
            Looking for the most precise reading… {gps.accuracyM ? `now ±${Math.round(gps.accuracyM)} m` : "waiting for the first one"}
          </p>
        )}
        {gps.state === "done" && gps.accuracyM !== undefined && (
          <p className={`text-[11px] ${gps.accuracyM <= GPS_WEAK_M ? "text-green-700" : "text-amber-700"}`} data-testid="lp-gps-status">
            {gps.accuracyM <= GPS_WEAK_M
              ? `✔ GPS reading ±${Math.round(gps.accuracyM)} m. Check that the ring is on your building.`
              : `⚠ The signal is weak (±${Math.round(gps.accuracyM)} m, the blue circle). Drag the ring onto your building by hand.`}
          </p>
        )}
        {gps.state === "error" && <p className="text-[11px] text-red-700" data-testid="lp-gps-status">{gps.message}</p>}

        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <button type="button" onClick={() => nudge("n")} disabled={!hasPin} aria-label="Move pin north" data-testid="lp-nudge-n" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200 disabled:opacity-40">▲</button>
            <span />
            <button type="button" onClick={() => nudge("w")} disabled={!hasPin} aria-label="Move pin west" data-testid="lp-nudge-w" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200 disabled:opacity-40">◀</button>
            <span className="flex items-center justify-center text-[10px] text-neutral-400">nudge</span>
            <button type="button" onClick={() => nudge("e")} disabled={!hasPin} aria-label="Move pin east" data-testid="lp-nudge-e" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200 disabled:opacity-40">▶</button>
            <span />
            <button type="button" onClick={() => nudge("s")} disabled={!hasPin} aria-label="Move pin south" data-testid="lp-nudge-s" className="h-7 w-9 rounded bg-neutral-100 text-xs font-bold hover:bg-neutral-200 disabled:opacity-40">▼</button>
            <span />
          </div>
          <div className="text-[11px] text-neutral-600">
            <p className="mb-1">Step</p>
            <div className="flex gap-1">
              {NUDGE_STEPS_M.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setNudgeStep(m)}
                  aria-pressed={nudgeStep === m}
                  data-testid={`lp-step-${m}`}
                  className={`rounded px-2 py-1 text-[11px] font-semibold ${nudgeStep === m ? "bg-green-700 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
                >
                  {m} m
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-neutral-700" data-testid="lp-status">
          {hasPin ? (
            <>
              📌 Pin: <strong>{(lat as number).toFixed(6)}, {(lng as number).toFixed(6)}</strong>
              {moved !== null && moved >= 1 && <> · moved <strong>{formatMeters(moved)}</strong> from the saved spot</>}
            </>
          ) : (
            <span className="text-amber-700">No pin yet — tap the map where the place is.</span>
          )}
        </p>
        {invalidNumbers && (
          <p className="text-[11px] font-semibold text-red-700" data-testid="lp-invalid">
            ⚠ These numbers are not valid coordinates (latitude must be between -90 and 90). Are they swapped?
          </p>
        )}
        {outside && (
          <p className="text-[11px] font-semibold text-red-700" data-testid="lp-outside">
            ⚠ This spot is outside Davao City. Check the position.
          </p>
        )}
      </div>
    </div>
  );
}