"use client";

import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LatLng = { lat: number; lng: number };

declare global {
  interface Window {
    L: any;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Haversine straight-line distance in km
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // Already loaded (or loading) — wait for L to exist.
      if (window.L) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CommunityPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [sortByNearest, setSortByNearest] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTitle, setPanelTitle] = useState("");
  const [panelSubtitle, setPanelSubtitle] = useState("");
  const [directionsHref, setDirectionsHref] = useState("#");
  const [routeDist, setRouteDist] = useState("–");
  const [routeTime, setRouteTime] = useState("–");
  const [modalImg, setModalImg] = useState<string | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const leafletReadyRef = useRef(false);

  /* ---------------- Data (mirrors the original card markup) -------- */

  const places = [
    {
      name: "The Most Sacred Heart of Jesus Parish",
      category: "Church",
      lat: 7.1903,
      lng: 125.4543,
      tag: "Church",
      pin: "⛪",
      image: "/image/The Most Sacred Heart of Jesus Parish.png",
      mapsQuery:
        "The+Most+Sacred+Heart+of+Jesus+Parish+Datu+Abing+St+Calinan+Davao+City+Davao+del+Sur",
      desc: "Datu Abing St., Calinan — Roman Catholic parish under the Archdiocese of Davao serving as the central place of worship for Calinan's Catholic community, offering daily Masses and full sacraments.",
    },
    {
      name: "Calinan Central Adventist Church of Davao Mission",
      category: "Church",
      lat: 7.1845,
      lng: 125.4505,
      tag: "Church",
      pin: "⛪",
      image: "/image/Calinan Central Adventist Church of Davao Mission.png",
      mapsQuery:
        "Calinan+Central+Adventist+Church+of+Davao+Mission+Mc+Arthur+Highway+Calinan+District+Davao+City+Davao+del+Sur",
      desc: "McArthur Highway, Calinan District — Seventh-day Adventist congregation under the Davao Mission, serving as a community worship center for members in the Davao Region.",
    },
    {
      name: "Iglesia Ni Cristo",
      category: "Church",
      lat: 7.1858,
      lng: 125.458,
      tag: "Church",
      pin: "⛪",
      image: "/image/Iglesia Ni Cristo1.png",
      mapsQuery:
        "Iglesia+Ni+Cristo+Purok+18+De+Lara+Street+Calinan+District+Davao+City+Davao+del+Sur",
      desc: "Purok 18, De Lara St., Calinan District — Local congregation of the international Christian organization headquartered in Quezon City, serving as a place of worship for INC members in the Calinan area.",
    },
    {
      name: "The Church of Jesus Christ of Latter-day Saints",
      category: "Church",
      lat: 7.1895,
      lng: 125.4548,
      tag: "Church",
      pin: "⛪",
      image: "/image/Iglesia Ni Cristo2.png",
      mapsQuery:
        "The+Church+of+Jesus+Christ+of+Latter-day+Saints+Lanzona+Subdivision+Calinan+Poblacion+Davao+City+Davao+del+Sur",
      desc: "Lanzona Subd., Calinan Poblacion — Local meetinghouse for the global Latter-day Saint community, offering weekly services and programs emphasizing faith in Jesus Christ and family values.",
    },
    {
      name: "International Bible Baptist Church",
      category: "Church",
      lat: 7.1883,
      lng: 125.4552,
      tag: "Church",
      pin: "⛪",
      image: "/image/International Bible Baptist Church.png",
      mapsQuery:
        "International+Bible+Baptist+Church+Guiho+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
      desc: "Guiho Street, Calinan Poblacion — Baptist congregation offering worship services, Bible preaching, prayer meetings, youth fellowship, and outreach programs for the Calinan community.",
    },
    {
      name: "Calinan Public Cemetery",
      category: "Cemetery",
      lat: 7.183,
      lng: 125.453,
      tag: "Public Cemetery",
      pin: "🪦",
      image: "/image/Calinan Public Cementery.png",
      mapsQuery:
        "Calinan+Public+Cemetery+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur",
      desc: "Calinan Poblacion — Traditional public burial ground serving families and residents of Calinan, providing accessible burial services and long part of the district's history and heritage.",
    },
    {
      name: "Calinan Private Cemetery",
      category: "Cemetery",
      lat: 7.1895,
      lng: 125.4565,
      tag: "Private Cemetery",
      pin: "🪦",
      image: "/image/Calinan Private Cementery.png",
      mapsQuery:
        "Calinan+Memorial+Park+R.+Magsaysay+Street+Calinan+District+Davao+City+Davao+del+Sur",
      desc: "R. Magsaysay Street, Calinan — Privately managed memorial park offering burial and commemorative services in a landscaped setting, part of Calinan's network of community memorial spaces.",
    },
    {
      name: "Calinan Poblacion Barangay Hall",
      category: "Barangay Hall",
      lat: 7.1873,
      lng: 125.4513,
      tag: "Barangay Hall",
      pin: "🏛️",
      image: "/image/Calinan Poblacion Barangay Hall.png",
      mapsQuery:
        "Calinan+Poblacion+Barangay+Hall+34+Aurora+Calinan+District+Davao+City+Davao+del+Sur",
      desc: "34 Aurora, Calinan Poblacion — Primary local government office providing barangay clearances, certificates of residency, dispute mediation, peace and order coordination, and assistance programs.",
    },
    {
      name: "Calinan District Hall",
      category: "District Hall",
      lat: 7.1878,
      lng: 125.4548,
      tag: "District Hall",
      pin: "🏛️",
      image: "/image/Calinan District Hall.png",
      mapsQuery:
        "Calinan+District+Hall+H.+Quiambao+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
      desc: "H. Quiambao Street, Calinan Poblacion — District-level government office managing programs, administrative concerns, infrastructure coordination, and public services for all barangays under Calinan.",
    },
  ];

  /* ---------------- Leaflet bootstrap -------------------------------- */

  useEffect(() => {
    let cancelled = false;

    loadScriptOnce("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
      .then(() => {
        if (cancelled || !window.L || !mapDivRef.current) return;
        leafletReadyRef.current = true;

        const map = window.L.map(mapDivRef.current, {
          center: [7.1873, 125.4543],
          zoom: 14,
        });
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        markerLayerRef.current = window.L.layerGroup().addTo(map);
        leafletMapRef.current = map;
      })
      .catch(() => {
        showToast("Couldn't load the map. Check your connection.");
      });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fix map sizing whenever the panel opens (Leaflet needs a visible container)
  useEffect(() => {
    if (panelOpen && leafletMapRef.current) {
      setTimeout(() => leafletMapRef.current.invalidateSize(), 150);
    }
  }, [panelOpen]);

  /* ---------------- Toast --------------------------------------------- */

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  /* ---------------- Locate me ----------------------------------------- */

  function handleLocate() {
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation isn't supported on this device.");
      showToast("Geolocation isn't supported on this device.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setLocating(false);

        const next: Record<string, number> = {};
        places.forEach((p) => {
          next[p.name] = haversineKm(loc, { lat: p.lat, lng: p.lng });
        });
        setDistances(next);
        showToast("Location found — distances updated.");
      },
      () => {
        setLocating(false);
        setLocError("Couldn't get your location. Check location permissions.");
        showToast("Couldn't get your location. Check location permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* ---------------- Map panel / directions ----------------------------- */

  function openOnMap(p: (typeof places)[number]) {
    setPanelTitle(`${p.pin} ${p.name}`);
    setPanelSubtitle(p.desc.split(" — ")[0] ?? "");
    setDirectionsHref(
      `https://www.google.com/maps/search/?api=1&query=${p.mapsQuery}`
    );
    setRouteDist("–");
    setRouteTime("–");
    setPanelOpen(true);

    if (leafletMapRef.current && markerLayerRef.current && window.L) {
      markerLayerRef.current.clearLayers();
      if (routeLayerRef.current) {
        leafletMapRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      const marker = window.L.marker([p.lat, p.lng]).bindPopup(p.name);
      markerLayerRef.current.addLayer(marker);
      leafletMapRef.current.setView([p.lat, p.lng], 16);
      marker.openPopup();
    }
  }

  async function getDirections(p: (typeof places)[number]) {
    openOnMap(p);

    if (!userLoc) {
      showToast("Enable location for road distance, or use the Google Maps link.");
      return;
    }

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLoc.lng},${userLoc.lat};${p.lng},${p.lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route) throw new Error("No route");

      setRouteDist(formatKm(route.distance / 1000));
      const mins = Math.round(route.duration / 60);
      setRouteTime(mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${mins % 60} min`);

      if (leafletMapRef.current && window.L) {
        if (routeLayerRef.current) {
          leafletMapRef.current.removeLayer(routeLayerRef.current);
        }
        const coords = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const line = window.L.polyline(coords, { color: "#2b6b45", weight: 4 });
        line.addTo(leafletMapRef.current);
        routeLayerRef.current = line;
        leafletMapRef.current.fitBounds(line.getBounds(), { padding: [30, 30] });
      }
    } catch {
      // Fall back to straight-line distance if OSRM is unreachable.
      const km = haversineKm(userLoc, { lat: p.lat, lng: p.lng });
      setRouteDist(`~${formatKm(km)} (straight-line)`);
      setRouteTime("–");
      showToast("Couldn't fetch a live route — showing straight-line distance.");
    }
  }

  function closePanel() {
    setPanelOpen(false);
  }

  /* ---------------- Filtering / sorting -------------------------------- */

  let visible = places.filter((p) => {
    const matchesFilter = activeFilter === "all" || p.category === activeFilter;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.tag.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  if (sortByNearest && userLoc) {
    visible = [...visible].sort(
      (a, b) => (distances[a.name] ?? Infinity) - (distances[b.name] ?? Infinity)
    );
  }

  const filters = ["all", "Church", "Cemetery", "Barangay Hall", "District Hall"];

  /* -------------------------------------------------------------------- */

  return (
    <>
      <link rel="icon" type="image/png" href="/image/CALINAN LOGO.png" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="/style/Community.css" />

      {/* IMAGE MODAL */}
      {modalImg && (
        <div className="image-modal" id="imageModal" onClick={() => setModalImg(null)}>
          <span className="close" onClick={() => setModalImg(null)}>
            &times;
          </span>
          <img id="modalImg" alt="Photo" src={modalImg} />
        </div>
      )}

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <a href="/HomePage.html" className="back-btn">
            ← Home
          </a>
          <h1 className="logo">Community</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Search church, barangay hall, cemetery…"
              autoComplete="off"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button id="locate-btn" title="Find my location" onClick={handleLocate} disabled={locating}>
            <div className={`spinner${locating ? " active" : ""}`}></div>
            <span className="btn-label">📍 {locating ? "Locating…" : "Locate Me"}</span>
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <h2>Community Services in Calinan</h2>
        <p>
          Explore essential public spaces and institutions that serve the Calinan community.
          Enable location to see distances and get directions.
        </p>
        <div id="location-status">
          <div className={`loc-dot${userLoc ? " active" : ""}`} id="loc-dot"></div>
          <span id="loc-text">
            {locating
              ? "Detecting your location…"
              : userLoc
              ? "Location enabled"
              : locError ?? "Location not enabled"}
          </span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-chip${activeFilter === f ? " active" : ""}`}
            data-filter={f}
            onClick={() => setActiveFilter(f)}
          >
            {f === "all" ? "All" : f === "Church" ? "Churches" : f === "Cemetery" ? "Cemeteries" : f}
          </button>
        ))}
        <button
          className="sort-btn"
          id="sort-btn"
          disabled={!userLoc}
          title={userLoc ? "Sort by nearest" : "Enable location first"}
          onClick={() => setSortByNearest((s) => !s)}
        >
          📶 {sortByNearest ? "Sorted by nearest" : "Sort by nearest"}
        </button>
      </div>
      <div id="result-count">
        {visible.length} {visible.length === 1 ? "result" : "results"}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {visible.map((p) => (
          <div
            key={p.name}
            className="card"
            data-name={p.name}
            data-category={p.category}
            data-lat={p.lat}
            data-lng={p.lng}
            data-tag={p.tag}
            data-pin={p.pin}
            data-maps-query={p.mapsQuery}
          >
            <div className="card-image">
              <img src={p.image} alt={p.name} onClick={() => setModalImg(p.image)} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.mapsQuery}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.name}
                </a>
              </h3>
              <p>{p.desc}</p>
              <span className="tag">{p.tag}</span>
              <div className="dist-badge">
                <div className="dot"></div>
                <span className="dist-text">
                  {distances[p.name] !== undefined ? formatKm(distances[p.name]) : ""}
                </span>
              </div>
              <div className="card-actions">
                <button className="view-map-btn" onClick={() => openOnMap(p)}>
                  📍 View on Map
                </button>
                <button className="route-btn" onClick={() => getDirections(p)}>
                  🧭 Get Directions
                </button>
              </div>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <div id="empty-state">
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
      <div id="map-panel-spacer" className={panelOpen ? "open" : ""}></div>

      {/* MAP PANEL */}
      <div id="map-panel" className={panelOpen ? "open" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">{panelTitle || "📍 Map"}</div>
            <div id="map-panel-subtitle">{panelSubtitle}</div>
          </div>
          <div id="map-panel-actions">
            <a id="map-directions-link" href={directionsHref} target="_blank" rel="noreferrer">
              🧭 Open in Google Maps
            </a>
            <button id="map-panel-close" title="Close map" onClick={closePanel}>
              ✕
            </button>
          </div>
        </div>
        <div id="community-map" ref={mapDivRef}></div>
        <div id="route-info">
          <span>
            🛣️ Road distance: <strong id="route-dist">{routeDist}</strong>
          </span>
          <span>
            ⏱️ Estimated time: <strong id="route-time">{routeTime}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      {toast && <div id="toast">{toast}</div>}
    </>
  );
}