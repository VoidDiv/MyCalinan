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
export interface FinanceLocation {
  id: string;
  name: string;
  category: "Bank" | "Remittance";
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  mapsQuery: string;
  image: string;
  description: string;
}

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

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const FinancePage: React.FC = () => {
  // --- States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "Bank" | "Remittance">("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Detecting your location…");
  const [locationError, setLocationError] = useState(false);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Map state
  const [isMapActive, setIsMapActive] = useState(false);
  const [activeLocation, setActiveLocation] = useState<FinanceLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ dist: string; time: string } | null>(null);
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);

  // --- Refs ---
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const activeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeSourceAddedRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // --- Toast Trigger ---
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // --- Geolocation (continuous tracking via watchPosition) ---
  const startLocating = () => {
    if (!navigator.geolocation) {
      showToast("⚠️ Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setLocationError(false);
    setLocationStatus("Detecting your location…");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setUserLocation(coords);
        setIsLocating(false);
        setLocationError(false);
        setLocationStatus(`Location active · ±${coords.accuracy} m accuracy`);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(true);
        const errorMsg = GEOLOCATION_ERROR_MESSAGES[err.code] || "Could not get location.";
        setLocationStatus(errorMsg);
        showToast("⚠️ " + errorMsg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  // --- Map: init once the panel is opened ---
  useEffect(() => {
    if (!isMapActive) return;

    if (!mapboxgl.accessToken) {
      showToast("⚠️ Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: "finance-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.453, 7.1876],
        zoom: 15,
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    }

    setTimeout(() => mapRef.current?.resize(), 100);

    return () => {
      if (!isMapActive && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        activeMarkerRef.current = null;
        routeSourceAddedRef.current = false;
      }
    };
  }, [isMapActive, showToast]);

  // --- Map: keep the user marker in sync ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement("div");
    el.className = "user-dot-wrapper";
    el.innerHTML = '<div class="user-dot-ring"></div><div class="user-dot-inner"></div>';

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 16 }).setHTML(
          '<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>'
        )
      )
      .addTo(map);
  }, [userLocation, isMapActive]);

  // --- Map: place/refresh the active marker and fly to it ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeLocation) return;

    if (activeMarkerRef.current) activeMarkerRef.current.remove();

    const el = document.createElement("div");
    el.innerHTML = `<div style="background:#2b6b45;color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">${activeLocation.pin}</span></div>`;
    const iconEl = el.firstElementChild as HTMLElement;

    const distText = userLocation
      ? `<br><strong>${formatDist(
          haversine(userLocation.lat, userLocation.lng, activeLocation.lat, activeLocation.lng)
        )}</strong> straight-line from you`
      : "";

    activeMarkerRef.current = new mapboxgl.Marker({ element: iconEl, anchor: "bottom" })
      .setLngLat([activeLocation.lng, activeLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 24, maxWidth: "250px" }).setHTML(
          `<div class="finance-popup">
            <h4>${activeLocation.name}</h4>
            <div class="popup-tag">${activeLocation.tag}</div>
            <p>${distText}</p>
            <a href="${googleMapsSearchUrl(activeLocation.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
          </div>`
        )
      )
      .addTo(map);
    activeMarkerRef.current.togglePopup();

    map.flyTo({ center: [activeLocation.lng, activeLocation.lat], zoom: 17, duration: 1000 });
    setTimeout(() => map.resize(), 320);

    document.getElementById("map-panel")?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeLocation, userLocation, isMapActive]);

  const showOnMap = useCallback((loc: FinanceLocation) => {
    setIsMapActive(true);
    setActiveLocation(loc);
    setRouteInfo(null);
  }, []);

  const closeMap = useCallback(() => {
    setIsMapActive(false);
    setActiveLocation(null);
    setRouteInfo(null);
    const map = mapRef.current;
    if (map && routeSourceAddedRef.current && map.getSource("route")) {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      map.removeSource("route");
      routeSourceAddedRef.current = false;
    }
  }, []);

  // Waits (up to ~2s) for the Mapbox map instance to exist before
  // returning, in case the route resolves before the panel/map mounts.
  const waitForMap = useCallback((): Promise<mapboxgl.Map | null> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (mapRef.current) {
          resolve(mapRef.current);
        } else if (Date.now() - start > 2000) {
          resolve(null);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }, []);

  const getRoute = async (loc: FinanceLocation) => {
    if (!userLocation) {
      showToast("📍 Enable location first to get directions.");
      return;
    }

    setLoadingRouteId(loc.id);
    showOnMap(loc);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${loc.lng},${loc.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) throw new Error("No route found");

      const route = data.routes[0];
      const distKm = (route.distance / 1000).toFixed(1);
      const mins = Math.round(route.duration / 60);
      const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

      const map = await waitForMap();
      if (map) {
        if (routeSourceAddedRef.current && map.getSource("route")) {
          (map.getSource("route") as mapboxgl.GeoJSONSource).setData(route.geometry);
        } else {
          map.addSource("route", { type: "geojson", data: route.geometry });
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2b6b45", "line-width": 5, "line-opacity": 0.85 },
          });
          routeSourceAddedRef.current = true;
        }

        const coords: [number, number][] = route.geometry.coordinates;
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 40 });
      }

      setRouteInfo({ dist: `${distKm} km`, time: timeStr });
      showToast(`🧭 Route to ${loc.name}: ${distKm} km · ${timeStr}`);
    } catch {
      showToast("⚠️ Could not load route. Check your internet connection.");
    } finally {
      setLoadingRouteId(null);
    }
  };

  // --- Computed Locations List (Filtering, Searching, Sorting) ---
  const filteredLocations = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    let list = FINANCE_LOCATIONS.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);

      const matchFilter = activeFilter === "all" || item.category.toLowerCase() === activeFilter.toLowerCase();

      return matchSearch && matchFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort((a, b) => {
        const distA = haversine(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = haversine(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return list;
  }, [searchTerm, activeFilter, sortByNearest, userLocation]);

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
              id="searchInput"
              placeholder="Search bank, remittance, pawnshop…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            id="locate-btn"
            className={isLocating ? "loading" : ""}
            onClick={startLocating}
            disabled={isLocating}
            title="Find my location"
          >
            <div className="spinner"></div>
            <span className="btn-label">{userLocation ? "📍 Tracking" : "📍 Locate Me"}</span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal ${modalImage ? "active" : ""}`}
        id="imageModal"
        onClick={(e) => {
          if ((e.target as HTMLElement).id !== "modalImg") setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          ×
        </span>
        {modalImage && <img id="modalImg" src={modalImage} alt="Preview" />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Finance Services in Calinan</h2>
        <p>
          Find banks, remittance centers, and financial institutions near you. Enable location to see
          distances and get directions.
        </p>
        <div className={`location-status ${userLocation || locationError ? "visible" : ""}`}>
          <div className={`loc-dot ${locationError ? "loc-err" : ""}`} id="loc-dot"></div>
          <span id="loc-text">{locationStatus}</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        <button
          className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All
        </button>
        <button
          className={`filter-chip ${activeFilter === "Bank" ? "active" : ""}`}
          onClick={() => setActiveFilter("Bank")}
        >
          Banks
        </button>
        <button
          className={`filter-chip ${activeFilter === "Remittance" ? "active" : ""}`}
          onClick={() => setActiveFilter("Remittance")}
        >
          Remittance
        </button>
        <button
          className={`sort-btn ${sortByNearest ? "active" : ""}`}
          disabled={!userLocation}
          onClick={() => setSortByNearest(!sortByNearest)}
          title={!userLocation ? "Enable location first" : "Sort locations by distance"}
        >
          {sortByNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </div>

      <div id="result-count">
        {filteredLocations.length > 0
          ? `Showing ${filteredLocations.length} of ${FINANCE_LOCATIONS.length} locations`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {filteredLocations.map((loc) => {
          const distanceKm = userLocation ? haversine(userLocation.lat, userLocation.lng, loc.lat, loc.lng) : null;

          return (
            <div className="card" key={loc.id}>
              <div className="card-image" onClick={() => setModalImage(loc.image)}>
                <img src={loc.image} alt={loc.name} />
              </div>
              <div className="card-content">
                <h3>
                  <a href={googleMapsSearchUrl(loc.mapsQuery)} target="_blank" rel="noopener noreferrer">
                    {loc.name}
                  </a>
                </h3>
                <p>{loc.description}</p>
                <span className="tag">{loc.tag}</span>

                {distanceKm !== null && (
                  <div className="dist-badge visible">
                    <div className="dot"></div>
                    <span className="dist-text">{formatDist(distanceKm)}</span>
                  </div>
                )}

                <div className="card-actions">
                  <button className="view-map-btn" onClick={() => showOnMap(loc)}>
                    📍 View on Map
                  </button>
                  <button
                    className={`route-btn ${userLocation ? "visible" : ""} ${
                      loadingRouteId === loc.id ? "loading" : ""
                    }`}
                    onClick={() => getRoute(loc)}
                  >
                    {loadingRouteId === loc.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredLocations.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2b6b45" strokeWidth="1.5">
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
      <div id="map-panel-spacer" className={isMapActive ? "active" : ""}></div>

      {/* MAP PANEL */}
      <div id="map-panel" className={isMapActive ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {activeLocation ? activeLocation.name : "Map"}</div>
            <div id="map-panel-subtitle">{activeLocation?.tag}</div>
          </div>
          <div id="map-panel-actions">
            {activeLocation && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(activeLocation.mapsQuery)}
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

        <div id="finance-map"></div>

        {routeInfo && (
          <div id="route-info" className="visible">
            <span>
              🛣️ Road distance: <strong>{routeInfo.dist}</strong>
            </span>
            <span>
              ⏱️ Estimated time: <strong>{routeInfo.time}</strong>
            </span>
          </div>
        )}
      </div>

      {/* TOAST */}
      <div id="toast" className={toastMsg ? "show" : ""}>
        {toastMsg}
      </div>
    </div>
  );
};

export default FinancePage;