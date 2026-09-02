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
   Converted 1:1 from the Transport & Utilities static cards.
   ============================================================ */

type Category = "Gas Station" | "Transport Terminal";

interface TransportPlace {
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
  distance: string;
  time: string;
}

const STORAGE_BASE =
  "https://storage.googleapis.com/mycalinan.firebasestorage.app/Transport";

const PLACES: TransportPlace[] = [
  {
    id: "petron-1",
    name: "Petron",
    category: "Gas Station",
    lat: 7.1855,
    lng: 125.45,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/Petron1.png`,
    description:
      "Davao–Buda National Highway, Calinan District — Full-service fuel station in Petron's nationwide network providing fuel, lubricants, and related vehicle services.",
    mapsQuery: "Petron+Davao+Buda+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "petron-2",
    name: "Petron",
    category: "Gas Station",
    lat: 7.1885,
    lng: 125.4562,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/Petron2.png`,
    description:
      "Villafuerte St., Calinan District — Part of Petron Corporation's nationwide network providing fuel, lubricants, and vehicle services for motorists in the Calinan area.",
    mapsQuery: "Petron+Villafuerte+Street+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "shell-1",
    name: "Shell",
    category: "Gas Station",
    lat: 7.1845,
    lng: 125.4495,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/Shell.png`,
    description:
      "Davao–Buda National Highway, Purok 16, Calinan — Shell service station offering fuel, car care, and vehicle maintenance as part of Shell's nationwide retail network.",
    mapsQuery: "Shell+Davao+Buda+National+Highway+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "caltex-1",
    name: "Caltex",
    category: "Gas Station",
    lat: 7.1905,
    lng: 125.4545,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/Caltex1.jpg`,
    description:
      "Datu Abing St., Calinan — Convenient fueling point strategically placed along key transport routes toward downtown Davao and nearby municipalities.",
    mapsQuery: "Caltex+Datu+Abing+Street+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "caltex-2",
    name: "Caltex",
    category: "Gas Station",
    lat: 7.187,
    lng: 125.451,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/Caltex2.jpg`,
    description:
      "Davao–Bukidnon Road, Corner Aurora, Calinan — Fueling point connecting major transport routes for residents and travelers within western Davao City.",
    mapsQuery:
      "Caltex+Davao-Bukidnon+Road+Corner+Aurora+Calinan+Davao+City+Davao+del+Sur",
  },
  {
    id: "seaoil-1",
    name: "SEAOIL",
    category: "Gas Station",
    lat: 7.186,
    lng: 125.4575,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/SEAOIL.jpg`,
    description:
      "Fausta St., Calinan District — Fuel service station under SEAOIL Philippines Inc., known for locally refined and imported petroleum products across a nationwide chain.",
    mapsQuery: "SEAOIL+Fausta+St+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "mygas-1",
    name: "MyGas",
    category: "Gas Station",
    lat: 7.1875,
    lng: 125.4515,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/MyGas.jpg`,
    description:
      "Aurora St., Calinan District — Part of My Gas Petroleum Corporation's growing regional network of service stations across Southern Mindanao.",
    mapsQuery: "MyGas+Aurora+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "gazz-1",
    name: "Gazz",
    category: "Gas Station",
    lat: 7.1862,
    lng: 125.4522,
    tag: "Gas Station",
    pin: "⛽",
    image: `${STORAGE_BASE}/Gazz.png`,
    description:
      "De Lara St., Calinan — Compact roadside station ideal for motorcycles, tricycles, and private vehicles along the busy Davao–Bukidnon Road.",
    mapsQuery: "Gazz+De+Lara+St+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "calmalba-toda",
    name: "CALMALBA TODA",
    category: "Transport Terminal",
    lat: 7.1887,
    lng: 125.4556,
    tag: "Transport Terminal",
    pin: "🚐",
    image: `${STORAGE_BASE}/CALMALBA%20TODA.jpg`,
    description:
      "R. Magsaysay St., Calinan — Also known as Malagos Terminal, a key transport hub connecting Malagos and neighboring barangays to the wider Davao metropolitan area.",
    mapsQuery:
      "CALMALBA+TODA+R.+Magsaysay+St+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "caltransco-caloda",
    name: "CALTRANSCO (CALODA)",
    category: "Transport Terminal",
    lat: 7.189,
    lng: 125.4558,
    tag: "Transport Terminal",
    pin: "🚐",
    image: `${STORAGE_BASE}/CALTRANSCO%20(CALODA).jpg`,
    description:
      "R. Magsaysay St., Calinan — Member-driven transport service cooperative providing organized public transportation within and around Davao del Sur.",
    mapsQuery:
      "CALTRANSCO+CALODA+R.+Magsaysay+St+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "third-district-transport-coop",
    name: "Third District Transport Cooperative",
    category: "Transport Terminal",
    lat: 7.1892,
    lng: 125.456,
    tag: "Transport Terminal",
    pin: "🚐",
    image: `${STORAGE_BASE}/Third%20District%20Transport%20Cooperative.png`,
    description:
      "R. Magsaysay St., Calinan — CDA-recognized transport cooperative serving the Davao Region's third district with organized public transport services.",
    mapsQuery:
      "Third+District+Transport+Cooperative+R.+Magsaysay+St+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "jeepney-terminal-mintal-davao",
    name: "Jeepney Terminal Mintal & Davao",
    category: "Transport Terminal",
    lat: 7.1858,
    lng: 125.4578,
    tag: "Transport Terminal",
    pin: "🚐",
    image: `${STORAGE_BASE}/Jeepney%20Terminal%20Mintal%20%26%20Davao.png`,
    description:
      "Fausta, Calinan District — Central loading and unloading point for jeepneys connecting Mintal, Calinan, and surrounding barangays to the city proper.",
    mapsQuery:
      "Jeepney+Terminal+Mintal+and+Davao+Fausta+Calinan+District+Davao+City+Davao+del+Sur",
  },
  {
    id: "anatolio-taxi-terminal",
    name: "Anatolio Taxi Terminal",
    category: "Transport Terminal",
    lat: 7.188,
    lng: 125.455,
    tag: "Transport Terminal",
    pin: "🚐",
    image: `${STORAGE_BASE}/Anatolio%20Taxi%20Terminal.png`,
    description:
      "Calinan Poblacion — Local taxi terminal offering faster point-to-point travel for residents, shoppers, workers, and visitors heading to and from Davao City.",
    mapsQuery:
      "Anatolio+Taxi+Terminal+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur",
  },
];

const FILTERS: Array<{ label: string; value: Category | "all" }> = [
  { label: "All", value: "all" },
  { label: "Gas Stations", value: "Gas Station" },
  { label: "Terminals", value: "Transport Terminal" },
];

/* ============================================================
   HELPERS
   ============================================================ */

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

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
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

const EMPTY_ROUTE_GEOJSON: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/* ============================================================
   COMPONENT
   ============================================================ */

export default function TransportUtilitiesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");
  const [sortNearest, setSortNearest] = useState(false);

  // User location states (mirrors Education/Shopping: live tracking, not one-shot)
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locStatusText, setLocStatusText] = useState("Detecting your location…");
  const [isLocError, setIsLocError] = useState(false);
  const [hasLocationActive, setHasLocationActive] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState<TransportPlace | null>(
    null
  );
  const [isMapPanelOpen, setIsMapPanelOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routingId, setRoutingId] = useState<string | null>(null);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const activeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapLoadedRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- toast ---------- */

  const showToast = useCallback((message: string, duration = 3000) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* ---------- locate me (live tracking, matches Education/Shopping) ---------- */

  function startLocating() {
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
        const errorMessages: Record<number, string> = {
          1: "Location access denied. Please allow location permissions in your browser.",
          2: "Location unavailable. Check your GPS or connection.",
          3: "Location request timed out. Please try again.",
        };
        const msg = errorMessages[err.code] || "Could not retrieve your location.";
        setLocStatusText(msg);
        showToast("⚠️ " + msg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /* ---------- filtering / sorting ---------- */

  const visiblePlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = PLACES.filter((p) => {
      const matchesFilter = activeFilter === "all" || p.category === activeFilter;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });

    if (sortNearest && userLoc) {
      list = [...list].sort(
        (a, b) =>
          haversineKm(userLoc.lat, userLoc.lng, a.lat, a.lng) -
          haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng)
      );
    }

    return list;
  }, [search, activeFilter, sortNearest, userLoc]);

  /* ---------- map init & lifetime (route source added on load, like Education/Shopping) ---------- */

  useEffect(() => {
    if (!isMapPanelOpen) return;

    if (!mapboxgl.accessToken) {
      showToast("Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: "transport-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.454, 7.188],
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

  // Sync user location marker (independent of which place is selected)
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

  function showOnMap(place: TransportPlace) {
    setSelectedPlace(place);
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

      const popupHtml = `
        <div class="place-popup">
          <span class="popup-tag">${place.tag}</span>
          <h4>${place.pin} ${place.name}</h4>
          <p>${place.description}</p>
          <a href="${googleMapsSearchUrl(place.mapsQuery)}" target="_blank" rel="noreferrer">Open in Google Maps</a>
        </div>
      `;

      activeMarkerRef.current = new mapboxgl.Marker({ color: "#2b6b45" })
        .setLngLat([place.lng, place.lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml))
        .addTo(map);
      activeMarkerRef.current.togglePopup();

      map.flyTo({ center: [place.lng, place.lat], zoom: 16, duration: 1000 });
      map.resize();
    }, 100);
  }

  function closeMap() {
    setIsMapPanelOpen(false);
    setSelectedPlace(null);
    setRouteInfo(null);
  }

  /* ---------- directions / route (now draws the actual road path) ---------- */

  async function getRoute(place: TransportPlace) {
    if (!userLoc) {
      showToast("📍 Enable location first to get directions.");
      return;
    }

    setRoutingId(place.id);
    showOnMap(place);

    const url = `https://router.project-osrm.org/route/v1/driving/${userLoc.lng},${userLoc.lat};${place.lng},${place.lat}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const route = data?.routes?.[0];

      if (!route) {
        showToast("⚠️ Couldn't calculate a route.");
        return;
      }

      const coordinates: [number, number][] = route.geometry.coordinates;
      const km = route.distance / 1000;
      const mins = Math.round(route.duration / 60);

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

      setRouteInfo({
        distance: formatDistance(km),
        time: mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`,
      });
      showToast(`🧭 Route to ${place.name}: ${formatDistance(km)} · ${mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`}`);
    } catch {
      showToast("⚠️ Could not load route. Check your internet connection.");
    } finally {
      setRoutingId(null);
    }
  }

  /* ---------- ESC key closes image modal (was missing) ---------- */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ---------- render ---------- */

  const resultCountLabel = `${visiblePlaces.length} place${
    visiblePlaces.length === 1 ? "" : "s"
  } found`;

  return (
    <div>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1 className="logo">Transport & Utilities</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search gas stations, terminals…"
              autoComplete="off"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <button
            id="locate-btn"
            className={isLocating ? "loading" : ""}
            onClick={startLocating}
            disabled={isLocating}
            title="Find my location"
          >
            <div className="spinner" />
            <span className="btn-label">
              {isLocating ? "Locating..." : userLoc ? "📍 Tracking" : "📍 Locate Me"}
            </span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal ${modalImage ? "active" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== "IMG") setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          &times;
        </span>
        {modalImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="modal-content" src={modalImage} alt="Photo" />
        )}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Transport & Utilities in Calinan</h2>
        <p>
          Find gas stations, transport terminals, and essential services near
          you. Enable location to see distances and get directions.
        </p>
        <div id="location-status" className={hasLocationActive ? "visible" : ""}>
          <div className={`loc-dot ${isLocError ? "loc-err" : ""}`} />
          <span>{locStatusText}</span>
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
          className={`sort-btn ${sortNearest ? "active" : ""}`}
          disabled={!userLoc}
          title={userLoc ? "" : "Enable location first"}
          onClick={() => setSortNearest((s) => !s)}
        >
          {sortNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </div>
      <div id="result-count">{resultCountLabel}</div>

      {/* CARDS */}
      <section className="container">
        {visiblePlaces.map((place) => {
          const distance = userLoc
            ? haversineKm(userLoc.lat, userLoc.lng, place.lat, place.lng)
            : null;

          return (
            <div className="card" key={place.id}>
              <div className="card-image" onClick={() => setModalImage(place.image)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={place.image} alt={place.name} />
              </div>
              <div className="card-content">
                <h3>
                  <a
                    href={googleMapsSearchUrl(place.mapsQuery)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {place.name}
                  </a>
                </h3>
                <p>{place.description}</p>
                <span className="tag">{place.tag}</span>
                <div className={`dist-badge ${distance !== null ? "visible" : ""}`}>
                  <div className="dot" />
                  <span>{distance !== null ? formatDistance(distance) : ""}</span>
                </div>
                <div className="card-actions">
                  <button className="view-map-btn" onClick={() => showOnMap(place)}>
                    📍 View on Map
                  </button>
                  <button
                    className={`route-btn ${userLoc ? "visible" : ""} ${
                      routingId === place.id ? "loading" : ""
                    }`}
                    onClick={() => getRoute(place)}
                  >
                    {routingId === place.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {visiblePlaces.length === 0 && (
          <div id="empty-state" className="visible" style={{ display: "flex" }}>
            <svg
              width="56"
              height="56"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#2b6b45"
              strokeWidth="1.5"
            >
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
      <div id="map-panel-spacer" className={isMapPanelOpen ? "active" : ""} />

      {/* MAP PANEL */}
      <div id="map-panel" className={isMapPanelOpen ? "active" : ""}>
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
                  ? googleMapsDirectionsUrl(userLoc, selectedPlace.lat, selectedPlace.lng)
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
        <div id="transport-map" />
        <div id="route-info" className={routeInfo ? "visible" : ""}>
          <span>
            🛣️ Road distance: <strong>{routeInfo?.distance ?? "–"}</strong>
          </span>
          <span>
            ⏱️ Estimated time: <strong>{routeInfo?.time ?? "–"}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div id="toast" className={toast ? "show" : ""}>
        {toast}
      </div>
    </div>
  );
}