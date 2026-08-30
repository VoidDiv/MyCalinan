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

/* ============================================================
   DATA
   ============================================================ */

type Category = "Church" | "Cemetery" | "Barangay Hall" | "District Hall";
type FilterValue = Category | "all";

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

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface RouteInfo {
  distKm: string;
  timeStr: string;
}

const PLACES: CommunityPlace[] = [
  {
    id: "sacred-heart-parish",
    name: "The Most Sacred Heart of Jesus Parish",
    category: "Church",
    lat: 7.1903,
    lng: 125.4543,
    tag: "Church",
    pin: "⛪",
    image: "/image/The Most Sacred Heart of Jesus Parish.png",
    description:
      "Datu Abing St., Calinan — Roman Catholic parish under the Archdiocese of Davao serving as the central place of worship for Calinan's Catholic community, offering daily Masses and full sacraments.",
    mapsQuery:
      "The+Most+Sacred+Heart+of+Jesus+Parish+Datu+Abing+St+Calinan+Davao+City+Davao+del+Sur",
  },
  {
    id: "calinan-adventist",
    name: "Calinan Central Adventist Church of Davao Mission",
    category: "Church",
    lat: 7.1845,
    lng: 125.4505,
    tag: "Church",
    pin: "⛪",
    image: "/image/Calinan Central Adventist Church of Davao Mission.png",
    description:
      "McArthur Highway, Calinan District — Seventh-day Adventist congregation under the Davao Mission, serving as a community worship center for members in the Davao Region.",
    mapsQuery:
      "Calinan+Central+Adventist+Church+of+Davao+Mission+Mc+Arthur+Highway+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "iglesia-ni-cristo",
    name: "Iglesia Ni Cristo",
    category: "Church",
    lat: 7.1858,
    lng: 125.458,
    tag: "Church",
    pin: "⛪",
    image: "/image/Iglesia Ni Cristo1.png",
    description:
      "Purok 18, De Lara St., Calinan District — Local congregation of the international Christian organization headquartered in Quezon City, serving as a place of worship for INC members in the Calinan area.",
    mapsQuery:
      "Iglesia+Ni+Cristo+Purok+18+De+Lara+Street+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "latter-day-saints",
    name: "The Church of Jesus Christ of Latter-day Saints",
    category: "Church",
    lat: 7.1895,
    lng: 125.4548,
    tag: "Church",
    pin: "⛪",
    image: "/image/Iglesia Ni Cristo2.png",
    description:
      "Lanzona Subd., Calinan Poblacion — Local meetinghouse for the global Latter-day Saint community, offering weekly services and programs emphasizing faith in Jesus Christ and family values.",
    mapsQuery:
      "The+Church+of+Jesus+Christ+of+Latter-day+Saints+Lanzona+Subdivision+Calinan+Poblacion+Davao+City+Davao+del+Sur",
  },
  {
    id: "intl-bible-baptist",
    name: "International Bible Baptist Church",
    category: "Church",
    lat: 7.1883,
    lng: 125.4552,
    tag: "Church",
    pin: "⛪",
    image: "/image/International Bible Baptist Church.png",
    description:
      "Guiho Street, Calinan Poblacion — Baptist congregation offering worship services, Bible preaching, prayer meetings, youth fellowship, and outreach programs for the Calinan community.",
    mapsQuery:
      "International+Bible+Baptist+Church+Guiho+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
  },
  {
    id: "calinan-public-cemetery",
    name: "Calinan Public Cemetery",
    category: "Cemetery",
    lat: 7.183,
    lng: 125.453,
    tag: "Public Cemetery",
    pin: "🪦",
    image: "/image/Calinan Public Cementery.png",
    description:
      "Calinan Poblacion — Traditional public burial ground serving families and residents of Calinan, providing accessible burial services and long part of the district's history and heritage.",
    mapsQuery:
      "Calinan+Public+Cemetery+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "calinan-private-cemetery",
    name: "Calinan Private Cemetery",
    category: "Cemetery",
    lat: 7.1895,
    lng: 125.4565,
    tag: "Private Cemetery",
    pin: "🪦",
    image: "/image/Calinan Private Cementery.png",
    description:
      "R. Magsaysay Street, Calinan — Privately managed memorial park offering burial and commemorative services in a landscaped setting, part of Calinan's network of community memorial spaces.",
    mapsQuery:
      "Calinan+Memorial+Park+R.+Magsaysay+Street+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "calinan-poblacion-barangay-hall",
    name: "Calinan Poblacion Barangay Hall",
    category: "Barangay Hall",
    lat: 7.1873,
    lng: 125.4513,
    tag: "Barangay Hall",
    pin: "🏛️",
    image: "/image/Calinan Poblacion Barangay Hall.png",
    description:
      "34 Aurora, Calinan Poblacion — Primary local government office providing barangay clearances, certificates of residency, dispute mediation, peace and order coordination, and assistance programs.",
    mapsQuery:
      "Calinan+Poblacion+Barangay+Hall+34+Aurora+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "calinan-district-hall",
    name: "Calinan District Hall",
    category: "District Hall",
    lat: 7.1878,
    lng: 125.4548,
    tag: "District Hall",
    pin: "🏛️",
    image: "/image/Calinan District Hall.png",
    description:
      "H. Quiambao Street, Calinan Poblacion — District-level government office managing programs, administrative concerns, infrastructure coordination, and public services for all barangays under Calinan.",
    mapsQuery:
      "Calinan+District+Hall+H.+Quiambao+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
  },
];

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Churches", value: "Church" },
  { label: "Cemeteries", value: "Cemetery" },
  { label: "Barangay Hall", value: "Barangay Hall" },
  { label: "District Hall", value: "District Hall" },
];

/* ============================================================
   HELPERS
   ============================================================ */

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

/* ============================================================
   COMPONENT
   ============================================================ */

export default function CommunityPage() {
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
  const [selectedPlace, setSelectedPlace] = useState<CommunityPlace | null>(null);
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

  // --- Geolocation (continuous tracking via watchPosition) ---
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
        container: "community-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.4548, 7.1878],
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
  useEffect(() => {
    if (!isMapPanelOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      userMarkerRef.current = null;
      activeMarkerRef.current = null;
    }
  }, [isMapPanelOpen]);

  // Update user marker on map (kept separate from the place marker so
  // continuous location tracking doesn't re-trigger the place popup)
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
  const handleShowOnMap = (item: CommunityPlace) => {
    setSelectedPlace(item);
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
        <div class="place-popup">
          <span class="popup-tag">${item.tag}</span>
          <h4>${item.pin} ${item.name}</h4>
          <p>${item.description}${distText}</p>
          <a href="${googleMapsSearchUrl(item.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
        </div>`;

      activeMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([item.lng, item.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24, maxWidth: "260px" }).setHTML(popupHtml))
        .addTo(map);
      activeMarkerRef.current.togglePopup();

      map.flyTo({ center: [item.lng, item.lat], zoom: 17, duration: 1000 });
      map.resize();
    }, 100);
  };

  const handleGetDirections = async (item: CommunityPlace) => {
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
    setSelectedPlace(null);
  };

  // --- Filtering & Sorting Data ---
  const processedPlaces = useMemo(() => {
    return PLACES.map((item) => {
      const distance = userLoc ? haversine(userLoc.lat, userLoc.lng, item.lat, item.lng) : null;
      return { ...item, distance };
    })
      .filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q);

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

  const resultCountLabel = `${processedPlaces.length} place${
    processedPlaces.length === 1 ? "" : "s"
  } found`;

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
          &times;
        </span>
        {modalImageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img id="modalImg" className="modal-content" src={modalImageSrc} alt="Photo" />
        )}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Community Services in Calinan</h2>
        <p>
          Explore essential public spaces and institutions that serve the Calinan community. Enable
          location to see distances and get directions.
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
      <div id="result-count">{resultCountLabel}</div>

      {/* CARDS CONTAINER */}
      <section className="container" id="cards-container">
        {processedPlaces.map((place) => (
          <div key={place.id} className="card">
            <div className="card-image" onClick={() => setModalImageSrc(place.image)}>
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

              <div className={`dist-badge ${place.distance !== null ? "visible" : ""}`}>
                <div className="dot"></div>
                <span className="dist-text">
                  {place.distance !== null ? formatDist(place.distance) : ""}
                </span>
              </div>

              <div className="card-actions">
                <button className="view-map-btn" onClick={() => handleShowOnMap(place)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn ${userLoc ? "visible" : ""} ${
                    isRoutingLoading === place.id ? "loading" : ""
                  }`}
                  onClick={() => handleGetDirections(place)}
                >
                  {isRoutingLoading === place.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {processedPlaces.length === 0 && (
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
      <div id="map-panel-spacer" className={isMapPanelOpen ? "active" : ""}></div>

      {/* MAP PANEL */}
      <div id="map-panel" className={isMapPanelOpen ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {selectedPlace ? selectedPlace.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedPlace?.tag || ""}</div>
          </div>
          <div id="map-panel-actions">
            <a
              id="map-directions-link"
              className={selectedPlace ? "visible" : ""}
              href={
                selectedPlace
                  ? googleMapsDirectionsUrl(userLoc, selectedPlace.lat, selectedPlace.lng)
                  : "#"
              }
              target="_blank"
              rel="noreferrer"
            >
              🧭 Open in Google Maps
            </a>
            <button id="map-panel-close" onClick={handleCloseMap} title="Close map">
              ✕
            </button>
          </div>
        </div>

        <div id="community-map"></div>

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
    </>
  );
}