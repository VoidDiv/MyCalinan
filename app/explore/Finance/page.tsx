/* ============================================================
   FINANCE PAGE
   EXPLORE SECTION : "finance"
   ADMIN LOCATION  : Admin > Listings > Explore > Finance
   Replace the page.tsx inside your Finance folder.
   ============================================================ */

"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, LineString } from "geojson";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useExploreListings } from "@/hooks/useLiveListings";

/* ── EXPLORE SECTION KEY (must match the section in Admin > Listings > Explore) ── */
const EXPLORE_SECTION = "finance";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const ROUTE_SOURCE_ID = "finance-route";
const ROUTE_LAYER_ID = "finance-route-line";
const PIN_COLOR = "#2b6b45";

/* ══════════════════════════════════════════
  TYPES
══════════════════════════════════════════ */

// Plain string so admin-added categories work without code changes
type Category = string;
type FilterValue = "all" | Category;

export interface FinanceLocation {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  mapsQuery: string;
  image: string;
  description: string;
}

interface FinanceLocationWithDistance extends FinanceLocation {
  distKm: number | null;
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface RouteInfo {
  distanceKm: number;
  minutes: number;
}

/* ══════════════════════════════════════════
  DATA
══════════════════════════════════════════ */

// The listings for this page now come from Firestore.
// Manage them in Admin > Listings > Explore > Finance.

// Optional: controls chip order and display names. Unknown (admin-added)
// categories are appended after these and shown as-is.
const PREFERRED_ORDER = ["Bank", "Remittance"];
const FILTER_LABELS: Record<string, string> = {
  Bank: "Banks",
};

/* ══════════════════════════════════════════
  HELPERS
══════════════════════════════════════════ */

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

function formatDuration(mins: number): string {
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// mapsQuery from Firestore is already URL-encoded (mapsQueryEncoded)
function googleMapsSearchUrl(encodedQuery: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ia = PREFERRED_ORDER.indexOf(a);
    const ib = PREFERRED_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access denied. Please allow it in your browser settings.",
  2: "Location unavailable. Check your GPS or network.",
  3: "Location request timed out. Try again.",
};

const EMPTY_ROUTE_GEOJSON: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

/* ══════════════════════════════════════════
  COMPONENT
══════════════════════════════════════════ */

export default function FinancePage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<FinanceLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routingId, setRoutingId] = useState<string | null>(null);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const placeMarkerRef = useRef<mapboxgl.Marker | null>(null);

  /* ── LIVE LISTINGS FROM ADMIN (Explore > "finance") ── */
  const { listings: live, loading } = useExploreListings(EXPLORE_SECTION);
  const allLocations = useMemo<FinanceLocation[]>(
    () =>
      live.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category as Category,
        lat: l.lat,
        lng: l.lng,
        tag: l.tag,
        pin: l.pin,
        mapsQuery: l.mapsQueryEncoded,
        image: l.image,
        description: l.description,
      })),
    [live]
  );

  /* ── FILTER CHIPS (built from the categories that exist, incl. admin-added ones) ── */
  const filters = useMemo<{ label: string; value: FilterValue }[]>(() => {
    const categories = sortCategories(Array.from(new Set(allLocations.map((c) => c.category))));
    return [
      { label: "All", value: "all" },
      ...categories.map((c) => ({ label: FILTER_LABELS[c] ?? c, value: c })),
    ];
  }, [allLocations]);

  // If the active category disappears (e.g. admin deleted its last listing), fall back to "all"
  useEffect(() => {
    if (activeFilter !== "all" && !allLocations.some((c) => c.category === activeFilter)) {
      setActiveFilter("all");
    }
  }, [allLocations, activeFilter]);

  /* ── TOAST ── */
  const showToast = useCallback((message: string, duration = 3000) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /* ── ESC closes image modal ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ── GEOLOCATION ── */
  const startLocating = useCallback(() => {
    if (!("geolocation" in navigator)) {
      showToast("⚠️ Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        const message = GEOLOCATION_ERROR_MESSAGES[err.code] ?? "Could not get location.";
        setLocationError(message);
        showToast(`⚠️ ${message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [showToast]);

  /* ── DERIVED DATA ── */
  const locationsWithDistance: FinanceLocationWithDistance[] = useMemo(() => {
    return allLocations.map((loc) => ({
      ...loc,
      distKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
        : null,
    }));
  }, [userLocation, allLocations]);

  const visibleLocations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = locationsWithDistance.filter((loc) => {
      const matchesSearch =
        !query ||
        loc.name.toLowerCase().includes(query) ||
        loc.category.toLowerCase().includes(query) ||
        loc.tag.toLowerCase().includes(query);
      const matchesFilter = activeFilter === "all" || loc.category === activeFilter;
      return matchesSearch && matchesFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
    }

    return list;
  }, [locationsWithDistance, searchQuery, activeFilter, sortByNearest, userLocation]);

  /* ── MAP: init once the panel is opened ── */
  useEffect(() => {
    if (!mapPanelOpen || mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.453, 7.1876],
      zoom: 15,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapLoadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: EMPTY_ROUTE_GEOJSON });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": PIN_COLOR, "line-width": 5, "line-opacity": 0.85 },
      });
      setTimeout(() => map.resize(), 50);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      userMarkerRef.current = null;
      placeMarkerRef.current = null;
    };
  }, [mapPanelOpen]);

  /* ── MAP: keep the user marker in sync ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement("div");
    el.className = "user-dot-wrapper";
    el.innerHTML = '<div class="user-dot-ring"></div><div class="user-dot-inner"></div>';

    const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(
      '<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>'
    );

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(popup)
      .addTo(map);
  }, [userLocation, mapPanelOpen]);

  /* ── MAP: place/refresh the finance marker and fly to it ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocation) return;

    if (placeMarkerRef.current) placeMarkerRef.current.remove();

    const el = document.createElement("div");
    el.innerHTML = `<div style="background:${PIN_COLOR};color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">${selectedLocation.pin}</span></div>`;

    const distText = userLocation
      ? `<br><strong>${formatDist(
          haversineKm(userLocation.lat, userLocation.lng, selectedLocation.lat, selectedLocation.lng)
        )}</strong> straight-line from you`
      : "";

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "250px" }).setHTML(
      `<div class="finance-popup">
        <h4>${selectedLocation.name}</h4>
        <div class="popup-tag">${selectedLocation.tag}</div>
        <p>${distText}</p>
        <a href="${googleMapsSearchUrl(selectedLocation.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
      </div>`
    );

    placeMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .setPopup(popup)
      .addTo(map)
      .togglePopup();

    map.flyTo({ center: [selectedLocation.lng, selectedLocation.lat], zoom: 17, duration: 1000 });
    setTimeout(() => map.resize(), 320);
  }, [selectedLocation, userLocation, mapPanelOpen]);

  /* ── ACTIONS ── */

  const clearRouteLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(EMPTY_ROUTE_GEOJSON);
  }, []);

  const showOnMap = useCallback(
    (loc: FinanceLocation) => {
      setSelectedLocation(loc);
      setRouteInfo(null);
      clearRouteLayer();
      setMapPanelOpen(true);
    },
    [clearRouteLayer]
  );

  const closeMap = useCallback(() => {
    setMapPanelOpen(false);
    setSelectedLocation(null);
    setRouteInfo(null);
  }, []);

  const getRoute = useCallback(
    async (loc: FinanceLocation) => {
      if (!userLocation) {
        showToast("📍 Enable location first to get directions.");
        return;
      }
      if (!MAPBOX_TOKEN) {
        showToast("⚠️ Missing Mapbox access token.");
        return;
      }

      showOnMap(loc);
      setRoutingId(loc.id);

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${loc.lng},${loc.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) throw new Error("No route found");

        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const minutes = Math.round(route.duration / 60);

        const map = mapRef.current;
        if (map) {
          const applyRoute = () => {
            const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
            source?.setData({ type: "Feature", properties: {}, geometry: route.geometry });
            const coords: [number, number][] = route.geometry.coordinates;
            const bounds = coords.reduce(
              (b, c) => b.extend(c as [number, number]),
              new mapboxgl.LngLatBounds(coords[0], coords[0])
            );
            map.fitBounds(bounds, { padding: 40 });
          };
          if (mapLoadedRef.current) applyRoute();
          else map.once("load", applyRoute);
        }

        setRouteInfo({ distanceKm: Math.round(distanceKm * 10) / 10, minutes });
        showToast(`🧭 Route to ${loc.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`);
      } catch {
        showToast("⚠️ Could not load route. Check your internet connection.");
      } finally {
        setRoutingId(null);
      }
    },
    [userLocation, showOnMap, showToast]
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleSortByNearest = () => {
    if (!userLocation) return;
    setSortByNearest((prev) => !prev);
  };

  /* ══════════════════════════════════════════
    RENDER
  ══════════════════════════════════════════ */

  return (
    <div className="finance-page-wrapper">
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1 className="logo">Finance</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchBar"
              placeholder="Search bank, remittance, pawnshop…"
              autoComplete="off"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <button
            id="locate-btn"
            title="Find my location"
            className={locating ? "loading" : ""}
            disabled={locating}
            onClick={startLocating}
          >
            <div className="spinner" />
            <span className="btn-label">
              {userLocation ? "📍 Tracking" : "📍 Locate Me"}
            </span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal${modalImage ? " active" : ""}`}
        id="imageModal"
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== "IMG") setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          &times;
        </span>
        {modalImage && <img id="modalImg" className="modal-content" alt="Finance location photo" src={modalImage} />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Finance Services in Calinan</h2>
        <p>
          Find banks, remittance centers, and financial institutions near you. Enable location to
          see distances and get directions.
        </p>
        <div
          id="location-status"
          className={userLocation || locating || locationError ? "visible" : ""}
        >
          <div className={`loc-dot${locationError ? " loc-err" : ""}`} id="loc-dot" />
          <span id="loc-text">
            {locationError
              ? locationError
              : userLocation
              ? `Location active · ±${Math.round(userLocation.accuracy)} m accuracy`
              : "Detecting your location…"}
          </span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        {filters.map((f) => (
          <button
            key={f.value}
            className={`filter-chip${activeFilter === f.value ? " active" : ""}`}
            data-filter={f.value}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <button
          className={`sort-btn${sortByNearest ? " active" : ""}`}
          id="sort-btn"
          disabled={!userLocation}
          title={!userLocation ? "Enable location first" : undefined}
          onClick={toggleSortByNearest}
        >
          {sortByNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </div>
      <div id="result-count">
        {loading
          ? "Loading…"
          : visibleLocations.length > 0
          ? `Showing ${visibleLocations.length} of ${allLocations.length} locations`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {visibleLocations.map((loc) => (
          <div
            key={loc.id}
            className="card"
            data-name={loc.name}
            data-category={loc.category}
            data-lat={loc.lat}
            data-lng={loc.lng}
            data-tag={loc.tag}
            data-maps-query={loc.mapsQuery}
          >
            <div className="card-image" onClick={() => setModalImage(loc.image)}>
              <img src={loc.image} alt={loc.name} />
            </div>
            <div className="card-content">
              <h3>
                <a href={googleMapsSearchUrl(loc.mapsQuery)} target="_blank" rel="noreferrer">
                  {loc.name}
                </a>
              </h3>
              <p>{loc.description}</p>
              <span className="tag">{loc.tag}</span>
              <div className={`dist-badge${loc.distKm !== null ? " visible" : ""}`}>
                <div className="dot" />
                <span className="dist-text">
                  {loc.distKm !== null ? formatDist(loc.distKm) : ""}
                </span>
              </div>
              <div className="card-actions">
                <button className="view-map-btn" onClick={() => showOnMap(loc)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn${userLocation ? " visible" : ""}${
                    routingId === loc.id ? " loading" : ""
                  }`}
                  onClick={() => getRoute(loc)}
                >
                  {routingId === loc.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && visibleLocations.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2b6b45" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <h3>No results found</h3>
            <p>Try a different search term or filter.</p>
          </div>
        )}
      </section>

      {/* SPACER */}
      <div id="map-panel-spacer" className={mapPanelOpen ? "active" : ""} />

      {/* MAP PANEL */}
      <div id="map-panel" className={mapPanelOpen ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {selectedLocation ? selectedLocation.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedLocation?.tag ?? ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedLocation && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(selectedLocation.mapsQuery)}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button id="map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>
        <div id="finance-map" ref={mapContainerRef} />
        <div id="route-info" className={routeInfo ? "visible" : ""}>
          <span>
            🛣️ Road distance:{" "}
            <strong id="route-dist">{routeInfo ? `${routeInfo.distanceKm} km` : "–"}</strong>
          </span>
          <span>
            ⏱️ Estimated time:{" "}
            <strong id="route-time">
              {routeInfo ? formatDuration(routeInfo.minutes) : "–"}
            </strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div id="toast" className={toast ? "show" : ""}>
        {toast}
      </div>
    </div>
  );
}