/* ============================================================
   COMMUNITY PAGE
   EXPLORE SECTION : "community"
   ADMIN LOCATION  : Admin > Listings > Explore > Community
   Replace the page.tsx inside your Community folder.
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
const EXPLORE_SECTION = "community";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const ROUTE_SOURCE_ID = "community-route";
const ROUTE_LAYER_ID = "community-route-line";
const PIN_COLOR = "#2b6b45";

/* ══════════════════════════════════════════
  TYPES
══════════════════════════════════════════ */

// Plain string so admin-added categories work without code changes
type Category = string;
type FilterValue = "all" | Category;

interface CommunityPlace {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  image: string;
  description: string;
  mapsQuery: string;
}

interface CommunityPlaceWithDistance extends CommunityPlace {
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
// Manage them in Admin > Listings > Explore > Community.

// Optional: controls chip order and display names. Unknown (admin-added)
// categories are appended after these and shown as-is.
const PREFERRED_ORDER = ["Church", "Cemetery", "Barangay Hall", "District Hall"];
const FILTER_LABELS: Record<string, string> = {
  Church: "Churches",
  Cemetery: "Cemeteries",
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

function googleMapsDirectionsUrl(
  origin: { lat: number; lng: number } | null,
  destLat: number,
  destLng: number
): string {
  const dest = `${destLat},${destLng}`;
  if (!origin) {
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}`;
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

export default function CommunityPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CommunityPlace | null>(null);
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

  /* ── LIVE LISTINGS FROM ADMIN (Explore > "community") ── */
  const { listings: live, loading } = useExploreListings(EXPLORE_SECTION);
  const allPlaces = useMemo<CommunityPlace[]>(
    () =>
      live.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category as Category,
        lat: l.lat,
        lng: l.lng,
        tag: l.tag,
        pin: l.pin,
        image: l.image,
        description: l.description,
        mapsQuery: l.mapsQueryEncoded,
      })),
    [live]
  );

  /* ── FILTER CHIPS (built from the categories that exist, incl. admin-added ones) ── */
  const filters = useMemo<{ label: string; value: FilterValue }[]>(() => {
    const categories = sortCategories(Array.from(new Set(allPlaces.map((p) => p.category))));
    return [
      { label: "All", value: "all" },
      ...categories.map((c) => ({ label: FILTER_LABELS[c] ?? c, value: c })),
    ];
  }, [allPlaces]);

  // If the active category disappears (e.g. admin deleted its last listing), fall back to "all"
  useEffect(() => {
    if (activeFilter !== "all" && !allPlaces.some((p) => p.category === activeFilter)) {
      setActiveFilter("all");
    }
  }, [allPlaces, activeFilter]);

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
  const placesWithDistance: CommunityPlaceWithDistance[] = useMemo(() => {
    return allPlaces.map((place) => ({
      ...place,
      distKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
        : null,
    }));
  }, [userLocation, allPlaces]);

  const visiblePlaces = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = placesWithDistance.filter((place) => {
      const matchesSearch =
        !query ||
        place.name.toLowerCase().includes(query) ||
        place.description.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.tag.toLowerCase().includes(query);
      const matchesFilter = activeFilter === "all" || place.category === activeFilter;
      return matchesSearch && matchesFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
    }

    return list;
  }, [placesWithDistance, searchQuery, activeFilter, sortByNearest, userLocation]);

  /* ── MAP: init once the panel is opened ── */
  useEffect(() => {
    if (!mapPanelOpen || mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.4548, 7.1878],
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

  /* ── MAP: place/refresh the community marker and fly to it ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlace) return;

    if (placeMarkerRef.current) placeMarkerRef.current.remove();

    const el = document.createElement("div");
    el.innerHTML = `<div style="background:${PIN_COLOR};color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">${selectedPlace.pin}</span></div>`;

    const distText = userLocation
      ? `<br><strong>${formatDist(
          haversineKm(userLocation.lat, userLocation.lng, selectedPlace.lat, selectedPlace.lng)
        )}</strong> straight-line from you`
      : "";

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "260px" }).setHTML(
      `<div class="place-popup">
        <span class="popup-tag">${selectedPlace.tag}</span>
        <h4>${selectedPlace.pin} ${selectedPlace.name}</h4>
        <p>${selectedPlace.description}${distText}</p>
        <a href="${googleMapsSearchUrl(selectedPlace.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
      </div>`
    );

    placeMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([selectedPlace.lng, selectedPlace.lat])
      .setPopup(popup)
      .addTo(map)
      .togglePopup();

    map.flyTo({ center: [selectedPlace.lng, selectedPlace.lat], zoom: 17, duration: 1000 });
    setTimeout(() => map.resize(), 320);
  }, [selectedPlace, userLocation, mapPanelOpen]);

  /* ── ACTIONS ── */

  const clearRouteLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(EMPTY_ROUTE_GEOJSON);
  }, []);

  const showOnMap = useCallback(
    (place: CommunityPlace) => {
      setSelectedPlace(place);
      setRouteInfo(null);
      clearRouteLayer();
      setMapPanelOpen(true);
    },
    [clearRouteLayer]
  );

  const closeMap = useCallback(() => {
    setMapPanelOpen(false);
    setSelectedPlace(null);
    setRouteInfo(null);
  }, []);

  const getRoute = useCallback(
    async (place: CommunityPlace) => {
      if (!userLocation) {
        showToast("📍 Enable location first to get directions.");
        return;
      }
      if (!MAPBOX_TOKEN) {
        showToast("⚠️ Missing Mapbox access token.");
        return;
      }

      showOnMap(place);
      setRoutingId(place.id);

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${place.lng},${place.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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
        showToast(`🧭 Route to ${place.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`);
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
    <>
      {/* CDN External Stylesheets */}
      <link rel="icon" type="image/png" href="/image/CALINAN LOGO.png" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/style/Community.css" />

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1 className="logo">Community</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchBar"
              placeholder="Search church, barangay hall, cemetery…"
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
        {modalImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img id="modalImg" className="modal-content" alt="Community place photo" src={modalImage} />
        )}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Community Services in Calinan</h2>
        <p>
          Explore essential public spaces and institutions that serve the Calinan community. Enable
          location to see distances and get directions.
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
          : visiblePlaces.length > 0
          ? `Showing ${visiblePlaces.length} of ${allPlaces.length} places`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {visiblePlaces.map((place) => (
          <div
            key={place.id}
            className="card"
            data-name={place.name}
            data-category={place.category}
            data-lat={place.lat}
            data-lng={place.lng}
            data-tag={place.tag}
            data-maps-query={place.mapsQuery}
          >
            <div className="card-image" onClick={() => setModalImage(place.image)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={place.image} alt={place.name} />
            </div>
            <div className="card-content">
              <h3>
                <a href={googleMapsSearchUrl(place.mapsQuery)} target="_blank" rel="noreferrer">
                  {place.name}
                </a>
              </h3>
              <p>{place.description}</p>
              <span className="tag">{place.tag}</span>
              <div className={`dist-badge${place.distKm !== null ? " visible" : ""}`}>
                <div className="dot" />
                <span className="dist-text">
                  {place.distKm !== null ? formatDist(place.distKm) : ""}
                </span>
              </div>
              <div className="card-actions">
                <button className="view-map-btn" onClick={() => showOnMap(place)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn${userLocation ? " visible" : ""}${
                    routingId === place.id ? " loading" : ""
                  }`}
                  onClick={() => getRoute(place)}
                >
                  {routingId === place.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && visiblePlaces.length === 0 && (
          <div id="empty-state" className="visible" style={{ display: "flex" }}>
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
            <div id="map-panel-title">📍 {selectedPlace ? selectedPlace.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedPlace?.tag ?? ""}</div>
          </div>
          <div id="map-panel-actions">
            <a
              id="map-directions-link"
              className={selectedPlace ? "visible" : ""}
              href={
                selectedPlace
                  ? googleMapsDirectionsUrl(userLocation, selectedPlace.lat, selectedPlace.lng)
                  : "#"
              }
              target="_blank"
              rel="noreferrer"
            >
              🧭 Open in Google Maps
            </a>
            <button id="map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>
        <div id="community-map" ref={mapContainerRef} />
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