/* ============================================================
   LIFESTYLE PAGE
   Replace the page.tsx inside your Lifestyle folder.
   ============================================================ */

"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useExploreListings } from "@/hooks/useLiveListings"; // ← every listing comes from Firestore (admin add/edit/delete)

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const ROUTE_SOURCE_ID = "lifestyle-route";
const ROUTE_LAYER_ID = "lifestyle-route-line";

/* ══════════════════════════════════════════
  TYPES
══════════════════════════════════════════ */

// Category is a plain string so the admin can add new ones (e.g. "Spa", "Restaurant")
type Category = string;
type FilterValue = "all" | Category;

export interface LocationItem {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  mapsQuery: string;
  imageSrc: string;
  address: string;
  description: string;
}

interface LocationWithDistance extends LocationItem {
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
// Manage them in Admin > Listings > Explore.

/* ══════════════════════════════════════════
  HELPERS
══════════════════════════════════════════ */

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Fallback map pin when a Firestore listing has no pin emoji of its own
function defaultPin(category: string): string {
  switch (category.toLowerCase()) {
    case "gym":
      return "🏋️";
    case "hotel":
      return "🏨";
    default:
      return "📍";
  }
}

// Listings from Firestore are admin-entered text — escape before injecting into popup HTML
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMPTY_LINE = {
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: [] as number[][] },
};

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access denied. Please allow it in your browser settings.",
  2: "Location unavailable. Check your GPS or network.",
  3: "Location request timed out. Try again.",
};

/* ══════════════════════════════════════════
  COMPONENT
══════════════════════════════════════════ */

export default function LifestylePage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LocationItem | null>(null);
  const [focusNonce, setFocusNonce] = useState(0); // bumps so "View on Map" re-centers even for the same item
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLocationRef = useRef<UserLocation | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const itemMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  /* ── LIVE LISTINGS FROM ADMIN (Firestore) ── */
  const { listings: live, loading } = useExploreListings("lifestyle");
  const allLocations = useMemo<LocationItem[]>(
    () => [
      ...live.map((l) => {
        // `address` and `pin` are optional extras — fall back safely if the hook doesn't return them
        const extra = l as typeof l & { address?: string; pin?: string };
        return {
          id: l.id,
          name: l.name,
          category: l.category as Category,
          lat: l.lat,
          lng: l.lng,
          tag: l.tag,
          pin: extra.pin || defaultPin(l.category),
          mapsQuery: l.mapsQueryEncoded,
          imageSrc: l.image,
          address: extra.address ?? "",
          description: l.description,
        };
      }),
    ],
    [live]
  );

  /* ── FILTER CHIPS (built from whatever categories exist, incl. admin-added ones) ── */
  const filters = useMemo<{ label: string; value: FilterValue }[]>(() => {
    const categories = Array.from(new Set(allLocations.map((l) => l.category)));
    return [
      { label: "All", value: "all" },
      ...categories.map((c) => ({ label: c, value: c })),
    ];
  }, [allLocations]);

  // If the active category disappears (e.g. admin deleted the last listing in it), fall back to "all"
  useEffect(() => {
    if (
      activeFilter !== "all" &&
      !allLocations.some((l) => l.category === activeFilter)
    ) {
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

  /* ── ESC closes the image modal ── */
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
        const message =
          GEOLOCATION_ERROR_MESSAGES[err.code] ?? "Could not get location.";
        setLocationError(message);
        showToast(`⚠️ ${message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [showToast]);

  /* ── DERIVED DATA ── */
  const locationsWithDistance: LocationWithDistance[] = useMemo(() => {
    return allLocations.map((item) => ({
      ...item,
      distKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, item.lat, item.lng)
        : null,
    }));
  }, [userLocation, allLocations]);

  const visibleLocations = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = locationsWithDistance.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query);
      const matchesFilter =
        activeFilter === "all" || item.category === activeFilter;
      return matchesSearch && matchesFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort(
        (a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity)
      );
    }

    return list;
  }, [locationsWithDistance, searchQuery, activeFilter, sortByNearest, userLocation]);

  /* ── MAP: init once the panel is opened, tear down when it closes ── */
  useEffect(() => {
    if (!mapPanelOpen || mapRef.current || !mapContainerRef.current) return;

    if (!MAPBOX_TOKEN) {
      showToast("⚠️ Missing Mapbox access token.");
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.453, 7.188],
      zoom: 14,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapLoadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: EMPTY_LINE });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2e8b57", "line-width": 5, "line-opacity": 0.85 },
      });
      setTimeout(() => map.resize(), 50);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      userMarkerRef.current = null;
      itemMarkerRef.current = null;
    };
  }, [mapPanelOpen, showToast]);

  /* ── MAP: keep the user marker in sync ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement("div");
    el.className = "user-dot-wrapper";
    el.innerHTML = `<div class="user-dot-ring"></div><div class="user-dot-inner"></div>`;

    const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(
      '<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>'
    );

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(popup)
      .addTo(map);
  }, [userLocation, mapPanelOpen]);

  /* ── MAP: place the item marker and fly to it ──
     Deliberately does NOT depend on userLocation, so GPS updates
     don't keep re-centering the map and undoing the route view. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedItem) return;

    if (itemMarkerRef.current) itemMarkerRef.current.remove();

    const el = document.createElement("div");
    el.style.cssText =
      "background:#2e8b57;color:white;font-size:16px;width:36px;height:36px;" +
      "border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;" +
      "align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);" +
      "border:2px solid white;";
    el.innerHTML = `<span style="transform:rotate(45deg)">${escapeHtml(selectedItem.pin)}</span>`;

    const loc = userLocationRef.current;
    const distText = loc
      ? `<br><strong>${formatDist(
          haversineKm(loc.lat, loc.lng, selectedItem.lat, selectedItem.lng)
        )}</strong> straight-line from you`
      : "";

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "250px" }).setHTML(
      `<div class="place-popup">
        <h4>${escapeHtml(selectedItem.name)}</h4>
        <div class="popup-tag">${escapeHtml(selectedItem.tag)}</div>
        <p>${distText}</p>
        <a href="${googleMapsSearchUrl(selectedItem.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
      </div>`
    );

    itemMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([selectedItem.lng, selectedItem.lat])
      .setPopup(popup)
      .addTo(map)
      .togglePopup();

    map.flyTo({ center: [selectedItem.lng, selectedItem.lat], zoom: 17, duration: 1000 });
    setTimeout(() => map.resize(), 320);
  }, [selectedItem, focusNonce, mapPanelOpen]);

  /* ── ACTIONS ── */

  const clearRouteLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(EMPTY_LINE);
  }, []);

  const showOnMap = useCallback(
    (item: LocationItem) => {
      setSelectedItem(item);
      setFocusNonce((n) => n + 1);
      setRouteInfo(null);
      clearRouteLayer();
      setMapPanelOpen(true);
    },
    [clearRouteLayer]
  );

  const closeMap = useCallback(() => {
    setMapPanelOpen(false);
    setSelectedItem(null);
    setRouteInfo(null);
  }, []);

  const getRoute = useCallback(
    async (item: LocationItem) => {
      if (!userLocation) {
        showToast("📍 Enable location first to get directions.");
        return;
      }
      if (!MAPBOX_TOKEN) {
        showToast("⚠️ Missing Mapbox access token.");
        return;
      }

      showOnMap(item);
      setRouting(true);

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${item.lng},${item.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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
            source?.setData({
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            });
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
        showToast(
          `🧭 Route to ${item.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`
        );
      } catch {
        showToast("⚠️ Could not load route. Check your internet connection.");
      } finally {
        setRouting(false);
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
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1 className="logo">Lifestyle</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchBar"
              placeholder="Search Gym, Hotel…"
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
              {locating ? "Locating..." : userLocation ? "📍 Tracking" : "📍 Locate Me"}
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
        {modalImage && (
          <img id="modalImg" className="modal-content" src={modalImage} alt="Preview" />
        )}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Relax & Recharge in Calinan</h2>
        <p>
          Discover gyms and hotels around the Calinan area. Enable location to
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

      {/* RESULT COUNT */}
      <div id="result-count">
        {loading
          ? "Loading…"
          : visibleLocations.length > 0
          ? `Showing ${visibleLocations.length} of ${allLocations.length} locations`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {visibleLocations.map((item) => (
          <div
            key={item.id}
            className="card"
            data-name={item.name}
            data-category={item.category}
            data-lat={item.lat}
            data-lng={item.lng}
            data-tag={item.tag}
            data-maps-query={item.mapsQuery}
          >
            <div className="card-image" onClick={() => setModalImage(item.imageSrc)}>
              <img src={item.imageSrc} alt={item.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={googleMapsSearchUrl(item.mapsQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.name}
                </a>
              </h3>
              <p>
                {item.address && (
                  <>
                    <strong>{item.address}</strong> —{" "}
                  </>
                )}
                {item.description}
              </p>
              <span className="tag">{item.tag}</span>
              <div className={`dist-badge${item.distKm !== null ? " visible" : ""}`}>
                <div className="dot" />
                <span className="dist-text">
                  {item.distKm !== null ? formatDist(item.distKm) : ""}
                </span>
              </div>
              <div className="card-actions">
                <button className="view-map-btn" onClick={() => showOnMap(item)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn${userLocation ? " visible" : ""}${
                    routing && selectedItem?.id === item.id ? " loading" : ""
                  }`}
                  onClick={() => getRoute(item)}
                >
                  {routing && selectedItem?.id === item.id
                    ? "⏳ Loading route…"
                    : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && visibleLocations.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2e8b57" strokeWidth={1.5}>
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
            <div id="map-panel-title">📍 {selectedItem ? selectedItem.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedItem?.tag ?? ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedItem && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(selectedItem.mapsQuery)}
                target="_blank"
                rel="noopener noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button id="map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>

        <div id="lifestyle-map" ref={mapContainerRef} />

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
    </>
  );
}