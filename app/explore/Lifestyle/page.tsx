"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, LineString } from "geojson";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
export interface LocationItem {
  id: string;
  name: string;
  category: "Gym" | "Hotel";
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  mapsQuery: string;
  imageSrc: string;
  address: string;
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
const LOCATIONS_DATA: LocationItem[] = [
  {
    id: "la-migs-gym",
    name: "La' Migs Fitness Gym",
    category: "Gym",
    lat: 7.186,
    lng: 125.4498,
    tag: "Gym",
    pin: "🏋️",
    mapsQuery: "La'+Migs+Fitness+Gym+Crossing+Calinan+Davao+City",
    imageSrc: "image/La_ Migs Fitness Gym.png",
    address: "Buda National Hwy, Crossing Calinan",
    description:
      "Community-oriented fitness center offering strength training, cardio workouts, and general wellness in a supportive neighborhood setting.",
  },
  {
    id: "ultradynamic-gym",
    name: "Ultradynamic Fitness Gym",
    category: "Gym",
    lat: 7.188,
    lng: 125.4535,
    tag: "Gym",
    pin: "🏋️",
    mapsQuery: "Ultradynamic+Fitness+Gym+Calinan+Davao+City",
    imageSrc: "image/Ultradynamic Fitness Gym - Calinan Davao.jpg",
    address: "3rd Floor Spazio Del Fierro, Villafuerte cor. Malanos St., Calinan",
    description:
      "Modern gym offering strength equipment, cardio machines, group workouts, and coaching; open early and ideal for beginners to advanced gym-goers.",
  },
  {
    id: "casa-imelda-inn",
    name: "Casa Imelda Inn",
    category: "Hotel",
    lat: 7.192,
    lng: 125.456,
    tag: "Hotel",
    pin: "🏨",
    mapsQuery: "Casa+Imelda+Inn+Abayon+Calinan+Davao+City",
    imageSrc: "image/Casa Imelda Inn.png",
    address: "Abayon, Calinan District",
    description:
      "Small local lodging establishment offering a convenient stay for visitors exploring Calinan, known for its proximity to nature attractions and local commerce.",
  },
  {
    id: "sonreir-apartelle",
    name: "Sonreir Apartelle and Inn",
    category: "Hotel",
    lat: 7.187,
    lng: 125.452,
    tag: "Hotel",
    pin: "🏨",
    mapsQuery: "SONREIR+APARTELLE+AND+INN+Calinan+Davao+City",
    imageSrc: "image/SONREIR APARTELLE AND INN.png",
    address: "Davao–Bukidnon Rd, Calinan District",
    description:
      "Lodging establishment offering comfortable rooms for short stays and overnight accommodation for travelers along the Davao–Bukidnon route.",
  },
];

// ----------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
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

const EMPTY_ROUTE_GEOJSON: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const LifestylePage: React.FC = () => {
  // --- States ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "Gym" | "Hotel">("all");
  const [sortByNearest, setSortByNearest] = useState<boolean>(false);

  // User location
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locStatusText, setLocStatusText] = useState<string>("Detecting your location…");
  const [isLocError, setIsLocError] = useState<boolean>(false);
  const [hasLocationActive, setHasLocationActive] = useState<boolean>(false);

  // Modal State
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map & Active Item Panel
  const [isMapPanelOpen, setIsMapPanelOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<LocationItem | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState<string | null>(null); // item.id when loading

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
        container: "lifestyle-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.453, 7.188],
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
  const handleShowOnMap = (item: LocationItem) => {
    setSelectedItem(item);
    setIsMapPanelOpen(true);
    setRouteInfo(null);

    // Give react time to render map panel DOM / init the map
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
      el.innerHTML = `<span style="transform:rotate(45deg)">${item.pin}</span>`;

      const distText = userLoc
        ? `<br><strong>${formatDist(
            haversine(userLoc.lat, userLoc.lng, item.lat, item.lng)
          )}</strong> straight-line from you`
        : "";

      const popupHtml = `
        <div class="place-popup">
          <h4>${item.name}</h4>
          <div class="popup-tag">${item.tag}</div>
          <p>${distText}</p>
          <a href="https://www.google.com/maps/search/?api=1&query=${item.mapsQuery}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
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

  const handleGetDirections = async (item: LocationItem) => {
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
    setSelectedItem(null);
  };

  // --- Filtering & Sorting Data ---
  const processedLocations = LOCATIONS_DATA.map((item) => {
    const distance = userLoc ? haversine(userLoc.lat, userLoc.lng, item.lat, item.lng) : null;
    return { ...item, distance };
  })
    .filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);

      const matchesFilter =
        activeFilter === "all" || item.category.toLowerCase() === activeFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortByNearest && userLoc && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImageSrc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div>
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
        <h2>Relax & Recharge in Calinan</h2>
        <p>Discover gyms and hotels around the Calinan area. Enable location to see distances and get directions.</p>
        <div id="location-status" className={hasLocationActive ? "visible" : ""}>
          <div className={`loc-dot ${isLocError ? "loc-err" : ""}`} id="loc-dot"></div>
          <span id="loc-text">{locStatusText}</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        {(["all", "Gym", "Hotel"] as const).map((type) => (
          <button
            key={type}
            className={`filter-chip ${activeFilter === type ? "active" : ""}`}
            onClick={() => setActiveFilter(type)}
          >
            {type === "all" ? "All" : type}
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
          ? `Showing ${processedLocations.length} of ${LOCATIONS_DATA.length} locations`
          : ""}
      </div>

      {/* CARDS CONTAINER */}
      <section className="container" id="cards-container">
        {processedLocations.map((item) => (
          <div key={item.id} className="card">
            <div className="card-image" onClick={() => setModalImageSrc(item.imageSrc)}>
              <img src={item.imageSrc} alt={item.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${item.mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.name}
                </a>
              </h3>
              <p>
                <strong>{item.address}</strong> — {item.description}
              </p>
              <span className="tag">{item.tag}</span>

              <div className={`dist-badge ${item.distance !== null ? "visible" : ""}`}>
                <div className="dot"></div>
                <span className="dist-text">{item.distance !== null ? formatDist(item.distance) : ""}</span>
              </div>

              <div className="card-actions">
                <button className="view-map-btn" onClick={() => handleShowOnMap(item)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn ${userLoc ? "visible" : ""} ${
                    isRoutingLoading === item.id ? "loading" : ""
                  }`}
                  onClick={() => handleGetDirections(item)}
                >
                  {isRoutingLoading === item.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {processedLocations.length === 0 && (
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
            <div id="map-panel-title">📍 {selectedItem ? selectedItem.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedItem?.tag || ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedItem && (
              <a
                id="map-directions-link"
                className="visible"
                href={`https://www.google.com/maps/search/?api=1&query=${selectedItem.mapsQuery}`}
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

        <div id="lifestyle-map"></div>

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

export default LifestylePage;