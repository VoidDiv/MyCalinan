"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, LineString } from "geojson";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import Link from "next/link";

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

mapboxgl.accessToken = token!;

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
type Tag = "Elementary" | "High School" | "College" | "Public" | "Private";
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
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface RouteInfo {
  distKm: string;
  timeStr: string;
}

// ----------------------------------------------------------------------
// Static Data
// ----------------------------------------------------------------------
const STORAGE_BASE =
  "https://storage.googleapis.com/mycalinan.firebasestorage.app/Education";

const SCHOOLS: School[] = [
  {
    id: "calinan-central-elementary",
    name: "Calinan Central Elementary School",
    tags: ["Elementary", "Public"],
    lat: 7.1895,
    lng: 125.4565,
    displayTag: "Public Elementary School",
    mapsQuery: "Calinan+Central+Elementary+School+Davao+City",
    image: `${STORAGE_BASE}/Calinan%20Central%20Elementary%20School.png`,
    description:
      "Purok 5, Barangay Calinan, Davao City — One of the main public basic education institutions in the Calinan District, catering to learners from surrounding barangays.",
  },
  {
    id: "villafuerte-elementary",
    name: "Lt. C. Villafuerte Sr. Elementary School",
    tags: ["Elementary", "Public"],
    lat: 7.1888,
    lng: 125.457,
    displayTag: "Public Elementary School",
    mapsQuery: "Lt.+C.+Villafuerte+Sr.+Elementary+School+Davao+City",
    image: `${STORAGE_BASE}/Lt.%20C.%20Villafuerte%20Sr.%20Elementary%20School.png`,
    description:
      "Duyac St., Calinan District, Davao City — Provides accessible quality basic education for learners from Kindergarten to Grade 6 with active community programs.",
  },
  {
    id: "calinan-national-high-school",
    name: "Calinan National High School",
    tags: ["High School", "Public"],
    lat: 7.1875,
    lng: 125.4575,
    displayTag: "Public High School",
    mapsQuery: "Calinan+National+High+School+Davao+City",
    image: `${STORAGE_BASE}/Calinan%20National%20High%20School.jpg`,
    description:
      "Duyac St., Calinan District, Davao City — A major public secondary school under DepEd Davao City Division, offering junior and senior high school programs.",
  },
  {
    id: "amigo-school",
    name: "Amigo School of Calinan",
    tags: ["Elementary", "High School", "Private"],
    lat: 7.186,
    lng: 125.452,
    displayTag: "Private Elementary & High School",
    mapsQuery: "Amigo+School+of+Calinan+Davao+City",
    image: `${STORAGE_BASE}/Amigo%20School%20of%20Calinan.png`,
    description:
      "De Lara St., Calinan District, Davao City — Private basic education school serving learners from surrounding barangays and upland communities with co-curricular programs.",
  },
  {
    id: "st-francis-college",
    name: "St. Francis College of Davao Calinan",
    tags: ["High School", "Private"],
    lat: 7.184,
    lng: 125.459,
    displayTag: "Private High School",
    mapsQuery: "St.+Francis+College+of+Davao+Calinan+Davao+City",
    image: `${STORAGE_BASE}/St.%20Francis%20College%20of%20Davao%20Calinan.jpg`,
    description:
      "Sunrise Village, Penano Street, Calinan — Catholic secondary school recognized by DepEd as a Senior High School provider offering ABM, HUMSS, GAS, and TVL strands.",
  },
  {
    id: "nikkei-jin-kai",
    name: "Philippine Nikkei Jin Kai School of Calinan",
    tags: ["Elementary", "High School", "Private"],
    lat: 7.175,
    lng: 125.448,
    displayTag: "Private Elementary & High School",
    mapsQuery:
      "Philippine+Nikkei+Jin+Kai+International+School+Calinan+Davao+City",
    image: `${STORAGE_BASE}/Philippine%20Nikkei%20Jin%20Kai%20School%20of%20Calinan.jpg`,
    description:
      "Durian Village, Calinan District — Japanese-Filipino cultural and language education campus under the Philippine Nikkei Jin Kai international network.",
  },
  {
    id: "pct-calinan",
    name: "Philippine College of Technology Calinan Branch",
    tags: ["College", "High School", "Private"],
    lat: 7.182,
    lng: 125.449,
    displayTag: "Private College & High School",
    mapsQuery: "Philippine+College+of+Technology+Calinan+Branch+Davao+City",
    image: `${STORAGE_BASE}/Philippine%20College%20of%20Technology%20Calinan%20Branch.jpg`,
    description:
      "Bayanihan, Calinan-Wangan Road — Technical-vocational and higher education campus offering skills-based programs designed for industry readiness.",
  },
  {
    id: "holy-cross-college",
    name: "Holy Cross College of Calinan",
    tags: ["College", "High School", "Elementary", "Private"],
    lat: 7.19,
    lng: 125.4548,
    displayTag: "Private College, High School & Elementary",
    mapsQuery: "Holy+Cross+College+of+Calinan+Davao+City",
    image: `${STORAGE_BASE}/Holy%20Cross%20College%20of%20Calinan%2C%20Inc..png`,
    description:
      "McArthur Highway, Datu Abing St., Calinan — Catholic institution under the Archdiocese of Davao offering basic, tertiary, and graduate education with Christian values.",
  },
];

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Elementary", value: "Elementary" },
  { label: "High School", value: "High School" },
  { label: "College", value: "College" },
  { label: "Public", value: "Public" },
  { label: "Private", value: "Private" },
];

// ----------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

const EMPTY_ROUTE_GEOJSON: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const EducationPage: React.FC = () => {
  // --- States ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState<boolean>(false);

  // User location
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locStatusText, setLocStatusText] = useState<string>("Detecting your location…");
  const [isLocError, setIsLocError] = useState<boolean>(false);
  const [hasLocationActive, setHasLocationActive] = useState<boolean>(false);

  // Modal state
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map & active item panel
  const [isMapPanelOpen, setIsMapPanelOpen] = useState<boolean>(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState<string | null>(null);

  // --- Refs for Mapbox objects ---
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const activeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapLoadedRef = useRef<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Toast Trigger ---
  const showToast = useCallback((msg: string, duration = 3000) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // --- Geolocation ---
  const startLocating = () => {
    if (!navigator.geolocation) {
      showToast("⚠️ Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setHasLocationActive(true);
    setLocStatusText("Detecting your location…");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLoc({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);
        setIsLocError(false);
        setLocStatusText(`Location active · ±${Math.round(accuracy)} m accuracy`);
      },
      (err) => {
        setIsLocating(false);
        setIsLocError(true);
        const msgs: Record<number, string> = {
          1: "Location access denied. Please allow it in your browser settings.",
          2: "Location unavailable. Check your GPS or network.",
          3: "Location request timed out. Try again.",
        };
        const errorMsg = msgs[err.code] || "Could not get location.";
        setLocStatusText(errorMsg);
        showToast("⚠️ " + errorMsg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  // Cleanup geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // --- Map Initialization & Lifetime ---
  useEffect(() => {
    if (!isMapPanelOpen) return;

    if (!mapboxgl.accessToken) {
      showToast("Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: "edu-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.4558, 7.1885],
        zoom: 14,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        map.addSource("route", { type: "geojson", data: EMPTY_ROUTE_GEOJSON });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#2e8b57", "line-width": 5, "line-opacity": 0.85 },
        });
        mapLoadedRef.current = true;
      });

      mapRef.current = map;
    } else {
      setTimeout(() => mapRef.current?.resize(), 100);
    }
  }, [isMapPanelOpen, showToast]);

  // Tear down map when panel closes
  useEffect(() => {
    if (!isMapPanelOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      userMarkerRef.current = null;
      activeMarkerRef.current = null;
    }
  }, [isMapPanelOpen]);

  // Update user marker on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const el = document.createElement("div");
    el.className = "user-dot-wrapper";
    el.innerHTML = '<div class="user-dot-ring"></div><div class="user-dot-inner"></div>';

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLoc.lng, userLoc.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 16 }).setHTML(
          '<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>'
        )
      )
      .addTo(map);
  }, [userLoc, isMapPanelOpen]);

  // --- Map Actions ---
  const handleShowOnMap = (item: School) => {
    setSelectedSchool(item);
    setIsMapPanelOpen(true);
    setRouteInfo(null);

    setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      if (activeMarkerRef.current) activeMarkerRef.current.remove();

      const clearRoute = () => {
        const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
        source?.setData(EMPTY_ROUTE_GEOJSON);
      };
      if (mapLoadedRef.current) {
        clearRoute();
      } else {
        map.once("load", clearRoute);
      }

      const el = document.createElement("div");
      el.style.cssText =
        "background:#2e8b57;color:white;font-size:16px;width:36px;height:36px;" +
        "border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;" +
        "align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);" +
        "border:2px solid white;";
      el.innerHTML = `<span style="transform:rotate(45deg)">🎓</span>`;

      const distText = userLoc
        ? `<br><strong>${formatDist(
            haversine(userLoc.lat, userLoc.lng, item.lat, item.lng)
          )}</strong> straight-line from you`
        : "";

      const popupHtml = `
        <div class="place-popup">
          <h4>${item.name}</h4>
          <div class="popup-tag">${item.displayTag}</div>
          <p>${distText}</p>
          <a href="${googleMapsSearchUrl(item.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
        </div>`;

      activeMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([item.lng, item.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24, maxWidth: "250px" }).setHTML(popupHtml))
        .addTo(map);
      activeMarkerRef.current.togglePopup();

      map.flyTo({ center: [item.lng, item.lat], zoom: 17, duration: 1000 });
      map.resize();
    }, 100);
  };

  const handleGetDirections = async (item: School) => {
    if (!userLoc) {
      showToast("📍 Enable location first to get directions.");
      return;
    }

    setIsRoutingLoading(item.id);
    handleShowOnMap(item);

    const url = `https://router.project-osrm.org/route/v1/driving/${userLoc.lng},${userLoc.lat};${item.lng},${item.lat}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error("No route found");
      }

      const route = data.routes[0];
      const coordinates: [number, number][] = route.geometry.coordinates;
      const distKm = (route.distance / 1000).toFixed(1);
      const mins = Math.round(route.duration / 60);
      const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

      const drawRoute = () => {
        const map = mapRef.current;
        if (!map) return;
        const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
        const geojson: Feature<LineString> = {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        };
        source?.setData(geojson);

        const bounds = coordinates.reduce(
          (b, c) => b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 40 });
      };

      if (mapLoadedRef.current) {
        drawRoute();
      } else {
        mapRef.current?.once("load", drawRoute);
      }

      setRouteInfo({ distKm, timeStr });
      showToast(`🧭 Route to ${item.name}: ${distKm} km · ${timeStr}`);
    } catch {
      showToast("⚠️ Could not load route. Check your internet connection.");
    } finally {
      setIsRoutingLoading(null);
    }
  };

  const handleCloseMap = () => {
    setIsMapPanelOpen(false);
    setRouteInfo(null);
    setSelectedSchool(null);
  };

  // --- Filtering & Sorting Data ---
  const processedSchools = useMemo(() => {
    return SCHOOLS.map((item) => {
      const distance = userLoc ? haversine(userLoc.lat, userLoc.lng, item.lat, item.lng) : null;
      return { ...item, distance };
    })
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.displayTag.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q));

        const matchesFilter = activeFilter === "all" || item.tags.includes(activeFilter);

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortByNearest && userLoc && a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [searchQuery, activeFilter, sortByNearest, userLoc]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImageSrc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div>
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
            onClick={startLocating}
            disabled={isLocating}
            className={isLocating ? "loading" : ""}
          >
            <div className="spinner"></div>
            <span className="btn-label">
              {isLocating ? "Locating..." : userLoc ? "📍 Tracking" : "📍 Locate Me"}
            </span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal ${modalImageSrc ? "active" : ""}`}
        id="imageModal"
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== "IMG") setModalImageSrc(null);
        }}
      >
        <span className="close" onClick={() => setModalImageSrc(null)}>
          ×
        </span>
        {modalImageSrc && <img id="modalImg" className="modal-content" src={modalImageSrc} alt="Preview" />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Shaping Futures Through Education in Calinan</h2>
        <p>
          Find schools, colleges, and institutions near you. Enable location to see distances and get directions.
        </p>
        <div id="location-status" className={hasLocationActive ? "visible" : ""}>
          <div className={`loc-dot ${isLocError ? "loc-err" : ""}`} id="loc-dot"></div>
          <span id="loc-text">{locStatusText}</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`filter-chip ${activeFilter === f.value ? "active" : ""}`}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}

        <button
          className={`sort-btn ${sortByNearest ? "active" : ""}`}
          id="sort-btn"
          disabled={!userLoc}
          title={!userLoc ? "Enable location first" : ""}
          onClick={() => setSortByNearest(!sortByNearest)}
        >
          {sortByNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </div>

      {/* RESULT COUNT */}
      <div id="result-count">
        {processedSchools.length > 0
          ? `Showing ${processedSchools.length} of ${SCHOOLS.length} institutions`
          : ""}
      </div>

 {/* CARDS CONTAINER */}
      <section className="container" id="cards-container">
        {processedSchools.map((school) => (
          <div key={school.id} className="card">
            <div className="card-image" onClick={() => setModalImageSrc(school.image)}>
              <img src={school.image} alt={school.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={googleMapsSearchUrl(school.mapsQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  {school.name}
                </a>
              </h3>
              <p>{school.description}</p>
              <span className="tag">{school.displayTag}</span>

              <div className={`dist-badge ${school.distance !== null ? "visible" : ""}`}>
                <div className="dot"></div>
                <span className="dist-text">{school.distance !== null ? formatDist(school.distance) : ""}</span>
              </div>

              <div className="card-actions">
                <button className="view-map-btn" onClick={() => handleShowOnMap(school)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn ${userLoc ? "visible" : ""} ${
                    isRoutingLoading === school.id ? "loading" : ""
                  }`}
                  onClick={() => handleGetDirections(school)}
                >
                  {isRoutingLoading === school.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {processedSchools.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2e8b57" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <h3>No results found</h3>
            <p>Try a different search term or filter.</p>
          </div>
        )}
      </section>

      {/* SPACER */}
      <div id="map-panel-spacer" className={isMapPanelOpen ? "active" : ""}></div>

      {/* MAP PANEL */}
      <div id="map-panel" className={isMapPanelOpen ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {selectedSchool ? selectedSchool.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedSchool?.displayTag || ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedSchool && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(selectedSchool.mapsQuery)}
                target="_blank"
                rel="noopener noreferrer"
            >
                🧭 Open in Google Maps
              </a>
            )}
            <button id="map-panel-close" onClick={handleCloseMap} title="Close map">
              ✕
            </button>
          </div>
        </div>

        <div id="edu-map"></div>

        <div id="route-info" className={routeInfo ? "visible" : ""}>
          <span>
            🛣️ Road distance: <strong id="route-dist">{routeInfo?.distKm || "–"} km</strong>
          </span>
          <span>
            ⏱️ Estimated time: <strong id="route-time">{routeInfo?.timeStr || "–"}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div id="toast" className={toastMessage ? "show" : ""}>
        {toastMessage}
      </div>
    </div>
  );
};

export default EducationPage;