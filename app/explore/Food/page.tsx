"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, LineString } from "geojson";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import Link from "next/link";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */

type Category =
  | "Restaurant"
  | "Eatery"
  | "Fast-Food"
  | "Cafe"
  | "Bakeshop"
  | "Bar";

interface FoodPlace {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  description: string;
  mapsQuery: string;
  image?: string;
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

/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */

const STORAGE_BASE =
  "https://storage.googleapis.com/mycalinan.firebasestorage.app/FoodAndDining";

const foodPlaces: FoodPlace[] = [
  {
    id: "penongs-calinan",
    name: "Penong's Calinan",
    category: "Restaurant",
    lat: 7.1882,
    lng: 125.4542,
    tag: "Restaurant",
    pin: "🍗",
    description:
      "Calinan District — Founded in 2003, Penong's is known for its Chicken Inato and grilled chicken meals.",
    mapsQuery: "Penong's Calinan District Davao City",
    image: `${STORAGE_BASE}/Penong_s%20Calinan.jpg`,
  },
  {
    id: "tapok-grill",
    name: "TAPOK Grill and Seafood Restaurant",
    category: "Eatery",
    lat: 7.193,
    lng: 125.451,
    tag: "Eatery",
    pin: "🦐",
    description:
      "Bukidnon Highway, Acacia — Casual dining spot known for grilled seafood and a lively atmosphere.",
    mapsQuery: "Tapok Grill and Seafood Restaurant Acacia Calinan Davao City",
    image: `${STORAGE_BASE}/TAPOK%20Grill%20and%20Seafood%20Restaurant.jpg`,
  },
  {
    id: "station-grill",
    name: "Station Grill",
    category: "Restaurant",
    lat: 7.1875,
    lng: 125.453,
    tag: "Restaurant",
    pin: "🍖",
    description:
      "National Highway, Calinan District — Casual Filipino restaurant offering grilled specialties and comfort food.",
    mapsQuery: "Station Grill National Highway Calinan Davao City",
    image: `${STORAGE_BASE}/Station%20Grill.png`,
  },
  {
    id: "dowens-food-drinks",
    name: "Dowens Food & Drinks",
    category: "Eatery",
    lat: 7.1878,
    lng: 125.4545,
    tag: "Eatery",
    pin: "🍽️",
    description: "Calinan District — Small local eatery serving affordable meals and refreshments.",
    mapsQuery: "Dowens Food & Drinks Calinan District Davao City",
    image: `${STORAGE_BASE}/DOWENS%20FOOD%20%26%20DRINKS.png`,
  },
  {
    id: "kabawan-sa-calinan",
    name: "Kabawan Sa Calinan",
    category: "Eatery",
    lat: 7.1885,
    lng: 125.4522,
    tag: "Eatery",
    pin: "🍲",
    description: "Davao–Bukidnon Highway, Calinan Poblacion — Well-known eatery serving hearty local dishes.",
    mapsQuery: "Kabawan Sa Calinan Davao-Bukidnon Highway Calinan Davao City",
    image: `${STORAGE_BASE}/Kabawan%20Sa%20Calinan.png`,
  },
  {
    id: "lahers-lechon-haus",
    name: "Laher's Lechon Haus",
    category: "Eatery",
    lat: 7.188,
    lng: 125.4538,
    tag: "Eatery",
    pin: "🐷",
    description: "Villafuerte Street, Calinan Poblacion — Local lechon eatery known for roasted pork.",
    mapsQuery: "Laher's Lechon Haus Villafuerte Street Calinan Davao City",
    image: `${STORAGE_BASE}/Laher_s%20Lechon%20Haus.jpg`,
  },
  {
    id: "kwekens-carenderia",
    name: "Kwekens Carenderia",
    category: "Eatery",
    lat: 7.19,
    lng: 125.4543,
    tag: "Eatery",
    pin: "🍱",
    description: "Datu Abing Street, Calinan Poblacion — Small carinderia serving affordable lutong-bahay meals.",
    mapsQuery: "Kwekens Carenderia Datu Abing Street Calinan Davao City",
    image: `${STORAGE_BASE}/Kwekens%20Carenderia.png`,
  },
  {
    id: "onens-chicken-house",
    name: "Onen's Chicken House",
    category: "Eatery",
    lat: 7.1902,
    lng: 125.4544,
    tag: "Eatery",
    pin: "🍗",
    description: "Datu Abing Street, Calinan Poblacion — Fried chicken spot offering affordable meals.",
    mapsQuery: "Onen's Chicken House Datu Abing Street Calinan Davao City",
    image: `${STORAGE_BASE}/Onen%E2%80%99s%20Chicken%20House.png`,
  },
  {
    id: "kunam-chicken-house",
    name: "Kunam Chicken House",
    category: "Eatery",
    lat: 7.1877,
    lng: 125.454,
    tag: "Eatery",
    pin: "🍗",
    description: "Calinan Poblacion — Local fried chicken eatery offering affordable chicken meals.",
    mapsQuery: "Kunam Chicken House Calinan Poblacion Davao City",
    image: `${STORAGE_BASE}/Kunam%20Chicken%20House.png`,
  },
  {
    id: "nam-manok-1",
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1903,
    lng: 125.4543,
    tag: "Eatery",
    pin: "🍗",
    description: "Datu Abing St, Calinan District — Local chicken house offering fried chicken and chicken meals.",
    mapsQuery: "Nam Manok Chicken House Datu Abing St Calinan Davao City",
    image: `${STORAGE_BASE}/Nam%E2%80%A6Manok%20Chicken%20House%20Branch%201.png`,
  },
  {
    id: "nam-manok-2",
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1868,
    lng: 125.4535,
    tag: "Eatery",
    pin: "🍗",
    description: "Purok 32 Roman Diaz St, Calinan District — Local chicken house offering chicken meals.",
    mapsQuery: "Nam Manok Chicken House Purok 32 Roman Diaz St Calinan Davao City",
    image: `${STORAGE_BASE}/Nam%E2%80%A6Manok%20Chicken%20Branch%202.png`,
  },
  {
    id: "nam-manok-3",
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1872,
    lng: 125.4548,
    tag: "Eatery",
    pin: "🍗",
    description: "Canete Building, Calinan District — Local chicken house offering chicken meals.",
    mapsQuery: "Nam Manok Chicken House Canete Building Calinan Davao City",
    image: `${STORAGE_BASE}/Nam%E2%80%A6Manok%20Chicken%20House%20Branch%203.png`,
  },
  {
    id: "minute-burger-1",
    name: "Minute Burger",
    category: "Fast-Food",
    lat: 7.1904,
    lng: 125.4542,
    tag: "Fast-Food",
    pin: "🍔",
    description: "Datu Abing St, Calinan District — Affordable burger meals and Buy 1, Take 1 offerings.",
    mapsQuery: "Minute Burger Datu Abing St Calinan Davao City",
    image: `${STORAGE_BASE}/Minute%20Burger1.png`,
  },
  {
    id: "minute-burger-2",
    name: "Minute Burger",
    category: "Fast-Food",
    lat: 7.1873,
    lng: 125.4514,
    tag: "Fast-Food",
    pin: "🍔",
    description: "Aurora St, Calinan District — Affordable burger meals and Buy 1, Take 1 offerings.",
    mapsQuery: "Minute Burger Aurora St Calinan Davao City",
    image: `${STORAGE_BASE}/Minute%20Burger2.png`,
  },
  {
    id: "jollibee",
    name: "Jollibee",
    category: "Fast-Food",
    lat: 7.1872,
    lng: 125.4549,
    tag: "Fast-Food",
    pin: "🍟",
    description: "Canete Building, Calinan District — Fast-food branch serving popular Filipino fast-food meals.",
    mapsQuery: "Jollibee Canete Building Calinan Davao City",
    image: `${STORAGE_BASE}/Jollibee.png`,
  },
  {
    id: "kopikuys",
    name: "Kopikuys",
    category: "Cafe",
    lat: 7.1876,
    lng: 125.4536,
    tag: "Café",
    pin: "☕",
    description: "Calinan District — Local café offering coffee, drinks, and light meals.",
    mapsQuery: "Kopikuys Calinan Davao City",
    image: `${STORAGE_BASE}/Kopikuys.jpg`,
  },
  {
    id: "hikaru-de-cielo-cafe",
    name: "Hikaru de Cielo Cafe",
    category: "Cafe",
    lat: 7.195,
    lng: 125.45,
    tag: "Café",
    pin: "☕",
    description: "Purok 21, San Roque, Davao–Bukidnon Hwy — Cozy café-restaurant with a scenic atmosphere.",
    mapsQuery: "Hikaru de Cielo Cafe Calinan Davao City",
    image: `${STORAGE_BASE}/Hikaru%20de%20Cielo%20Cafe.jpg`,
  },
  {
    id: "kapekol-calinan",
    name: "Kapekol Calinan",
    category: "Cafe",
    lat: 7.1878,
    lng: 125.4541,
    tag: "Café",
    pin: "☕",
    description: "Calinan Poblacion — Small budget-friendly coffee stall.",
    mapsQuery: "Kapekol Calinan Poblacion Davao City",
    image: `${STORAGE_BASE}/Kapekol.png`,
  },
  {
    id: "teatuh-cafe",
    name: "TeaTuh Cafe",
    category: "Cafe",
    lat: 7.188,
    lng: 125.4537,
    tag: "Café",
    pin: "🧋",
    description: "Villafuerte Street, Calinan Poblacion — Coffee and milk tea shop.",
    mapsQuery: "TeaTuh Cafe Villafuerte Street Calinan Poblacion Davao City",
    image: `${STORAGE_BASE}/TeaTuh%20Cafe.png`,
  },
  {
    id: "machatuals",
    name: "Machatuals",
    category: "Cafe",
    lat: 7.1893,
    lng: 125.4562,
    tag: "Café",
    pin: "🍵",
    description: "R. Magsaysay St, Calinan — Milk tea and matcha drink shop.",
    mapsQuery: "Machatuals Calinan Poblacion Davao City",
    image: `${STORAGE_BASE}/Machatuals.jpg`,
  },
  {
    id: "rose-bakeshop-1",
    name: "Rose Bakeshop",
    category: "Bakeshop",
    lat: 7.1884,
    lng: 125.4521,
    tag: "Bakeshop",
    pin: "🍞",
    description: "Davao–Bukidnon Hwy, Calinan — Bakery offering breads and pastries.",
    mapsQuery: "Rose Bakeshop Davao-Bukidnon Hwy Calinan Davao City",
    image: `${STORAGE_BASE}/Rose%20Bakeshop1.png`,
  },
  {
    id: "rose-bakeshop-2",
    name: "Rose Bakeshop",
    category: "Bakeshop",
    lat: 7.1857,
    lng: 125.4578,
    tag: "Bakeshop",
    pin: "🍞",
    description: "De Lara St, Calinan District — Bakery offering breads and pastries.",
    mapsQuery: "Rose Bakeshop De Lara St Calinan Davao City",
    image: `${STORAGE_BASE}/Rose%20Bakeshop2.png`,
  },
  {
    id: "panadero-bakeshop-1",
    name: "Panadero Bakeshop",
    category: "Bakeshop",
    lat: 7.1866,
    lng: 125.453,
    tag: "Bakeshop",
    pin: "🍞",
    description: "Fausta St, National Highway, Calinan — Bakery offering everyday breads and pastries.",
    mapsQuery: "Panadero Bakeshop Fausta St Calinan Davao City",
    image: `${STORAGE_BASE}/Panadero%20Bakeshop1.png`,
  },
  {
    id: "panadero-bakeshop-2",
    name: "Panadero Bakeshop",
    category: "Bakeshop",
    lat: 7.187,
    lng: 125.4533,
    tag: "Bakeshop",
    pin: "🍞",
    description: "Purok 30, Calinan — Bakery offering everyday breads and pastries.",
    mapsQuery: "Panadero Bakeshop Purok 30 Calinan Davao City",
    image: `${STORAGE_BASE}/Panadero%20Bakeshop2.png`,
  },
  {
    id: "manolette-bakeshop-1",
    name: "Manolette Bakeshop",
    category: "Bakeshop",
    lat: 7.1881,
    lng: 125.4536,
    tag: "Bakeshop",
    pin: "🍞",
    description: "Villafuerte St, Calinan District — Local bakery offering bread, cakes, and pastries.",
    mapsQuery: "Manolette Bakeshop Villafuerte St Calinan District Davao City",
    image: `${STORAGE_BASE}/Manolette%20Bakeshop1.png`,
  },
  {
    id: "manolette-bakeshop-2",
    name: "Manolette Bakeshop",
    category: "Bakeshop",
    lat: 7.1873,
    lng: 125.4514,
    tag: "Bakeshop",
    pin: "🍞",
    description: "Aurora St, Calinan District — Local bakery offering bread, cakes, and pastries.",
    mapsQuery: "Manolette Bakeshop Aurora Calinan District Davao City",
    image: `${STORAGE_BASE}/Manolette%20Bakeshop2.jpg`,
  },
  {
    id: "nikkas-breadhaus",
    name: "Nikka's Breadhaus",
    category: "Bakeshop",
    lat: 7.1869,
    lng: 125.4533,
    tag: "Bakeshop",
    pin: "🍞",
    description: "H. Garcia St corner Roman Diaz St, Calinan Poblacion — Local bakery.",
    mapsQuery: "Nikka's Breadhaus H. Garcia Street Corner Roman Diaz St Calinan Davao City",
    image: `${STORAGE_BASE}/Nikka_s%20Breadhaus.jpg`,
  },
  {
    id: "aa-breadhaus",
    name: "A&A Breadhaus",
    category: "Bakeshop",
    lat: 7.1882,
    lng: 125.4537,
    tag: "Bakeshop",
    pin: "🍞",
    description: "Villafuerte St, Calinan — Local bakery offering breads, cakes, and pastries.",
    mapsQuery: "A&A Breadhaus Villafuerte St Calinan Davao City",
    image: `${STORAGE_BASE}/A%26A%20Breadhaus.jpg`,
  },
  {
    id: "starlett-night-bar",
    name: "Starlett Night Bar",
    category: "Bar",
    lat: 7.1876,
    lng: 125.454,
    tag: "KTV Bar",
    pin: "🎤",
    description: "Calinan District — Casual nightlife spot offering music and social entertainment.",
    mapsQuery: "Starlett Night Bar Calinan Davao City",
    image: `${STORAGE_BASE}/Starlett%20Night%20Bar.png`,
  },
];

const categories: Array<"All" | Category> = [
  "All",
  "Restaurant",
  "Eatery",
  "Fast-Food",
  "Cafe",
  "Bakeshop",
  "Bar",
];

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const EMPTY_ROUTE_GEOJSON: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

/* ══════════════════════════════════════════
   COMPONENT
   Map lifecycle mirrors TransportUtilitiesPage: string-id
   container, map torn down whenever the panel closes, route
   drawn via OSRM, marker placement done inside a short
   setTimeout after the panel opens/map mounts.
══════════════════════════════════════════ */

export default function FoodDiningPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | Category>("All");
  const [sortNearest, setSortNearest] = useState(false);

  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locStatusText, setLocStatusText] = useState("Detecting your location…");
  const [isLocError, setIsLocError] = useState(false);
  const [hasLocationActive, setHasLocationActive] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState<FoodPlace | null>(null);
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

  /* ---------- ESC closes image modal ---------- */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ---------- locate me (live tracking) ---------- */

  function startLocating() {
    if (!navigator.geolocation) {
      setIsLocError(true);
      setLocStatusText("Geolocation is not supported by this browser.");
      showToast("⚠️ Geolocation is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setHasLocationActive(true);
    setLocStatusText("Detecting your location…");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLoc({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);
        setIsLocError(false);
        setLocStatusText(`Location active · ±${Math.round(accuracy)} m accuracy`);
      },
      (error) => {
        const errorMessages: Record<number, string> = {
          1: "Location permission was denied. Please allow location access.",
          2: "Your location is currently unavailable.",
          3: "Location request timed out. Please try again.",
        };
        const message = errorMessages[error.code] || "Unable to get your location.";
        setIsLocating(false);
        setIsLocError(true);
        setLocStatusText(message);
        showToast("⚠️ " + message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
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

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = foodPlaces.filter((place) => {
      const matchesSearch =
        !query ||
        place.name.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.tag.toLowerCase().includes(query);
      const matchesCategory = activeCategory === "All" || place.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortNearest && userLoc) {
      result = [...result].sort(
        (a, b) =>
          haversineKm(userLoc.lat, userLoc.lng, a.lat, a.lng) -
          haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng)
      );
    }

    return result;
  }, [search, activeCategory, sortNearest, userLoc]);

  /* ---------- map init & lifetime (mirrors Transportation) ---------- */

  useEffect(() => {
    if (!isMapPanelOpen) return;

    if (!mapboxgl.accessToken) {
      showToast("Mapbox token is missing — check NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: "food-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.4535, 7.1885],
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
          paint: { "line-color": "#c0392b", "line-width": 5, "line-opacity": 0.85 },
        });
        mapLoadedRef.current = true;
      });

      mapRef.current = map;
    } else {
      setTimeout(() => mapRef.current?.resize(), 100);
    }
  }, [isMapPanelOpen, showToast]);

  // Tear down the map whenever the panel closes, same as Transportation
  useEffect(() => {
    if (!isMapPanelOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      userMarkerRef.current = null;
      activeMarkerRef.current = null;
    }
  }, [isMapPanelOpen]);

  // Sync user location marker independently of the selected place
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement("div");
    el.className = "food-user-dot-wrapper";
    el.innerHTML = '<div class="food-user-dot-ring"></div><div class="food-user-dot-inner"></div>';

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLoc.lng, userLoc.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 16 }).setHTML(
          '<div class="food-user-popup"><h4>You are here</h4><p>Your current location</p></div>'
        )
      )
      .addTo(map);
  }, [userLoc, isMapPanelOpen]);

  function showOnMap(place: FoodPlace) {
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
        <div class="food-place-popup">
          <span class="food-popup-tag">${place.tag}</span>
          <h4>${place.pin} ${place.name}</h4>
          <p>${place.description}</p>
          <a href="${googleMapsSearchUrl(place.mapsQuery)}" target="_blank" rel="noreferrer">Open in Google Maps</a>
        </div>
      `;

      activeMarkerRef.current = new mapboxgl.Marker({ color: "#c0392b" })
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

  /* ---------- directions / route (OSRM, draws the actual road path) ---------- */

  async function getRoute(place: FoodPlace) {
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
      const timeLabel = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

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

      setRouteInfo({ distance: formatDistance(km), time: timeLabel });
      showToast(`🧭 Route to ${place.name}: ${formatDistance(km)} · ${timeLabel}`);
    } catch {
      showToast("⚠️ Could not load route. Check your internet connection.");
    } finally {
      setRoutingId(null);
    }
  }

  /* ---------- render ---------- */

  return (
    <main className="food-dining-page">
      <header className="food-header">
        <div className="food-header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1>Food &amp; Dining</h1>
        </div>

        <div className="food-header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Search restaurant, cafe..."
              aria-label="Search food places"
              autoComplete="off"
            />
          </div>

          <button type="button" className={isLocating ? "loading" : ""} onClick={startLocating} disabled={isLocating}>
            {isLocating ? "Locating..." : userLoc ? "📍 Tracking" : "📍 Locate Me"}
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
        {modalImage && <img className="modal-content" src={modalImage} alt="Preview" />}
      </div>

      <section className="food-hero">
        <h2>Savor the Flavors of Calinan</h2>
        <p>Discover restaurants, eateries, cafés, bakeshops, and other food places around the Calinan area.</p>

        <div id="location-status" className={hasLocationActive ? "visible" : ""}>
          <div className={`loc-dot ${isLocError ? "loc-err" : ""}`} />
          <span>{locStatusText}</span>
        </div>
      </section>

      <section className="food-toolbar">
        <div className="category-filters">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? "active" : ""}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!userLoc}
          title={userLoc ? "" : "Enable location first"}
          onClick={() => setSortNearest((current) => !current)}
        >
          {sortNearest ? "✅ Sorted by nearest" : "📶 Sort by nearest"}
        </button>
      </section>

      <div className="food-result-count">
        Showing {filteredPlaces.length} of {foodPlaces.length} locations
      </div>

      {filteredPlaces.length === 0 ? (
        <section className="food-empty-state">
          <h3>No results found</h3>
          <p>Try a different search term or category.</p>
        </section>
      ) : (
        <section className="food-card-grid">
          {filteredPlaces.map((place) => {
            const distance = userLoc ? haversineKm(userLoc.lat, userLoc.lng, place.lat, place.lng) : null;

            return (
              <article className="food-card" key={place.id}>
                {place.image ? (
                  <div className="food-card-image" onClick={() => setModalImage(place.image!)}>
                    <img
                      src={place.image}
                      alt={place.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="food-card-image food-card-placeholder">{place.pin}</div>
                )}

                <div className="food-card-content">
                  <h3>{place.name}</h3>
                  <p>{place.description}</p>
                  <span className="food-tag">{place.tag}</span>

                  <div className={`food-distance${distance !== null ? " visible" : ""}`}>
                    📍 {distance !== null ? formatDistance(distance) + " away" : ""}
                  </div>

                  <div className="food-card-actions">
                    <button type="button" onClick={() => showOnMap(place)}>
                      📍 View on Map
                    </button>
                    <button type="button" onClick={() => getRoute(place)}>
                      {routingId === place.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* SPACER */}
      <div className={`food-map-panel-spacer${isMapPanelOpen ? " active" : ""}`} />

      {/* MAP PANEL */}
      <div className={`food-map-panel${isMapPanelOpen ? " active" : ""}`}>
        <div className="food-map-panel-header">
          <div>
            <div className="food-map-panel-title">📍 {selectedPlace ? selectedPlace.name : "Map"}</div>
            <div className="food-map-panel-subtitle">{selectedPlace?.tag ?? ""}</div>
          </div>
          <div className="food-map-panel-actions">
            {selectedPlace && (
              <a
                className="food-map-directions-link"
                href={googleMapsSearchUrl(selectedPlace.mapsQuery)}
                target="_blank"
                rel="noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button className="food-map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>
        <div id="food-map" />
        <div className={`food-route-info${routeInfo ? " visible" : ""}`}>
          <span>
            🛣️ Road distance: <strong>{routeInfo?.distance ?? "–"}</strong>
          </span>
          <span>
            ⏱️ Estimated time: <strong>{routeInfo?.time ?? "–"}</strong>
          </span>
        </div>
      </div>

      {/* TOAST */}
      <div className={`food-toast${toast ? " show" : ""}`}>{toast}</div>
    </main>
  );
}