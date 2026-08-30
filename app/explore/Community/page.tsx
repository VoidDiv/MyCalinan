"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ============================================================
   DATA
   Converted 1:1 from the Community static cards.
   ============================================================ */

type Category = "Church" | "Cemetery" | "Barangay Hall" | "District Hall";

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

const FILTERS: Array<{ label: string; value: Category | "all" }> = [
  { label: "All", value: "all" },
  { label: "Churches", value: "Church" },
  { label: "Cemeteries", value: "Cemetery" },
  { label: "Barangay Hall", value: "Barangay Hall" },
  { label: "District Hall", value: "District Hall" },
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

export default function CommunityPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");
  const [sortNearest, setSortNearest] = useState(false);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<CommunityPlace | null>(
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
        p.category.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q);
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
        container: "community-map",
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

  function showOnMap(place: CommunityPlace) {
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

  async function getRoute(place: CommunityPlace) {
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
              placeholder="Search church, barangay hall, cemetery…"
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
        <h2>Community Services in Calinan</h2>
        <p>
          Explore essential public spaces and institutions that serve the
          Calinan community. Enable location to see distances and get
          directions.
        </p>
        <div
          id="location-status"
          className={locating || userLocation || locationError ? "visible" : ""}
        >
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
      <section className="container" id="cards-container">
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
        <div id="community-map" />
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
    </>
  );
}