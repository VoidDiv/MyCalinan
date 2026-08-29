"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

type Tag = "Elementary" | "High School" | "College" | "Public" | "Private";
type FilterValue = "all" | Tag;

interface School {
  id: string;
  name: string;
  tags: Tag[];
  lat: number;
  lng: number;
  displayTag: string; // human-readable label shown on the card, e.g. "Public Elementary School"
  mapsQuery: string;
  image: string;
  description: string;
}

interface SchoolWithDistance extends School {
  distKm: number | null;
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface RouteInfo {
  distanceKm: number;
  minutes: number;
}

/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */

const SCHOOLS: School[] = [
  {
    id: "calinan-central-elementary",
    name: "Calinan Central Elementary School",
    tags: ["Elementary", "Public"],
    lat: 7.1895,
    lng: 125.4565,
    displayTag: "Public Elementary School",
    mapsQuery: "Calinan+Central+Elementary+School+Davao+City",
    image: "/image/Calinan Central Elementary School.png",
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
    image: "/image/Lt. C. Villafuerte Sr. Elementary School.png",
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
    image: "/image/Calinan National High School.jpg",
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
    image: "/image/Amigo School of Calinan.png",
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
    image: "/image/St. Francis College of Davao Calinan.jpg",
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
    image: "/image/Philippine Nikkei Jin Kai School of Calinan.jpg",
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
    image: "/image/Philippine College of Technology Calinan Branch.jpg",
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
    image: "/image/Holy Cross College of Calinan, Inc..png",
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

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */

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

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

function formatDuration(mins: number): string {
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access denied. Please allow it in your browser settings.",
  2: "Location unavailable. Check your GPS or network.",
  3: "Location request timed out. Try again.",
};

/* ══════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════ */

export default function EducationPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // FIX: Leaflet is loaded asynchronously (dynamic import) whenever the map
  // panel opens. The marker-placing effects below used to depend only on
  // `mapPanelOpen`/`selectedSchool`/`userLocation`, so if any of those
  // changed *before* the import finished resolving, the effect would run
  // once, find `mapRef.current` still null, and silently do nothing —
  // and nothing would ever re-trigger it. In practice this meant the first
  // "View on Map" / "Get Directions" click after a fresh page load often
  // showed an empty map with no pin. `mapReady` flips to true once the
  // Leaflet map instance actually exists, and is added as a dependency
  // below so those effects correctly re-run as soon as the map is ready.
  const [mapReady, setMapReady] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof L | null>(null); // holds the dynamically-loaded module
  const userMarkerRef = useRef<L.Marker | null>(null);
  const schoolMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);

  /* ── TOAST ── */
  const showToast = useCallback((message: string, duration = 3000) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /* ── GEOLOCATION ── */
  const startLocating = useCallback(() => {
    if (!("geolocation" in navigator)) {
      showToast("⚠️ Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        const message =
          GEOLOCATION_ERROR_MESSAGES[err.code] ?? "Could not get location.";
        setLocationError(message);
        showToast(`⚠️ ${message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [showToast]);

  /* ── DERIVED DATA ── */
  const schoolsWithDistance: SchoolWithDistance[] = useMemo(() => {
    return SCHOOLS.map((school) => ({
      ...school,
      distKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, school.lat, school.lng)
        : null,
    }));
  }, [userLocation]);

  const visibleSchools = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = schoolsWithDistance.filter((school) => {
      const matchesSearch =
        !query ||
        school.name.toLowerCase().includes(query) ||
        school.displayTag.toLowerCase().includes(query) ||
        school.tags.some((t) => t.toLowerCase().includes(query));
      const matchesFilter =
        activeFilter === "all" || school.tags.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort(
        (a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity)
      );
    }

    return list;
  }, [schoolsWithDistance, searchQuery, activeFilter, sortByNearest, userLocation]);

  /* ── MAP: init once the panel is opened ──
     Leaflet is loaded with a dynamic import() so its code never
     runs during Next.js's server-side render pass (Leaflet reads
     `window`/`document` as soon as it's imported, which crashes on
     the server if imported at the top of the file). */
  useEffect(() => {
    if (!mapPanelOpen || mapRef.current || !mapContainerRef.current) return;

    let cancelled = false;

    import("leaflet").then((leafletModule) => {
      if (cancelled || !mapContainerRef.current) return;
      const L = leafletModule.default;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: [7.1885, 125.4558],
        zoom: 15,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);

      // FIX: signal that the map instance now exists, so the marker
      // effects (which depend on mapReady) re-run and actually draw
      // the user/school pins instead of silently no-oping.
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      userMarkerRef.current = null;
      schoolMarkerRef.current = null;
      routeLayerRef.current = null;
      // FIX: reset readiness whenever the map is torn down (panel closed
      // or component unmounted) so a future reopen goes through the
      // "not ready yet" -> "ready" transition again correctly.
      setMapReady(false);
    };
  }, [mapPanelOpen]);

  /* ── MAP: keep the user marker in sync ── */
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    // Custom divIcon instead of Leaflet's default marker image — the
    // default icon's image files don't resolve correctly through
    // most bundlers, so a self-contained HTML/CSS dot avoids that
    // entirely and matches the design used elsewhere on the site.
    // These are now plain class names (no styles[...] lookup) since
    // education.module.css was merged into globals.css — the actual
    // CSS rules live under ".education-page .user-dot-wrapper" etc.
    const icon = L.divIcon({
      className: "user-dot-wrapper",
      html: `<div class="user-dot-ring"></div><div class="user-dot-inner"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon,
    })
      .addTo(map)
      .bindPopup(
        `<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>`
      );
    // FIX: added mapReady so this re-runs once the async Leaflet map
    // instance is actually mounted (see note on mapReady above).
  }, [userLocation, mapPanelOpen, mapReady]);

  /* ── MAP: place/refresh the school marker and fly to it ── */
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !selectedSchool) return;

    if (schoolMarkerRef.current) schoolMarkerRef.current.remove();

    const icon = L.divIcon({
      className: "", // no wrapper styling needed, the inline style below handles it
      html: `<div style="background:#2b6b45;color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">🎓</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const distText = userLocation
      ? `<br><strong>${formatDist(
          haversineKm(userLocation.lat, userLocation.lng, selectedSchool.lat, selectedSchool.lng)
        )}</strong> straight-line from you`
      : "";

    schoolMarkerRef.current = L.marker([selectedSchool.lat, selectedSchool.lng], {
      icon,
    })
      .addTo(map)
      .bindPopup(
        `<div class="edu-popup">
           <h4>${selectedSchool.name}</h4>
           <div class="popup-tag">${selectedSchool.displayTag}</div>
           <p>${distText}</p>
           <a href="https://www.google.com/maps/search/?api=1&query=${selectedSchool.mapsQuery}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
         </div>`
      )
      .openPopup();

    map.flyTo([selectedSchool.lat, selectedSchool.lng], 17, { duration: 1 });
    setTimeout(() => map.invalidateSize(), 320);
    // FIX: added mapReady so this re-runs once the async Leaflet map
    // instance is actually mounted (see note on mapReady above).
  }, [selectedSchool, userLocation, mapPanelOpen, mapReady]);

  /* ── ACTIONS ── */
  const showOnMap = useCallback((school: School) => {
    setSelectedSchool(school);
    setRouteInfo(null);
    setMapPanelOpen(true);
  }, []);

  const closeMap = useCallback(() => {
    setMapPanelOpen(false);
    setSelectedSchool(null);
    setRouteInfo(null);
    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
  }, []);

  const getRoute = useCallback(
    async (school: School) => {
      if (!userLocation) {
        showToast("📍 Enable location first to get directions.");
        return;
      }

      showOnMap(school);
      setRouting(true);

      try {
        // Free public OSRM demo router — no API key required.
        // Coordinates go lng,lat (not lat,lng) per OSRM's convention.
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${school.lng},${school.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) throw new Error("No route found");

        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const minutes = Math.round(route.duration / 60);

        // FIX: the map may still be mid-initialization (dynamic import
        // not yet resolved) when this fires, especially on a fast
        // network / slow OSRM response. Previously this block was
        // silently skipped with no retry, leaving the route info text
        // updated but no polyline actually drawn on the map. Now we
        // poll briefly for the map to become ready before giving up.
        const L = await waitForMap();
        const map = mapRef.current;
        if (L && map) {
          routeLayerRef.current?.remove();
          routeLayerRef.current = L.geoJSON(route.geometry, {
            style: { color: "#2b6b45", weight: 5, opacity: 0.85 },
          }).addTo(map);
          map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
        }

        setRouteInfo({ distanceKm: Math.round(distanceKm * 10) / 10, minutes });
        showToast(
          `🧭 Route to ${school.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`
        );
      } catch {
        showToast("⚠️ Could not load route. Check your internet connection.");
      } finally {
        setRouting(false);
      }
    },
    [userLocation, showOnMap, showToast]
  );

  // FIX: small helper used by getRoute — waits (up to ~2s) for the
  // Leaflet map instance to exist before returning, instead of
  // assuming it's already there.
  const waitForMap = useCallback((): Promise<typeof L | null> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (leafletRef.current && mapRef.current) {
          resolve(leafletRef.current);
        } else if (Date.now() - start > 2000) {
          resolve(null);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleSortByNearest = () => {
    if (!userLocation) return;
    setSortByNearest((prev) => !prev);
  };

  /* ══════════════════════════════════════════
     RENDER
     Everything is wrapped in <div className="education-page">
     instead of a bare <> fragment — that's the hook the scoped
     CSS in globals.css (".education-page .header", ".education-page
     .card", etc.) needs in order to only apply inside this page.
  ══════════════════════════════════════════ */

  return (
    <div className="education-page">
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
              placeholder="Search schools, colleges, level…"
              autoComplete="off"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <button
            title="Find my location"
            className={`locate-btn ${locating ? "loading" : ""}`}
            disabled={locating}
            onClick={startLocating}
          >
            <div className="spinner" />
            <span className="btn-label">
              {userLocation ? "📍 Tracking" : "📍 Locate Me"}
            </span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal${modalImage ? " active" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          &times;
        </span>
        {modalImage && <img alt="School photo" src={modalImage} />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Shaping Futures Through Education in Calinan</h2>
        <p>
          Find schools, colleges, and institutions near you. Enable location
          to see distances and get directions.
        </p>
        <div
          className={`location-status${
            userLocation || locating || locationError ? " visible" : ""
          }`}
        >
          <div className={`loc-dot${locationError ? " loc-err" : ""}`} />
          <span>
            {locationError
              ? locationError
              : userLocation
              ? `Location active · ±${Math.round(userLocation.accuracy)} m accuracy`
              : "Detecting your location…"}
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
          className={`sort-btn ${sortByNearest ? "active" : ""}`}
          disabled={!userLocation}
          title={!userLocation ? "Enable location first" : undefined}
          onClick={toggleSortByNearest}
        >
          {sortByNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </div>
      <div className="result-count">
        {visibleSchools.length > 0
          ? `Showing ${visibleSchools.length} of ${SCHOOLS.length} institutions`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container">
        {visibleSchools.map((school) => (
          <div key={school.id} className="card">
            <div className="card-image" onClick={() => setModalImage(school.image)}>
              <img src={school.image} alt={school.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${school.mapsQuery}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {school.name}
                </a>
              </h3>
              <p>{school.description}</p>
              <span className="tag">{school.displayTag}</span>
              <div className={`dist-badge${school.distKm !== null ? " visible" : ""}`}>
                <div className="dot" />
                <span>{school.distKm !== null ? formatDist(school.distKm) : ""}</span>
              </div>
              <div className="card-actions">
                <button className="view-map-btn" onClick={() => showOnMap(school)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn${userLocation ? " visible" : ""}${
                    routing && selectedSchool?.id === school.id ? " loading" : ""
                  }`}
                  onClick={() => getRoute(school)}
                >
                  {routing && selectedSchool?.id === school.id
                    ? "⏳ Loading route…"
                    : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {visibleSchools.length === 0 && (
          <div className="empty-state" style={{ display: "flex" }}>
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

      {/* SPACER — keeps the page from jumping when the fixed panel opens */}
      <div className={`map-panel-spacer${mapPanelOpen ? " active" : ""}`} />

      {/* MAP PANEL */}
      <div className={`map-panel${mapPanelOpen ? " active" : ""}`}>
        <div className="map-panel-header">
          <div>
            <div className="map-panel-title">
              📍 {selectedSchool ? selectedSchool.name : "Map"}
            </div>
            <div className="map-panel-subtitle">{selectedSchool?.displayTag ?? ""}</div>
          </div>
          <div className="map-panel-actions">
            {selectedSchool && (
              <a
                className="map-directions-link visible"
                href={`https://www.google.com/maps/search/?api=1&query=${selectedSchool.mapsQuery}`}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button className="map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>
        <div className="edu-map" ref={mapContainerRef} />
        <div className={`route-info${routeInfo ? " visible" : ""}`}>
          <span>
            🛣️ Road distance: <strong>{routeInfo ? `${routeInfo.distanceKm} km` : "–"}</strong>
          </span>
          <span>
            ⏱️ Estimated time: <strong>{routeInfo ? formatDuration(routeInfo.minutes) : "–"}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}