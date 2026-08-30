"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

const PLACES: TransportPlace[] = [
  {
    id: "petron-1",
    name: "Petron",
    category: "Gas Station",
    lat: 7.1855,
    lng: 125.45,
    tag: "Gas Station",
    pin: "⛽",
    image: "/image/Petron1.png",
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
    image: "/image/Petron2.png",
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
    image: "/image/Shell.png",
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
    image: "/image/Caltex1.jpg",
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
    image: "/image/Caltex2.jpg",
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
    image: "/image/SEAOIL.jpg",
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
    image: "/image/MyGas.jpg",
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
    image: "/image/Gazz.png",
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
    image: "/image/CALMALBA TODA.jpg",
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
    image: "/image/CALTRANSCO (CALODA).jpg",
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
    image: "/image/Third District Transport Cooperative.png",
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
    image: "/image/Jeepney Terminal Mintal & Davao.png",
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
    image: "/image/Anatolio Taxi Terminal.png",
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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/* ============================================================
   COMPONENT
   ============================================================ */

export default function TransportUtilitiesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");
  const [sortNearest, setSortNearest] = useState(false);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<TransportPlace | null>(
    null
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    time: string;
  } | null>(null);
  const [routingId, setRoutingId] = useState<string | null>(null);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- toast ---------- */

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* ---------- locate me ---------- */

  function handleLocate() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported on this device.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location. Check permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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

    if (sortNearest && userLocation) {
      list = [...list].sort(
        (a, b) =>
          haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
          haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
    }

    return list;
  }, [search, activeFilter, sortNearest, userLocation]);

  /* ---------- map lifecycle ---------- */

  useEffect(() => {
    if (!mapOpen || !selectedPlace) return;

    if (!mapboxgl.accessToken) {
      showToast("Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: "transport-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [selectedPlace.lng, selectedPlace.lat],
        zoom: 16,
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    } else {
      mapRef.current.flyTo({ center: [selectedPlace.lng, selectedPlace.lat], zoom: 16 });
    }

    const map = mapRef.current;

    // clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const popupHtml = `
      <div class="place-popup">
        <span class="popup-tag">${selectedPlace.tag}</span>
        <h4>${selectedPlace.pin} ${selectedPlace.name}</h4>
        <p>${selectedPlace.description}</p>
        <a href="${googleMapsSearchUrl(
          selectedPlace.mapsQuery
        )}" target="_blank" rel="noreferrer">Open in Google Maps</a>
      </div>
    `;

    const marker = new mapboxgl.Marker({ color: "#2b6b45" })
      .setLngLat([selectedPlace.lng, selectedPlace.lat])
      .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml))
      .addTo(map);
    marker.togglePopup();
    markersRef.current.push(marker);

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
      const el = document.createElement("div");
      el.className = "user-dot-wrapper";
      el.innerHTML =
        '<div class="user-dot-ring"></div><div class="user-dot-inner"></div>';

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 16 }).setHTML(
            '<div class="user-popup"><h4>You are here</h4><p>Your current location</p></div>'
          )
        )
        .addTo(map);
    }

    setTimeout(() => map.resize(), 250);
  }, [mapOpen, selectedPlace, userLocation]);

  useEffect(() => {
    if (!mapOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = [];
      userMarkerRef.current = null;
    }
  }, [mapOpen]);

  function showOnMap(place: TransportPlace) {
    setSelectedPlace(place);
    setRouteInfo(null);
    setMapOpen(true);
  }

  function closeMap() {
    setMapOpen(false);
    setSelectedPlace(null);
    setRouteInfo(null);
  }

  /* ---------- directions / route ---------- */

  async function getRoute(place: TransportPlace) {
    if (!userLocation) {
      showToast("Enable location first to get directions.");
      return;
    }
    setSelectedPlace(place);
    setMapOpen(true);
    setRoutingId(place.id);
    setRouteInfo(null);

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${place.lng},${place.lat}?overview=false`
      );
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route) {
        const km = route.distance / 1000;
        const mins = Math.round(route.duration / 60);
        setRouteInfo({
          distance: formatDistance(km),
          time: mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`,
        });
      } else {
        showToast("Couldn't calculate a route.");
      }
    } catch {
      showToast("Couldn't reach the routing service.");
    } finally {
      setRoutingId(null);
    }
  }

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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            id="locate-btn"
            className={locating ? "loading" : ""}
            onClick={handleLocate}
            disabled={locating}
            title="Find my location"
          >
            <div className="spinner" />
            <span className="btn-label">📍 Locate Me</span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      {modalImage && (
        <div className="image-modal active" onClick={() => setModalImage(null)}>
          <span className="close" onClick={() => setModalImage(null)}>
            &times;
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={modalImage} alt="Photo" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* HERO */}
      <section className="hero">
        <h2>Transport & Utilities in Calinan</h2>
        <p>
          Find gas stations, transport terminals, and essential services near
          you. Enable location to see distances and get directions.
        </p>
        <div id="location-status" className={locating || userLocation || locationError ? "visible" : ""}>
          <div className={`loc-dot ${locationError ? "loc-err" : ""}`} />
          <span>
            {locating
              ? "Detecting your location…"
              : locationError
              ? locationError
              : userLocation
              ? "Location enabled — distances shown below"
              : ""}
          </span>
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
          disabled={!userLocation}
          title={userLocation ? "" : "Enable location first"}
          onClick={() => setSortNearest((s) => !s)}
        >
          📶 Sort by nearest
        </button>
      </div>
      <div id="result-count">{resultCountLabel}</div>

      {/* CARDS */}
      <section className="container">
        {visiblePlaces.map((place) => {
          const distance = userLocation
            ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
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
                    className={`route-btn ${userLocation ? "visible" : ""} ${
                      routingId === place.id ? "loading" : ""
                    }`}
                    onClick={() => getRoute(place)}
                  >
                    🧭 Get Directions
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {visiblePlaces.length === 0 && (
          <div id="empty-state" className="visible">
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
      <div id="map-panel-spacer" className={mapOpen ? "active" : ""} />

      {/* MAP PANEL */}
      <div id="map-panel" className={mapOpen ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 Map</div>
            <div id="map-panel-subtitle">{selectedPlace?.name ?? ""}</div>
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