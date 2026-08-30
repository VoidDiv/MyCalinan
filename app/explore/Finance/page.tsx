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
// Types & Data Structure
// ----------------------------------------------------------------------
type Category = "Bank" | "Remittance";
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
const FINANCE_LOCATIONS: FinanceLocation[] = [
  {
    id: "bdo-calinan",
    name: "BDO Calinan",
    category: "Bank",
    lat: 7.1876,
    lng: 125.4524,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "BDO+Calinan+WTKC+Realty+Bldg+Davao+Bukidnon+National+Highway+Calinan+Davao+City+Davao+del+Sur",
    image: "image/BDO.png",
    description:
      "WTKC Realty Bldg., Davao–Bukidnon National Highway, Calinan — Branch of Banco de Oro Unibank, one of the largest banks in the Philippines, serving retail and commercial banking needs in the Calinan district.",
  },
  {
    id: "bdo-network-bank",
    name: "BDO Network Bank",
    category: "Bank",
    lat: 7.185,
    lng: 125.4498,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "BDO+Network+Bank+ONB+Calinan+Building+Davao+Buda+National+Hwy+Calinan+District+Davao+City+Davao+del+Sur",
    image: "image/BDO Network Bank.jpg",
    description:
      "ONB Calinan Building, Davao–Buda National Hwy — Formerly One Network Bank (ONB), serving farmers, employees, small businesses, and residents with savings, loans, ATM access, and money transfers.",
  },
  {
    id: "pnb",
    name: "PNB",
    category: "Bank",
    lat: 7.1882,
    lng: 125.4548,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "PNB+Davao+Calinan+LTH+Building+Davao+Bukidnon+Hwy+Calinan+Davao+City+Davao+del+Sur",
    image: "image/PNB.png",
    description:
      "LTH Building, Davao–Bukidnon Hwy, Calinan — Full-service branch of the Philippine National Bank providing a range of banking and financial services to residents and businesses along the highway corridor.",
  },
  {
    id: "chinabank",
    name: "ChinaBank",
    category: "Bank",
    lat: 7.1888,
    lng: 125.4552,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "China+Bank+Honesto+Garcia+St+Calinan+Davao+Buda+National+Hwy+Calinan+District+Davao+City+Davao+del+Sur",
    image: "image/ChinaBank1.png",
    description:
      "Honesto Garcia St., Calinan District — Branch of China Banking Corporation, one of the Philippines' oldest private universal banks, serving individuals, businesses, and agricultural clients in the area.",
  },
  {
    id: "landbank-1",
    name: "Landbank",
    category: "Bank",
    lat: 7.1878,
    lng: 125.4546,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "Landbank+Calinan+Purok+13+Palarca+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    image: "image/Landbank1.png",
    description:
      "Purok 13, Palarca Street, Calinan Poblacion — Government bank branch offering savings accounts, ATM, loans, fund transfers, and government-related transactions for residents, farmers, and pensioners.",
  },
  {
    id: "landbank-2",
    name: "Landbank",
    category: "Bank",
    lat: 7.1879,
    lng: 125.4547,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "Landbank+Calinan+Purok+13+Palarca+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    image: "image/Landbank2.jpg",
    description:
      "Purok 13, Palarca Street, Calinan Poblacion — Convenient financial access for the Calinan community without traveling to downtown Davao, with full banking services and government transaction support.",
  },
  {
    id: "m-lhuillier",
    name: "M Lhuillier",
    category: "Remittance",
    lat: 7.187,
    lng: 125.4512,
    tag: "Remittance Center",
    pin: "💸",
    mapsQuery:
      "M+Lhuillier+Calinan+Davao+Bukidnon+Hwy+Calinan+District+Davao+City+Davao+del+Sur",
    image: "image/M Lhuillier.jpg",
    description:
      "Davao–Bukidnon Highway, Calinan — Branch of M Lhuillier Financial Services providing quick-access pawning, money remittance, and financial solutions for the local community.",
  },
  {
    id: "palawan-1",
    name: "Palawan Pawnshop",
    category: "Remittance",
    lat: 7.1886,
    lng: 125.456,
    tag: "Remittance Center",
    pin: "💸",
    mapsQuery:
      "Palawan+Pawnshop+Villafuerte+St+Calinan+District+Davao+City+Davao+del+Sur",
    image: "image/Palawan Pawnshop.png",
    description:
      "Villafuerte St., Calinan — Palawan Express branch providing pawnbroking, money remittance, and payment solutions for residents and businesses in the Calinan Poblacion area.",
  },
  {
    id: "palawan-2",
    name: "Palawan Pawnshop",
    category: "Remittance",
    lat: 7.1865,
    lng: 125.4518,
    tag: "Remittance Center",
    pin: "💸",
    mapsQuery:
      "Palawan+Pawnshop+Davao+Bukidnon+Hwy+Calinan+Calinan+District+Davao+City+Davao+del+Sur",
    image: "image/Palawan Pawnshop1.png",
    description:
      "Davao–Bukidnon Highway, Calinan — Accessible pawnbroking, money remittance, and payment services for residents and businesses along the main highway in Calinan District.",
  },
];

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Banks", value: "Bank" },
  { label: "Remittance", value: "Remittance" },
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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const FinancePage: React.FC = () => {
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
  const [selectedLocation, setSelectedLocation] = useState<FinanceLocation | null>(null);
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
        const errorMsg = GEOLOCATION_ERROR_MESSAGES[err.code] || "Could not get location.";
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
      showToast("⚠️ Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: "finance-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.453, 7.1876],
        zoom: 15,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        map.addSource("route", { type: "geojson", data: EMPTY_ROUTE_GEOJSON });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#2b6b45", "line-width": 5, "line-opacity": 0.85 },
        });
        mapLoadedRef.current = true;
      });

      mapRef.current = map;
    } else {
      setTimeout(() => mapRef.current?.resize(), 100);
    }
  }, [isMapPanelOpen, showToast]);

  // Tear down map when panel closes
  // (kept in its own effect, keyed only on isMapPanelOpen, so the
  // closure always sees the current value — this is what actually
  // destroys the Mapbox instance on close)
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
  const handleShowOnMap = (item: FinanceLocation) => {
    setSelectedLocation(item);
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
        "background:#2b6b45;color:white;font-size:16px;width:36px;height:36px;" +
        "border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;" +
        "align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);" +
        "border:2px solid white;";
      el.innerHTML = `<span style="transform:rotate(45deg)">${item.pin}</span>`;

      const distText = userLoc
        ? `<br><strong>${formatDist(
            haversine(userLoc.lat, userLoc.lng, item.lat, item.lng)
          )}</strong> straight-line from you`
        : "";

      const popupHtml = `
        <div class="finance-popup">
          <h4>${item.name}</h4>
          <div class="popup-tag">${item.tag}</div>
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

  const handleGetDirections = async (item: FinanceLocation) => {
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
    setSelectedLocation(null);
  };

  // --- Filtering & Sorting Data ---
  const processedLocations = useMemo(() => {
    return FINANCE_LOCATIONS.map((item) => {
      const distance = userLoc ? haversine(userLoc.lat, userLoc.lng, item.lat, item.lng) : null;
      return { ...item, distance };
    })
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);

        const matchesFilter = activeFilter === "all" || item.category === activeFilter;

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
        <h2>Finance Services in Calinan</h2>
        <p>
          Find banks, remittance centers, and financial institutions near you. Enable location to see
          distances and get directions.
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
        {processedLocations.length > 0
          ? `Showing ${processedLocations.length} of ${FINANCE_LOCATIONS.length} locations`
          : ""}
      </div>

      {/* CARDS CONTAINER */}
      <section className="container" id="cards-container">
        {processedLocations.map((loc) => (
          <div key={loc.id} className="card">
            <div className="card-image" onClick={() => setModalImageSrc(loc.image)}>
              <img src={loc.image} alt={loc.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={googleMapsSearchUrl(loc.mapsQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {loc.name}
                </a>
              </h3>
              <p>{loc.description}</p>
              <span className="tag">{loc.tag}</span>

              <div className={`dist-badge ${loc.distance !== null ? "visible" : ""}`}>
                <div className="dot"></div>
                <span className="dist-text">{loc.distance !== null ? formatDist(loc.distance) : ""}</span>
              </div>

              <div className="card-actions">
                <button className="view-map-btn" onClick={() => handleShowOnMap(loc)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn ${userLoc ? "visible" : ""} ${
                    isRoutingLoading === loc.id ? "loading" : ""
                  }`}
                  onClick={() => handleGetDirections(loc)}
                >
                  {isRoutingLoading === loc.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {processedLocations.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2b6b45" strokeWidth={1.5}>
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
            <div id="map-panel-title">📍 {selectedLocation ? selectedLocation.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedLocation?.tag || ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedLocation && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(selectedLocation.mapsQuery)}
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

        <div id="finance-map"></div>

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

export default FinancePage;