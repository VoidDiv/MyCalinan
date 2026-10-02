/* ============================================================
   FOOD & DINING PAGE
   EXPLORE SECTION : "food"
   ADMIN LOCATION  : Admin > Listings > Explore > Food & Dining
   Replace the page.tsx inside your Food & Dining folder.

   ADDED IN THIS VERSION: tricycle fare estimate in the route-info
   panel, and star ratings/reviews on every card.

   FIXED IN THIS VERSION (destination icon "moving"):
   - The destination pin used to be removed and re-created, and the
     map re-flown to zoom 17, on EVERY GPS update (because userLocation
     was a dependency of the marker effect). That made the pin jump and
     wiped out the route view. Now the pin is only placed when you
     choose a place (View on Map / Get Directions) and stays put.
   - "Get Directions" now shows the destination icon automatically and
     fits the map to the whole route (you + destination) instead of
     zooming to the pin.
   - The user dot is moved with setLngLat instead of being re-created.
   - The pin tip now sits exactly on the coordinates (offset fix).

   SAFETY FIX: names, tags and descriptions typed by the admin are escaped
   before they go into the map popup HTML (see lib/escapeHtml.ts).
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
import { TRICYCLE_FARE_LABEL, TRICYCLE_FARE_NOTE } from "@/lib/tricycleFare";
import { escapeHtml } from "@/lib/escapeHtml";
import StarRating from "@/components/StarRating";
import ReviewsModal from "@/components/ReviewsModal";

/* ── EXPLORE SECTION KEY (must match the section in Admin > Listings > Explore,
   and the Firestore collection name for this page) ── */
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
  ratingAvg: number;
  ratingCount: number;
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

// Builds the popup shown above the destination pin
function buildPlacePopupHtml(
  place: FoodPlace,
  user: { lat: number; lng: number } | null
): string {
  const distText = user
    ? `<br><strong>${formatDist(
        haversineKm(user.lat, user.lng, place.lat, place.lng)
      )}</strong> straight-line from you`
    : "";

  return `<div class="food-place-popup">
    <span class="food-popup-tag">${escapeHtml(place.tag)}</span>
    <h4>${escapeHtml(place.pin)} ${escapeHtml(place.name)}</h4>
    <p>${escapeHtml(place.description)}${distText}</p>
    <a href="${googleMapsSearchUrl(place.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
  </div>`;
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

  const [reviewsTarget, setReviewsTarget] = useState<{ id: string; name: string } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const placeMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Always holds the latest GPS fix, so effects can read it WITHOUT
  // re-running every time the GPS updates.
  const userLocationRef = useRef<UserLocation | null>(null);
  // When true, the next place selection will NOT fly to zoom 17
  // (used by "Get Directions", which fits the whole route instead).
  const skipFlyRef = useRef(false);

  /* ── LIVE LISTINGS FROM ADMIN (Explore > "food") ── */
  const { listings: live, loading } = useExploreListings(EXPLORE_SECTION);
  const allPlaces = useMemo<FoodPlace[]>(
    () =>
      live.map((l) => {
        const extra = l as typeof l & { ratingAvg?: number; ratingCount?: number };
        return {
          id: l.docId,
          name: l.name,
          category: l.category as Category,
          lat: l.lat,
          lng: l.lng,
          tag: l.tag,
          pin: l.pin,
          mapsQuery: l.mapsQueryEncoded,
          image: l.image,
          description: l.description,
          ratingAvg: extra.ratingAvg ?? 0,
          ratingCount: extra.ratingCount ?? 0,
        };
      }),
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

  /* ── KEEP LATEST GPS FIX IN A REF ── */
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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

  /* ── MAP: keep the user marker in sync (moved, NOT re-created, on every GPS update) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
      return;
    }

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

  /* ── MAP: destination pin ──
     Only runs when a place is chosen (View on Map / Get Directions) or the
     panel opens. It does NOT depend on userLocation, so GPS updates can no
     longer remove the pin or fly the camera away. ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlace) return;

    if (placeMarkerRef.current) placeMarkerRef.current.remove();

    const el = document.createElement("div");
    el.innerHTML = `<div style="background:${PIN_COLOR};color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">${escapeHtml(selectedPlace.pin)}</span></div>`;

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "250px" }).setHTML(
      buildPlacePopupHtml(selectedPlace, userLocationRef.current)
    );

    // offset [0,-7]: the rotated square's tip sticks out ~7px below the element,
    // so lift it by 7px to make the tip land exactly on the coordinates.
    placeMarkerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
      offset: [0, -7],
    })
      .setLngLat([selectedPlace.lng, selectedPlace.lat])
      .setPopup(popup)
      .addTo(map)
      .togglePopup();

    // "Get Directions" fits the whole route itself, so skip the zoom-17 fly in that case
    if (skipFlyRef.current) {
      skipFlyRef.current = false;
    } else {
      map.flyTo({ center: [selectedPlace.lng, selectedPlace.lat], zoom: 17, duration: 1000 });
    }
    setTimeout(() => map.resize(), 320);
  }, [selectedPlace, mapPanelOpen]);

  /* ── MAP: refresh the popup's distance text when GPS updates (pin stays put) ── */
  useEffect(() => {
    if (!selectedPlace || !userLocation) return;
    const popup = placeMarkerRef.current?.getPopup();
    popup?.setHTML(buildPlacePopupHtml(selectedPlace, userLocation));
  }, [userLocation, selectedPlace]);

  /* ── ACTIONS ── */

  const clearRouteLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(EMPTY_ROUTE_GEOJSON);
  }, []);

  const showOnMap = useCallback(
    (place: FoodPlace, skipFly = false) => {
      skipFlyRef.current = skipFly;
      // new object each time so the pin effect always re-runs (re-centers on tap)
      setSelectedPlace({ ...place });
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

      // Show the destination icon automatically, but let the route fit the view
      showOnMap(place, true);
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

            // Fit the camera to the route + both ends (you and the destination pin)
            const coords: [number, number][] = route.geometry.coordinates;
            const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
            coords.forEach((c) => bounds.extend(c));
            bounds.extend([userLocation.lng, userLocation.lat]);
            bounds.extend([place.lng, place.lat]);
            map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
          };
          if (mapLoadedRef.current) applyRoute();
          else map.once("load", applyRoute);
        }

        setRouteInfo({ distanceKm: Math.round(distanceKm * 10) / 10, minutes });
        showToast(`🧭 Route to ${place.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`);
      } catch {
        // No route? At least bring the camera to the destination pin
        mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 17, duration: 1000 });
        showToast("⚠️ Could not load route. Check your internet connection.");
      } finally {
        skipFlyRef.current = false;
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

                <button
                  type="button"
                  onClick={() => setReviewsTarget({ id: place.id, name: place.name })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    margin: "6px 0 0",
                    padding: 0,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: ".78rem",
                    color: "#c0392b",
                  }}
                >
                  <StarRating value={place.ratingAvg} size={14} />
                  <span>
                    {place.ratingCount > 0
                      ? `${place.ratingAvg.toFixed(1)} (${place.ratingCount})`
                      : "No reviews yet"}
                  </span>
                  <span style={{ textDecoration: "underline" }}>· Reviews</span>
                </button>

                <div className="food-card-actions">
                  <button type="button" onClick={() => showOnMap(place)}>
                    📍 View on Map
                  </button>
                  {/* Only shown once the user has tapped "Locate Me" and we have their position */}
                  {userLocation && (
                    <button
                      type="button"
                      className={routingId === place.id ? "loading" : ""}
                      onClick={() => getRoute(place)}
                    >
                      {routingId === place.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                    </button>
                  )}
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
          <span title={TRICYCLE_FARE_NOTE}>
            🛺 Est. tricycle fare: <strong>{TRICYCLE_FARE_LABEL}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div className={`food-toast${toast ? " show" : ""}`}>{toast}</div>

      {/* REVIEWS MODAL */}
      <ReviewsModal
        open={!!reviewsTarget}
        pageCollection={EXPLORE_SECTION}
        listingId={reviewsTarget?.id ?? ""}
        listingName={reviewsTarget?.name ?? ""}
        onClose={() => setReviewsTarget(null)}
      />
    </main>
  );
}