"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ============================================================
   DATA
   Converted 1:1 from the Hotspot static cards, with coordinates
   added so they can be plotted on the Mapbox map.
   ============================================================ */

interface Hotspot {
  id: string;
  name: string;
  category: string;
  tag: string;
  image: string;
  description: string;
  location: string;
  mapsQuery: string;
  lat: number;
  lng: number;
}

const hotspots: Hotspot[] = [
  {
    id: "bamboo-sanctuary",
    name: "Bamboo Sanctuary",
    category: "Nature Spot",
    tag: "Nature Spot",
    image: "/image/bamboo-sanctuary-and-ecological-park.webp",
    description:
      "A peaceful eco-tourism spot in Calinan, Davao City, known for its relaxing bamboo scenery, fresh air, and calm natural surroundings. Popular for nature walks, scenic photos, and quiet relaxation away from the busy city.",
    location:
      "Sitio Sto. Niño, Barangay Tamayong, Calinan District, Davao City",
    mapsQuery: "Bamboo+Sanctuary+Tamayong+Davao+City",
    lat: 7.1673,
    lng: 125.4483,
  },
  {
    id: "philippine-eagle-center",
    name: "Philippine Eagle Center (PEC)",
    category: "Wildlife & Conservation",
    tag: "Wildlife & Conservation",
    image: "/image/PhpEagleCenter.png",
    description:
      "A conservation and education facility in Malagos, Davao City, dedicated to protecting the critically endangered Philippine Eagle. Home to the country's national bird and other wildlife — great for families, nature lovers, and visitors.",
    location: "Purok 5, Malagos-Baguio District, Davao City",
    mapsQuery: "Philippine+Eagle+Center+Malagos+Davao+City",
    lat: 7.2242,
    lng: 125.4159,
  },
  {
    id: "malagos-garden-resort",
    name: "Malagos Garden Resort",
    category: "Eco Tourism",
    tag: "Eco Tourism",
    image: "/image/Malagos Garden Resort.jpg",
    description:
      "A 12-hectare eco-tourism destination in Malagos, Davao City, known for its lush gardens, nature attractions, and award-winning Malagos Chocolate. Offers a relaxing and educational experience promoting sustainable tourism.",
    location: "Malagos-Baguio District, Davao City",
    mapsQuery: "Malagos+Garden+Resort+Davao+City",
    lat: 7.2255,
    lng: 125.417,
  },
  {
    id: "malagos-chocolate-museum",
    name: "Malagos Chocolate Museum",
    category: "Cultural Attraction",
    tag: "Cultural Attraction",
    image: "/image/Malagos Chocolate Museum.jpg",
    description:
      "The first chocolate museum in the Philippines, inside Malagos Garden Resort in Davao City. An interactive attraction showcasing the country's growing cacao industry and the award-winning chocolates of Malagos.",
    location: "Malagos-Baguio District, Davao City",
    mapsQuery: "Malagos+Chocolate+Museum+Davao+City",
    lat: 7.2257,
    lng: 125.4173,
  },
  {
    id: "tamayong-prayer-mountain",
    name: "Tamayong Prayer Mountain",
    category: "Spiritual Retreat",
    tag: "Spiritual Retreat",
    image: "/image/Tamayong Prayer Mountain.jpg",
    description:
      "Also known as the Garden of Eden Restored, this private spiritual retreat in Tamayong, Calinan serves as a place for prayer, meditation, worship, and spiritual reflection in a serene highland setting.",
    location: "Tamayong, Calinan District, Davao City",
    mapsQuery: "Tamayong+Prayer+Mountain+Calinan+Davao+City",
    lat: 7.169,
    lng: 125.451,
  },
  {
    id: "lantaw-bukid-resort",
    name: "Lantaw Bukid Resort",
    category: "Resort / Leisure",
    tag: "Resort / Leisure",
    image: "/image/Lantaw Bukid Resort.jpg",
    description:
      "A family-friendly inland resort known for its peaceful countryside atmosphere, open green spaces, pools, cottages, and relaxing nature views. A popular budget-friendly getaway for outings, reunions, and weekend swimming.",
    location:
      "Campo Cienco Road, Barangay Los Amigos, Tugbok District, Davao City",
    mapsQuery: "Lantaw+Bukid+Resort+Davao+City",
    lat: 7.1419,
    lng: 125.4844,
  },
  {
    id: "calinan-public-market",
    name: "Calinan Public Market",
    category: "Local Market",
    tag: "Local Market",
    image: "/image/Calinan Public Market.jpg",
    description:
      "The main marketplace in Calinan where locals and farmers trade fresh produce and daily goods. Known for experiencing local life and buying fresh fruits, vegetables, durian, souvenirs, and local snacks.",
    location: "Calinan District, Davao City",
    mapsQuery: "Calinan+Public+Market+Calinan+Davao+City",
    lat: 7.1875,
    lng: 125.4562,
  },
  {
    id: "calinan-park",
    name: "Calinan Park",
    category: "Community Park",
    tag: "Community Park",
    image: "/image/Calinan Park.png",
    description:
      "A small community park in the heart of Calinan offering a quiet green space where locals can relax, socialize, or take a break. A common meeting spot for commuters, students, and families in the poblacion area.",
    location: "H Quiambao St, Calinan District, Davao City",
    mapsQuery: "Calinan+Park+Calinan+Davao+City",
    lat: 7.1878,
    lng: 125.4558,
  },
  {
    id: "calinan-commercial-center",
    name: "Calinan Commercial Center",
    category: "Commercial Hub",
    tag: "Commercial Hub",
    image: "/image/Brows1.png",
    description:
      "A local hub in Calinan where people gather for daily needs, small businesses, and community activities. Reflects the active local life in the district and serves nearby residents and visitors passing through the area.",
    location: "H Quiambao St, Calinan District, Davao City",
    mapsQuery: "Calinan+Commercial+Center+Calinan+Davao+City",
    lat: 7.1876,
    lng: 125.456,
  },
];

const filters = [
  { label: "All", value: "all" },
  { label: "Nature", value: "Nature Spot" },
  { label: "Wildlife", value: "Wildlife & Conservation" },
  { label: "Eco Tourism", value: "Eco Tourism" },
  { label: "Cultural", value: "Cultural Attraction" },
  { label: "Spiritual", value: "Spiritual Retreat" },
  { label: "Resort", value: "Resort / Leisure" },
  { label: "Market", value: "Local Market" },
  { label: "Park", value: "Community Park" },
  { label: "Commercial", value: "Commercial Hub" },
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

export default function HotspotPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortNearest, setSortNearest] = useState(false);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(
    null
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    time: string;
  } | null>(null);
  const [routingId, setRoutingId] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- toast ---------- */

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* ---------- image modal body scroll lock + esc ---------- */

  useEffect(() => {
    if (!selectedImage) {
      document.body.style.overflow = "auto";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "auto";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage]);

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

  const filteredHotspots = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = hotspots.filter((hotspot) => {
      const matchSearch =
        !query ||
        hotspot.name.toLowerCase().includes(query) ||
        hotspot.category.toLowerCase().includes(query) ||
        hotspot.tag.toLowerCase().includes(query) ||
        hotspot.description.toLowerCase().includes(query) ||
        hotspot.location.toLowerCase().includes(query);

      const matchFilter =
        activeFilter === "all" ||
        hotspot.category.toLowerCase() === activeFilter.toLowerCase() ||
        hotspot.tag.toLowerCase() === activeFilter.toLowerCase();

      return matchSearch && matchFilter;
    });

    if (sortNearest && userLocation) {
      list = [...list].sort(
        (a, b) =>
          haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
          haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
    }

    return list;
  }, [searchQuery, activeFilter, sortNearest, userLocation]);

  /* ---------- map lifecycle ---------- */

  useEffect(() => {
    if (!mapOpen || !selectedHotspot) return;

    if (!mapboxgl.accessToken) {
      showToast("Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: "hotspot-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [selectedHotspot.lng, selectedHotspot.lat],
        zoom: 15,
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    } else {
      mapRef.current.flyTo({
        center: [selectedHotspot.lng, selectedHotspot.lat],
        zoom: 15,
      });
    }

    const map = mapRef.current;

    // clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const popupHtml = `
      <div class="place-popup">
        <span class="popup-tag">${selectedHotspot.tag}</span>
        <h4>${selectedHotspot.name}</h4>
        <p>${selectedHotspot.description}</p>
        <a href="${googleMapsSearchUrl(
          selectedHotspot.mapsQuery
        )}" target="_blank" rel="noreferrer">Open in Google Maps</a>
      </div>
    `;

    const marker = new mapboxgl.Marker({ color: "#2e8b57" })
      .setLngLat([selectedHotspot.lng, selectedHotspot.lat])
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
  }, [mapOpen, selectedHotspot, userLocation]);

  useEffect(() => {
    if (!mapOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = [];
      userMarkerRef.current = null;
    }
  }, [mapOpen]);

  function showOnMap(hotspot: Hotspot) {
    setSelectedHotspot(hotspot);
    setRouteInfo(null);
    setMapOpen(true);
  }

  function closeMap() {
    setMapOpen(false);
    setSelectedHotspot(null);
    setRouteInfo(null);
  }

  /* ---------- directions / route ---------- */

  async function getRoute(hotspot: Hotspot) {
    if (!userLocation) {
      showToast("Enable location first to get directions.");
      return;
    }
    setSelectedHotspot(hotspot);
    setMapOpen(true);
    setRoutingId(hotspot.id);
    setRouteInfo(null);

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${hotspot.lng},${hotspot.lat}?overview=false`
      );
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route) {
        const km = route.distance / 1000;
        const mins = Math.round(route.duration / 60);
        setRouteInfo({
          distance: formatDistance(km),
          time:
            mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`,
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

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>

          <h1 className="logo">Hotspots</h1>
        </div>

        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search hotspots, nature, resort…"
              autoComplete="off"
              aria-label="Search hotspots"
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
      {selectedImage && (
        <div
          className="image-modal active"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="close"
            onClick={() => setSelectedImage(null)}
            aria-label="Close image"
          >
            &times;
          </button>

          <img
            src={selectedImage}
            className="modal-content"
            alt="Hotspot"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* HERO */}
      <section className="hero">
        <h2>Discover Calinan's Best Spots</h2>

        <p>
          Popular destinations and must-visit places in the Calinan area —
          from nature escapes to cultural landmarks. Enable location to see
          distances and get directions.
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

        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip ${
              activeFilter === filter.value ? "active" : ""
            }`}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
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

      {/* RESULT COUNT */}
      <div id="result-count">
        {filteredHotspots.length > 0
          ? `Showing ${filteredHotspots.length} of ${hotspots.length} hotspots`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {filteredHotspots.map((hotspot) => {
          const distance = userLocation
            ? haversineKm(
                userLocation.lat,
                userLocation.lng,
                hotspot.lat,
                hotspot.lng
              )
            : null;

          return (
            <div className="card" key={hotspot.id}>
              <div className="card-image">
                <img
                  src={hotspot.image}
                  alt={hotspot.name}
                  onClick={() => setSelectedImage(hotspot.image)}
                />
              </div>

              <div className="card-content">
                <h3>
                  <a
                    href={googleMapsSearchUrl(hotspot.mapsQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hotspot.name}
                  </a>
                </h3>

                <p>
                  {hotspot.description}
                  <br />
                  <br />
                  📍 {hotspot.location}
                </p>

                <span className="tag">{hotspot.tag}</span>

                <div className={`dist-badge ${distance !== null ? "visible" : ""}`}>
                  <div className="dot" />
                  <span>{distance !== null ? formatDistance(distance) : ""}</span>
                </div>

                <div className="card-actions">
                  <button
                    className="view-map-btn"
                    onClick={() => showOnMap(hotspot)}
                  >
                    📍 View on Map
                  </button>
                  <button
                    className={`route-btn ${userLocation ? "visible" : ""} ${
                      routingId === hotspot.id ? "loading" : ""
                    }`}
                    onClick={() => getRoute(hotspot)}
                  >
                    🧭 Get Directions
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* EMPTY STATE */}
        {filteredHotspots.length === 0 && (
          <div id="empty-state">
            <svg
              width="56"
              height="56"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#2e8b57"
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
            <div id="map-panel-subtitle">{selectedHotspot?.name ?? ""}</div>
          </div>
          <div id="map-panel-actions">
            <a
              id="map-directions-link"
              className={selectedHotspot ? "visible" : ""}
              href={
                selectedHotspot
                  ? googleMapsDirectionsUrl(
                      userLocation,
                      selectedHotspot.lat,
                      selectedHotspot.lng
                    )
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
        <div id="hotspot-map" />
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