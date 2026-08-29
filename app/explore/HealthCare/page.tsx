"use client";

/**
 * Healthcare directory page — converted from the original static
 * HTML/vanilla-JS page into a typed React component, using Mapbox GL JS.
 *
 * Setup:
 * - `npm install mapbox-gl` (+ `npm install -D @types/mapbox-gl`)
 * - Import "mapbox-gl/dist/mapbox-gl.css" once globally (e.g. root layout).
 * - Set NEXT_PUBLIC_MAPBOX_TOKEN in your env — used both for the map style
 *   and for the Directions API routing calls (Mapbox Directions replaces
 *   the old OSRM call).
 * - Card/toolbar/map-panel styling lives in category-directory.css — paste
 *   that into your global stylesheet. This component only relies on
 *   matching class/id names, plus a couple of small additions for the
 *   Mapbox marker elements (see bottom of the CSS notes below).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import mapboxgl from "mapbox-gl";
import Link from "next/link";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const ROUTE_SOURCE_ID = "healthcare-route";
const ROUTE_LAYER_ID = "healthcare-route-line";

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */

type Category =
  | "Hospital"
  | "Clinic"
  | "Dental"
  | "Optical"
  | "Maternity"
  | "Veterinary";

type FilterValue = "all" | Category;

interface Clinic {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  tag: string;
  mapsQuery: string;
  image: string;
  description: string;
}

interface ClinicWithDistance extends Clinic {
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

const CLINICS: Clinic[] = [
  {
    id: "isaac-robillo-memorial-hospital",
    name: "Isaac T. Robillo Memorial Hospital",
    category: "Hospital",
    lat: 7.1862,
    lng: 125.4512,
    tag: "Level 1 General Hospital",
    mapsQuery: "Isaac+T.+Robillo+Memorial+Hospital+Davao+City",
    image: "/image/Hospital1.png",
    description:
      "Km. 26 Davao–Bukidnon Highway, Calinan — A healthcare institution providing essential medical services to the local community through quality, patient-centered care.",
  },
  {
    id: "clinica-isaguirre",
    name: "Clinica Isaguirre",
    category: "Clinic",
    lat: 7.188,
    lng: 125.4558,
    tag: "Primary Care Infirmary Clinic",
    mapsQuery: "Clinica+Isaguirre+Calinan+Davao+City",
    image: "/image/Hospital2.png",
    description:
      "Villafuerte St., Calinan — Accessible healthcare including medical consultations, laboratory tests, X-ray services, and minor procedures for the local community.",
  },
  {
    id: "buhangin-medical-clinic",
    name: "Buhangin Medical Clinic & Diagnostic Center",
    category: "Clinic",
    lat: 7.189,
    lng: 125.4565,
    tag: "Medical Clinic & Diagnostic Center",
    mapsQuery: "Buhangin+Medical+Clinic+%26+Diagnostic+Center+Calinan+Davao+City",
    image: "/image/Clinic4.jpg",
    description:
      "Calinan District, Davao City — Reliable diagnostic and laboratory services, accurate testing and expert consultations to help you monitor your health with ease.",
  },
  {
    id: "calinan-adult-child-medical-clinic",
    name: "Calinan Adult and Child Medical Clinic",
    category: "Clinic",
    lat: 7.1885,
    lng: 125.4555,
    tag: "General Healthcare Clinic (Adults & Children)",
    mapsQuery: "Calinan+Adult+and+Child+Medical+Clinic+Davao+City",
    image: "/image/Clinic3.jpg",
    description:
      "Calinan Proper, Davao City — Trusted general healthcare for adults and children with consultations, basic treatments, and medical advice for families.",
  },
  {
    id: "mainstreet-pt-clinic",
    name: "A Mainstreet PT Clinic",
    category: "Clinic",
    lat: 7.1895,
    lng: 125.454,
    tag: "Physical Therapy & Rehabilitation Clinic",
    mapsQuery: "A+Mainstreet+PT+Clinic+Davao+City",
    image: "/image/Clinic2.jpg",
    description:
      "McArthur Highway, Calinan, Davao City — Expert physical therapy and rehabilitation services, helping patients recover from injuries, manage pain, and restore mobility.",
  },
  {
    id: "fernandez-medical-clinic",
    name: "Fernandez Medical Clinic",
    category: "Clinic",
    lat: 7.1878,
    lng: 125.456,
    tag: "Comprehensive Diagnostic & Consultation Clinic",
    mapsQuery: "Fernandez+Medical+Clinic+Davao+City",
    image: "/image/Clinic.jpg",
    description:
      "Villafuerte Street, Calinan — Comprehensive diagnostic and consultation services including laboratory tests, ultrasound, X-ray, and general check-ups for all ages.",
  },
  {
    id: "dentopro-dental-clinic",
    name: "DENTOpro Dental Clinic",
    category: "Dental",
    lat: 7.19,
    lng: 125.455,
    tag: "Dental Clinic",
    mapsQuery: "DENTOpro+Dental+Clinic+Calinan+Davao+City",
    image: "/image/Clinic1.png",
    description:
      "Purok 12, Calinan, Davao City — Modern dental care with cleaning, fillings, and consultations in a clean, comfortable environment you can trust.",
  },
  {
    id: "smile-corner-dental-clinic",
    name: "Smile Corner Dental Clinic",
    category: "Dental",
    lat: 7.1875,
    lng: 125.4545,
    tag: "Dental Clinic",
    mapsQuery: "Smile+Corner+Dental+Clinic+Calinan+Davao+City",
    image: "/image/Clinic8.png",
    description:
      "AJK Building, National Highway, Calinan — Orthodontic and cosmetic dental services including braces and smile enhancement treatments for confident smiles.",
  },
  {
    id: "smart-dental-clinic",
    name: "Smart Dental Clinic",
    category: "Dental",
    lat: 7.1882,
    lng: 125.4562,
    tag: "Dental Clinic",
    mapsQuery: "Smart+Dental+Clinic+Calinan+Davao+City",
    image: "/image/Clinic9.png",
    description:
      "Villafuerte Street, Calinan — Affordable and reliable dental care including tooth extraction, cleaning, and routine check-ups for everyday oral health needs.",
  },
  {
    id: "cunanan-dental-clinic",
    name: "Cunanan Dental Clinic",
    category: "Dental",
    lat: 7.187,
    lng: 125.453,
    tag: "Dental Clinic",
    mapsQuery: "Cunanan+Dental+Clinic+Durian+Village+Calinan+Davao+City",
    image: "/image/Clinic5.png",
    description:
      "Durian Village, Calinan — Trusted, long-standing dental clinic offering cleaning, fillings, and extractions with quality care for the community.",
  },
  {
    id: "pilapil-enriquez-optical-center",
    name: "Pilapil-Enriquez Optical Center",
    category: "Optical",
    lat: 7.1888,
    lng: 125.4555,
    tag: "Optical Clinic",
    mapsQuery: "Pilapil-Enriquez+Optical+Center+Calinan+Davao+City",
    image: "/image/Clinic7.png",
    description:
      "Near Calinan Post Office — Professional eye care including eye examinations and prescription eyeglasses, providing convenient vision solutions for the community.",
  },
  {
    id: "potestas-optical-clinic",
    name: "Potestas Optical Clinic",
    category: "Optical",
    lat: 7.1892,
    lng: 125.4548,
    tag: "Optical Clinic",
    mapsQuery: "Potestas+Optical+Clinic+Roman+Diaz+Street+Calinan+Davao+City",
    image: "/image/Clinic6.jpg",
    description:
      "Roman Diaz Street, Calinan — Affordable eye care including eye exams, prescription eyeglasses, and stylish frame selections for students, workers, and families.",
  },
  {
    id: "bics-eye-care-clinic",
    name: "BICS Eye Care Clinic",
    category: "Optical",
    lat: 7.1883,
    lng: 125.4552,
    tag: "Optical Clinic",
    mapsQuery: "BICS+Eye+Care+Clinic+Calinan+Davao+City",
    image: "/image/Clinic10.png",
    description:
      "Calinan District — Complete and affordable eye care including comprehensive examinations and eyeglasses fitting, with budget-friendly packages and promos.",
  },
  {
    id: "senense-lozada-optical-clinic",
    name: "Senense–Lozada Optical Clinic",
    category: "Optical",
    lat: 7.1886,
    lng: 125.4557,
    tag: "Optical Clinic",
    mapsQuery:
      "Senense-Lozada+Optical+Clinic+R.+Magsaysay+Street+Calinan+Davao+City",
    image: "/image/Clinic12.jpg",
    description:
      "R. Magsaysay Street, Calinan Poblacion — Accessible vision care including eye examinations, prescription eyeglasses, and frame selection for walk-in patients.",
  },
  {
    id: "ayuban-membrado-maternity-clinic",
    name: "Ayuban–Membrado Maternity Clinic",
    category: "Maternity",
    lat: 7.191,
    lng: 125.4535,
    tag: "Maternity Clinic",
    mapsQuery:
      "Ayuban-Membrado+Maternity+Clinic+Teachers+Village+Calinan+Davao+City",
    image: "/image/Clinic11.png",
    description:
      "Teachers Village, Purok 25A, Calinan — Trusted and affordable maternal care including prenatal check-ups, ultrasound, family planning, and delivery support.",
  },
  {
    id: "well-family-midwife-clinic",
    name: "Well Family Midwife Clinic",
    category: "Maternity",
    lat: 7.1897,
    lng: 125.4542,
    tag: "Maternity Clinic",
    mapsQuery:
      "Well+Family+Midwife+Clinic+McArthur+Highway+Calinan+Poblacion+Davao+City",
    image: "/image/Clinic13.png",
    description:
      "McArthur Highway, Calinan Poblacion — DOH-licensed and PhilHealth-accredited maternity clinic offering prenatal check-ups, normal delivery, postnatal care, and family planning.",
  },
  {
    id: "jambo-maternity-clinic",
    name: "Jambo Maternity Clinic",
    category: "Maternity",
    lat: 7.1905,
    lng: 125.4538,
    tag: "Maternity Clinic",
    mapsQuery: "Jambo+Maternity+Clinic+Datu+Abing+Street+Calinan+Davao+City",
    image: "/image/Clinic14.jpg",
    description:
      "Purok 26, Datu Abing Street, Calinan — Safe and affordable maternal care offering prenatal consultations, normal delivery assistance, and postnatal care.",
  },
  {
    id: "mother-and-child-clinic",
    name: "Mother and Child Clinic",
    category: "Maternity",
    lat: 7.1887,
    lng: 125.4556,
    tag: "Maternity Clinic",
    mapsQuery:
      "Mother+and+Child+Clinic+R.+Magsaysay+Street+Calinan+Davao+City",
    image: "/image/Clinic15.png",
    description:
      "R. Magsaysay Street, Calinan Poblacion — Accessible healthcare for women, mothers, and children including prenatal check-ups, maternal consultations, and pediatric care.",
  },
  {
    id: "calinan-veterinary-clinic",
    name: "Calinan Veterinary Clinic",
    category: "Veterinary",
    lat: 7.1865,
    lng: 125.4515,
    tag: "Veterinary Clinic",
    mapsQuery:
      "Calinan+Veterinary+Clinic+Davao-Bukidnon+Highway+Calinan+Davao+City",
    image: "/image/Vet1.png",
    description:
      "Davao–Bukidnon Highway, Calinan — Trusted veterinary care including pet consultations, vaccinations, illness treatment, and minor procedures for routine animal healthcare.",
  },
  {
    id: "furry-paws-veterinary-clinic",
    name: "Furry Paws Veterinary Clinic and Pet Supplies",
    category: "Veterinary",
    lat: 7.1893,
    lng: 125.456,
    tag: "Veterinary Clinic",
    mapsQuery:
      "Furry+Paws+Veterinary+Clinic+and+Pet+Supplies+Peñano+Street+Calinan+Davao+City",
    image: "/image/Vet2.jpg",
    description:
      "Peñano Street, Calinan Poblacion — One-stop pet care with consultations, vaccinations, grooming, and quality pet supplies for all your animal care needs.",
  },
];

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Hospital", value: "Hospital" },
  { label: "Clinic", value: "Clinic" },
  { label: "Dental", value: "Dental" },
  { label: "Optical", value: "Optical" },
  { label: "Maternity", value: "Maternity" },
  { label: "Veterinary", value: "Veterinary" },
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

export default function HealthcarePage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [sortByNearest, setSortByNearest] = useState(false);

  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const clinicMarkerRef = useRef<mapboxgl.Marker | null>(null);

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
  const clinicsWithDistance: ClinicWithDistance[] = useMemo(() => {
    return CLINICS.map((clinic) => ({
      ...clinic,
      distKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, clinic.lat, clinic.lng)
        : null,
    }));
  }, [userLocation]);

  const visibleClinics = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let list = clinicsWithDistance.filter((clinic) => {
      const matchesSearch =
        !query ||
        clinic.name.toLowerCase().includes(query) ||
        clinic.category.toLowerCase().includes(query) ||
        clinic.tag.toLowerCase().includes(query);
      const matchesFilter =
        activeFilter === "all" || clinic.category === activeFilter;
      return matchesSearch && matchesFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort(
        (a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity)
      );
    }

    return list;
  }, [clinicsWithDistance, searchQuery, activeFilter, sortByNearest, userLocation]);

  /* ── MAP: init once the panel is opened ── */
  useEffect(() => {
    if (!mapPanelOpen || mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.4558, 7.1885],
      zoom: 15,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapLoadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2b6b45", "line-width": 5, "line-opacity": 0.85 },
      });
      setTimeout(() => map.resize(), 50);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      userMarkerRef.current = null;
      clinicMarkerRef.current = null;
    };
  }, [mapPanelOpen]);

  /* ── MAP: keep the user marker in sync ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement("div");
    el.className = "user-dot-wrapper";
    el.innerHTML = `<div class="user-dot-ring"></div><div class="user-dot-inner"></div>`;

    const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(
      '<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>'
    );

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(popup)
      .addTo(map);
  }, [userLocation, mapPanelOpen]);

  /* ── MAP: place/refresh the clinic marker and fly to it ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedClinic) return;

    if (clinicMarkerRef.current) clinicMarkerRef.current.remove();

    const el = document.createElement("div");
    el.innerHTML = `<div style="background:#2b6b45;color:white;font-size:16px;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg)">🏥</span></div>`;

    const distText = userLocation
      ? `<br><strong>${formatDist(
          haversineKm(userLocation.lat, userLocation.lng, selectedClinic.lat, selectedClinic.lng)
        )}</strong> straight-line from you`
      : "";

    const popup = new mapboxgl.Popup({ offset: 40, maxWidth: "250px" }).setHTML(
      `<div class="health-popup">
         <h4>${selectedClinic.name}</h4>
         <div class="popup-tag">${selectedClinic.tag}</div>
         <p>${distText}</p>
         <a href="https://www.google.com/maps/search/?api=1&query=${selectedClinic.mapsQuery}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
       </div>`
    );

    clinicMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([selectedClinic.lng, selectedClinic.lat])
      .setPopup(popup)
      .addTo(map)
      .togglePopup();

    map.flyTo({ center: [selectedClinic.lng, selectedClinic.lat], zoom: 17, duration: 1000 });
    setTimeout(() => map.resize(), 320);
  }, [selectedClinic, userLocation, mapPanelOpen]);

  /* ── ACTIONS ── */
  const showOnMap = useCallback((clinic: Clinic) => {
    setSelectedClinic(clinic);
    setRouteInfo(null);
    setMapPanelOpen(true);
  }, []);

  const clearRouteLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
  }, []);

  const closeMap = useCallback(() => {
    setMapPanelOpen(false);
    setSelectedClinic(null);
    setRouteInfo(null);
  }, []);

  const getRoute = useCallback(
    async (clinic: Clinic) => {
      if (!userLocation) {
        showToast("📍 Enable location first to get directions.");
        return;
      }
      if (!MAPBOX_TOKEN) {
        showToast("⚠️ Missing Mapbox access token.");
        return;
      }

      showOnMap(clinic);
      setRouting(true);

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${clinic.lng},${clinic.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) throw new Error("No route found");

        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const minutes = Math.round(route.duration / 60);

        const map = mapRef.current;
        if (map) {
          const applyRoute = () => {
            const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
            source?.setData({
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            });
            const coords: [number, number][] = route.geometry.coordinates;
            const bounds = coords.reduce(
              (b, c) => b.extend(c as [number, number]),
              new mapboxgl.LngLatBounds(coords[0], coords[0])
            );
            map.fitBounds(bounds, { padding: 40 });
          };
          if (mapLoadedRef.current) applyRoute();
          else map.once("load", applyRoute);
        }

        setRouteInfo({ distanceKm: Math.round(distanceKm * 10) / 10, minutes });
        showToast(
          `🧭 Route to ${clinic.name}: ${distanceKm.toFixed(1)} km · ${formatDuration(minutes)}`
        );
      } catch {
        showToast("⚠️ Could not load route. Check your internet connection.");
      } finally {
        setRouting(false);
      }
    },
    [userLocation, showOnMap, showToast]
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleSortByNearest = () => {
    if (!userLocation) return;
    setSortByNearest((prev) => !prev);
  };

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
  <Link href="/" className="back-btn">
     ← Home
  </Link>
          <h1 className="logo">Healthcare</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Search hospitals, clinics, dental…"
              autoComplete="off"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <button
            id="locate-btn"
            title="Find my location"
            className={locating ? "loading" : ""}
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
        id="imageModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          &times;
        </span>
        {modalImage && <img id="modalImg" alt="Clinic photo" src={modalImage} />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Healthcare You Can Trust in Calinan</h2>
        <p>
          Find hospitals, clinics, and specialists near you. Enable location to
          see distances and get directions.
        </p>
        <div id="location-status" className={userLocation || locating || locationError ? "visible" : ""}>
          <div className={`loc-dot${locationError ? " loc-err" : ""}`} id="loc-dot" />
          <span id="loc-text">
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
            className={`filter-chip${activeFilter === f.value ? " active" : ""}`}
            data-filter={f.value}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <button
          className={`sort-btn${sortByNearest ? " active" : ""}`}
          id="sort-btn"
          disabled={!userLocation}
          title={!userLocation ? "Enable location first" : undefined}
          onClick={toggleSortByNearest}
        >
          {sortByNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </div>
      <div id="result-count">
        {visibleClinics.length > 0
          ? `Showing ${visibleClinics.length} of ${CLINICS.length} facilities`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {visibleClinics.map((clinic) => (
          <div
            key={clinic.id}
            className="card"
            data-name={clinic.name}
            data-category={clinic.category}
            data-lat={clinic.lat}
            data-lng={clinic.lng}
            data-tag={clinic.tag}
            data-maps-query={clinic.mapsQuery}
          >
            <div className="card-image" onClick={() => setModalImage(clinic.image)}>
              <img src={clinic.image} alt={clinic.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${clinic.mapsQuery}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {clinic.name}
                </a>
              </h3>
              <p>{clinic.description}</p>
              <span className="tag">{clinic.tag}</span>
              <div className={`dist-badge${clinic.distKm !== null ? " visible" : ""}`}>
                <div className="dot" />
                <span className="dist-text">
                  {clinic.distKm !== null ? formatDist(clinic.distKm) : ""}
                </span>
              </div>
              <div className="card-actions">
                <button className="view-map-btn" onClick={() => showOnMap(clinic)}>
                  📍 View on Map
                </button>
                <button
                  className={`route-btn${userLocation ? " visible" : ""}${
                    routing && selectedClinic?.id === clinic.id ? " loading" : ""
                  }`}
                  onClick={() => getRoute(clinic)}
                >
                  {routing && selectedClinic?.id === clinic.id
                    ? "⏳ Loading route…"
                    : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {visibleClinics.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
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
      <div id="map-panel-spacer" className={mapPanelOpen ? "active" : ""} />

      {/* MAP PANEL */}
      <div id="map-panel" className={mapPanelOpen ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {selectedClinic ? selectedClinic.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedClinic?.tag ?? ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedClinic && (
              <a
                id="map-directions-link"
                className="visible"
                href={`https://www.google.com/maps/search/?api=1&query=${selectedClinic.mapsQuery}`}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button id="map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>
        <div id="health-map" ref={mapContainerRef} />
        <div id="route-info" className={routeInfo ? "visible" : ""}>
          <span>
            🛣️ Road distance: <strong id="route-dist">{routeInfo ? `${routeInfo.distanceKm} km` : "–"}</strong>
          </span>
          <span>
            ⏱️ Estimated time:{" "}
            <strong id="route-time">
              {routeInfo ? formatDuration(routeInfo.minutes) : "–"}
            </strong>
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