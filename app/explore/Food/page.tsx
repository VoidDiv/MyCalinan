/* ============================================================
   FOOD & DINING PAGE
   EXPLORE SECTION : "food"
   ADMIN LOCATION  : Admin > Listings > Explore > Food & Dining
   Replace the page.tsx inside your Food & Dining folder.
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
const EXPLORE_SECTION = "food";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const ROUTE_SOURCE_ID = "food-route";
const ROUTE_LAYER_ID = "food-route-line";
const PIN_COLOR = "#c0392b";

/* ══════════════════════════════════════════
  TYPES
══════════════════════════════════════════ */

// Plain string so admin-added categories work without code changes
type Category = string;
type FilterValue = "all" | Category;

interface FoodPlace {
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

interface FoodPlaceWithDistance extends FoodPlace {
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
// Manage them in Admin > Listings > Explore > Food & Dining.

// Optional: controls the order of the filter chips. Unknown (admin-added)
// categories are appended after these, alphabetically.
const PREFERRED_ORDER = ["Restaurant", "Eatery", "Fast-Food", "Cafe", "Bakeshop", "Bar"];

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

export default function FoodDiningPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<FoodPlace | null>(null);
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

  /* ── LIVE LISTINGS FROM ADMIN (Explore > "food") ── */
  const { listings: live, loading } = useExploreListings(EXPLORE_SECTION);
  const allPlaces = useMemo<FoodPlace[]>(
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
    const categories = sortCategories(Array.from(new Set(allPlaces.map((p) => p.category))));
    return [{ label: "All", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))];
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
  const placesWithDistance: FoodPlaceWithDistance[] = useMemo(() => {
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
      center: [125.4535, 7.1885],
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
    el.className = "food-user-dot-wrapper";
    el.innerHTML = '<div class="food-user-dot-ring"></div><div class="food-user-dot-inner"></div>';

    const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(
      '<div class="food-user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>'
    );

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(popup)
      .addTo(map);
  }, [userLocation, mapPanelOpen]);

  /* ── MAP: place/refresh the food marker and fly to it ── */
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

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "250px" }).setHTML(
      `<div class="food-place-popup">
        <span class="food-popup-tag">${selectedPlace.tag}</span>
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
    (place: FoodPlace) => {
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
    async (place: FoodPlace) => {
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
    <main className="food-dining-page">
      {/* HEADER */}
      <header className="food-header">
        <div className="food-header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1>Food &amp; Dining</h1>
        </div>

        <div className="food-header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search restaurant, cafe..."
              aria-label="Search food places"
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            title="Find my location"
            className={locating ? "loading" : ""}
            disabled={locating}
            onClick={startLocating}
          >
            {locating ? "Locating..." : userLocation ? "📍 Tracking" : "📍 Locate Me"}
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal${modalImage ? " active" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== "IMG") setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          &times;
        </span>
        {modalImage && <img className="modal-content" alt="Food place photo" src={modalImage} />}
      </div>

      {/* HERO */}
      <section className="food-hero">
        <h2>Savor the Flavors of Calinan</h2>
        <p>
          Discover restaurants, eateries, cafés, bakeshops, and other food places around the Calinan
          area. Enable location to see distances and get directions.
        </p>
        <div
          id="location-status"
          className={userLocation || locating || locationError ? "visible" : ""}
        >
          <div className={`loc-dot${locationError ? " loc-err" : ""}`} />
          <span>
            {locationError
              ? locationError
              : userLocation
              ? `Location active · ±${Math.round(userLocation.accuracy)} m accuracy`
              : "Detecting your location…"}
          </span>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="food-toolbar">
        <div className="category-filters">
          {filters.map((f) => (
            <button
              type="button"
              key={f.value}
              className={activeFilter === f.value ? "active" : ""}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!userLocation}
          title={!userLocation ? "Enable location first" : undefined}
          onClick={toggleSortByNearest}
        >
          {sortByNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </section>

      <div className="food-result-count">
        {loading
          ? "Loading…"
          : visiblePlaces.length > 0
          ? `Showing ${visiblePlaces.length} of ${allPlaces.length} locations`
          : ""}
      </div>

      {/* CARDS */}
      {!loading && visiblePlaces.length === 0 ? (
        <section className="food-empty-state">
          <h3>No results found</h3>
          <p>Try a different search term or category.</p>
        </section>
      ) : (
        <section className="food-card-grid">
          {visiblePlaces.map((place) => (
            <article className="food-card" key={place.id}>
              {place.image ? (
                <div className="food-card-image" onClick={() => setModalImage(place.image)}>
                  <img
                    src={place.image}
                    alt={place.name}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="food-card-image food-card-placeholder">{place.pin}</div>
              )}

              <div className="food-card-content">
                <h3>
                  <a href={googleMapsSearchUrl(place.mapsQuery)} target="_blank" rel="noreferrer">
                    {place.name}
                  </a>
                </h3>
                <p>{place.description}</p>
                <span className="food-tag">{place.tag}</span>

                <div className={`food-distance${place.distKm !== null ? " visible" : ""}`}>
                  📍 {place.distKm !== null ? formatDist(place.distKm) : ""}
                </div>

                <div className="food-card-actions">
                  <button type="button" onClick={() => showOnMap(place)}>
                    📍 View on Map
                  </button>
                  <button
                    type="button"
                    className={routingId === place.id ? "loading" : ""}
                    onClick={() => getRoute(place)}
                  >
                    {routingId === place.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* SPACER */}
      <div className={`food-map-panel-spacer${mapPanelOpen ? " active" : ""}`} />

      {/* MAP PANEL */}
      <div className={`food-map-panel${mapPanelOpen ? " active" : ""}`}>
        <div className="food-map-panel-header">
          <div>
            <div className="food-map-panel-title">📍 {selectedPlace ? selectedPlace.name : "Map"}</div>
            <div className="food-map-panel-subtitle">{selectedPlace?.tag ?? ""}</div>
          </div>
          <div className="food-map-panel-actions">
            {selectedPlace && (
              <a
                className="food-map-directions-link"
                href={googleMapsSearchUrl(selectedPlace.mapsQuery)}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button className="food-map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>
        <div id="food-map" ref={mapContainerRef} />
        <div className={`food-route-info${routeInfo ? " visible" : ""}`}>
          <span>
            🛣️ Road distance: <strong>{routeInfo ? `${routeInfo.distanceKm} km` : "–"}</strong>
          </span>
          <span>
            ⏱️ Estimated time:{" "}
            <strong>{routeInfo ? formatDuration(routeInfo.minutes) : "–"}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div className={`food-toast${toast ? " show" : ""}`}>{toast}</div>
    </main>
  );
}