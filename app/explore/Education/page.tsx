/* ============================================================
   EDUCATION PAGE
   EXPLORE SECTION : "education"
   ADMIN LOCATION  : Admin > Listings > Explore > Education
   Replace the page.tsx inside your Education folder.

   ADDED IN THIS VERSION: tricycle fare estimate in the route-info
   panel, and star ratings/reviews on every card (see
   lib/tricycleFare.ts, lib/reviews.ts, components/StarRating.tsx,
   components/ReviewsModal.tsx).

   FIXED IN THIS VERSION (destination icon "moving"):
   - The destination pin used to be removed and re-created, and the
     map re-flown to zoom 17, on EVERY GPS update (because userLocation
     was a dependency of the marker effect). That made the pin jump and
     wiped out the route view. Now the pin is only placed when you
     choose a school (View on Map / Get Directions) and stays put.
   - "Get Directions" now shows the destination icon automatically and
     fits the map to the whole route (you + destination) instead of
     zooming to the pin.
   - The user dot is moved with setLngLat instead of being re-created.
   - The pin tip now sits exactly on the coordinates (offset fix).

   SAFETY FIX: names and tags typed by the admin are escaped before they go
   into the map popup HTML (see lib/escapeHtml.ts).
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
const EXPLORE_SECTION = "education";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const ROUTE_SOURCE_ID = "education-route";
const ROUTE_LAYER_ID = "education-route-line";
const PIN_COLOR = "#2e8b57";

/* ══════════════════════════════════════════
  TYPES
══════════════════════════════════════════ */

// Plain string so admin-added tags work without code changes
type Tag = string;
type FilterValue = "all" | Tag;

export interface School {
  id: string;
  name: string;
  tags: Tag[];
  lat: number;
  lng: number;
  displayTag: string;
  mapsQuery: string;
  image: string;
  description: string;
  ratingAvg: number;
  ratingCount: number;
}

interface SchoolWithDistance extends School {
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
// Manage them in Admin > Listings > Explore > Education.

// Optional: controls the order of the filter chips. Unknown (admin-added)
// tags are appended after these, alphabetically.
const PREFERRED_ORDER = ["Elementary", "High School", "College", "Public", "Private"];

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

function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const ia = PREFERRED_ORDER.indexOf(a);
    const ib = PREFERRED_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Builds the popup shown above the destination pin
function buildSchoolPopupHtml(
  school: School,
  user: { lat: number; lng: number } | null
): string {
  const distText = user
    ? `<br><strong>${formatDist(
        haversineKm(user.lat, user.lng, school.lat, school.lng)
      )}</strong> straight-line from you`
    : "";

  return `<div class="place-popup">
    <h4>${escapeHtml(school.name)}</h4>
    <div class="popup-tag">${escapeHtml(school.displayTag)}</div>
    <p>${distText}</p>
    <a href="${googleMapsSearchUrl(school.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
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

export default function EducationPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
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
  const schoolMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Always holds the latest GPS fix, so effects can read it WITHOUT
  // re-running every time the GPS updates.
  const userLocationRef = useRef<UserLocation | null>(null);
  // When true, the next school selection will NOT fly to zoom 17
  // (used by "Get Directions", which fits the whole route instead).
  const skipFlyRef = useRef(false);

  /* ── LIVE LISTINGS FROM ADMIN (Explore > "education") ── */
  const { listings: live, loading } = useExploreListings(EXPLORE_SECTION);
  const allSchools = useMemo<School[]>(
    () =>
      live.map((l) => {
        const extra = l as typeof l & { ratingAvg?: number; ratingCount?: number };
        return {
          id: l.docId,
          name: l.name,
          // Education listings can carry several tags (e.g. "High School" + "Private")
          tags: (l.tags && l.tags.length ? l.tags : [l.category]) as Tag[],
          lat: l.lat,
          lng: l.lng,
          displayTag: l.tag,
          mapsQuery: l.mapsQueryEncoded,
          image: l.image,
          description: l.description,
          ratingAvg: extra.ratingAvg ?? 0,
          ratingCount: extra.ratingCount ?? 0,
        };
      }),
    [live]
  );

  /* ── FILTER CHIPS (built from every tag that exists, incl. admin-added ones) ── */
  const filters = useMemo<{ label: string; value: FilterValue }[]>(() => {
    const tags = sortTags(Array.from(new Set(allSchools.flatMap((s) => s.tags))));
    return [{ label: "All", value: "all" }, ...tags.map((t) => ({ label: t, value: t }))];
  }, [allSchools]);

  // If the active tag disappears (e.g. admin deleted its last listing), fall back to "all"
  useEffect(() => {
    if (activeFilter !== "all" && !allSchools.some((s) => s.tags.includes(activeFilter))) {
      setActiveFilter("all");
    }
  }, [allSchools, activeFilter]);

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
  const schoolsWithDistance: SchoolWithDistance[] = useMemo(() => {
    return allSchools.map((school) => ({
      ...school,
      distKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, school.lat, school.lng)
        : null,
    }));
  }, [userLocation, allSchools]);

  const visibleSchools = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = schoolsWithDistance.filter((school) => {
      const matchesSearch =
        !query ||
        school.name.toLowerCase().includes(query) ||
        school.displayTag.toLowerCase().includes(query) ||
        school.tags.some((t) => t.toLowerCase().includes(query));
      const matchesFilter = activeFilter === "all" || school.tags.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
    }

    return list;
  }, [schoolsWithDistance, searchQuery, activeFilter, sortByNearest, userLocation]);

  /* ── MAP: init once the panel is opened ── */
  useEffect(() => {
    if (!mapPanelOpen || mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.4558, 7.1885],
      zoom: 14,
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
      schoolMarkerRef.current = null;
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

  /* ── MAP: destination pin ──
     Only runs when a school is chosen (View on Map / Get Directions) or the
     panel opens. It does NOT depend on userLocation, so GPS updates can no
     longer remove the pin or fly the camera away. ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSchool) return;

    if (schoolMarkerRef.current) schoolMarkerRef.current.remove();

    const el = document.createElement("div");
    el.innerHTML = `<div style="background:${PIN_COLOR};color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">🎓</span></div>`;

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "250px" }).setHTML(
      buildSchoolPopupHtml(selectedSchool, userLocationRef.current)
    );

    // offset [0,-7]: the rotated square's tip sticks out ~7px below the element,
    // so lift it by 7px to make the tip land exactly on the coordinates.
    schoolMarkerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
      offset: [0, -7],
    })
      .setLngLat([selectedSchool.lng, selectedSchool.lat])
      .setPopup(popup)
      .addTo(map)
      .togglePopup();

    // "Get Directions" fits the whole route itself, so skip the zoom-17 fly in that case
    if (skipFlyRef.current) {
      skipFlyRef.current = false;
    } else {
      map.flyTo({ center: [selectedSchool.lng, selectedSchool.lat], zoom: 17, duration: 1000 });
    }
    setTimeout(() => map.resize(), 320);
  }, [selectedSchool, mapPanelOpen]);

  /* ── MAP: refresh the popup's distance text when GPS updates (pin stays put) ── */
  useEffect(() => {
    if (!selectedSchool || !userLocation) return;
    const popup = schoolMarkerRef.current?.getPopup();
    popup?.setHTML(buildSchoolPopupHtml(selectedSchool, userLocation));
  }, [userLocation, selectedSchool]);

  /* ── ACTIONS ── */

  const clearRouteLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(EMPTY_ROUTE_GEOJSON);
  }, []);

  const showOnMap = useCallback(
    (school: School, skipFly = false) => {
      skipFlyRef.current = skipFly;
      // new object each time so the pin effect always re-runs (re-centers on tap)
      setSelectedSchool({ ...school });
      setRouteInfo(null);
      clearRouteLayer();
      setMapPanelOpen(true);
    },
    [clearRouteLayer]
  );

  const closeMap = useCallback(() => {
    setMapPanelOpen(false);
    setSelectedSchool(null);
    setRouteInfo(null);
  }, []);

  const getRoute = useCallback(
    async (school: School) => {
      if (!userLocation) {
        showToast("📍 Enable location first to get directions.");
        return;
      }
      if (!MAPBOX_TOKEN) {
        showToast("⚠️ Missing Mapbox access token.");
        return;
      }

      // Show the destination icon automatically, but let the route fit the view
      showOnMap(school, true);
      setRoutingId(school.id);

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${school.lng},${school.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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
            bounds.extend([school.lng, school.lat]);
            map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
          };
          if (mapLoadedRef.current) applyRoute();
          else map.once("load", applyRoute);
        }

        setRouteInfo({ distanceKm: Math.round(distanceKm * 10) / 10, minutes });
        showToast(`🧭 Route to ${school.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`);
      } catch {
        // No route? At least bring the camera to the destination pin
        mapRef.current?.flyTo({ center: [school.lng, school.lat], zoom: 17, duration: 1000 });
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
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1 className="logo">Education</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchBar"
              placeholder="Search schools, colleges, level…"
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
        {modalImage && <img id="modalImg" className="modal-content" alt="School photo" src={modalImage} />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Shaping Futures Through Education in Calinan</h2>
        <p>
          Find schools, colleges, and institutions near you. Enable location to see distances and
          get directions.
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
          : visibleSchools.length > 0
          ? `Showing ${visibleSchools.length} of ${allSchools.length} institutions`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {visibleSchools.map((school) => (
          <div
            key={school.id}
            className="card"
            data-name={school.name}
            data-tags={school.tags.join(",")}
            data-lat={school.lat}
            data-lng={school.lng}
            data-tag={school.displayTag}
            data-maps-query={school.mapsQuery}
          >
            <div className="card-image" onClick={() => setModalImage(school.image)}>
              <img src={school.image} alt={school.name} />
            </div>
            <div className="card-content">
              <h3>
                <a href={googleMapsSearchUrl(school.mapsQuery)} target="_blank" rel="noreferrer">
                  {school.name}
                </a>
              </h3>
              <p>{school.description}</p>
              <span className="tag">{school.displayTag}</span>
              <div className={`dist-badge${school.distKm !== null ? " visible" : ""}`}>
                <div className="dot" />
                <span className="dist-text">
                  {school.distKm !== null ? formatDist(school.distKm) : ""}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReviewsTarget({ id: school.id, name: school.name })}
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
                  color: "#2e8b57",
                }}
              >
                <StarRating value={school.ratingAvg} size={14} />
                <span>
                  {school.ratingCount > 0
                    ? `${school.ratingAvg.toFixed(1)} (${school.ratingCount})`
                    : "No reviews yet"}
                </span>
                <span style={{ textDecoration: "underline" }}>· Reviews</span>
              </button>

              <div className="card-actions">
                <button className="view-map-btn" onClick={() => showOnMap(school)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn${userLocation ? " visible" : ""}${
                    routingId === school.id ? " loading" : ""
                  }`}
                  onClick={() => getRoute(school)}
                >
                  {routingId === school.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && visibleSchools.length === 0 && (
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
            <div id="map-panel-title">📍 {selectedSchool ? selectedSchool.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedSchool?.displayTag ?? ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedSchool && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(selectedSchool.mapsQuery)}
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
        <div id="edu-map" ref={mapContainerRef} />
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
          <span title={TRICYCLE_FARE_NOTE}>
            🛺 Est. tricycle fare: <strong id="route-fare">{TRICYCLE_FARE_LABEL}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div id="toast" className={toast ? "show" : ""}>
        {toast}
      </div>

      {/* REVIEWS MODAL */}
      <ReviewsModal
        open={!!reviewsTarget}
        pageCollection={EXPLORE_SECTION}
        listingId={reviewsTarget?.id ?? ""}
        listingName={reviewsTarget?.name ?? ""}
        onClose={() => setReviewsTarget(null)}
      />
    </>
  );
}