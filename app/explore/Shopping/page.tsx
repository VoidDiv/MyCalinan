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
// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
export type StoreCategory =
  | "Mall & Grocery"
  | "General Merchandise"
  | "Hardware & Construction"
  | "Motor Parts"
  | "Convenience Store"
  | "Electronics & Repair"
  | "Printing & Photo";

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
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
// Store Data
// ----------------------------------------------------------------------
const STORES_DATA: StoreItem[] = [
  {
    id: "gaisano-grand",
    name: "Gaisano Grand Calinan",
    category: "Mall & Grocery",
    lat: 7.1905,
    lng: 125.4558,
    tag: "Mall",
    pin: "🛍️",
    mapsQuery: "Gaisano+Grand+Calinan+Davao+City",
    imageSrc: "/image/Gaisano Grand Calinan.jpg",
    address: "Davao–Bukidnon Highway, Calinan Poblacion, Davao City",
    description:
      "Main shopping mall in Calinan District featuring a supermarket, department store, food stalls, and retail services.",
  },
  {
    id: "nccc-calinan",
    name: "NCCC Calinan",
    category: "Mall & Grocery",
    lat: 7.1897,
    lng: 125.4548,
    tag: "Department Store",
    pin: "🏬",
    mapsQuery: "NCCC+Calinan+Davao+City",
    imageSrc: "/image/NCCC Calinan.jpg",
    address: "Davao–Bukidnon Highway, Calinan Poblacion, Davao City",
    description: "Small community shopping center providing basic shopping, groceries, and everyday services.",
  },
  {
    id: "lots-for-less",
    name: "Lots For Less",
    category: "Mall & Grocery",
    lat: 7.189,
    lng: 125.453,
    tag: "Supermarket",
    pin: "🛒",
    mapsQuery: "Lots+For+Less+Calinan+Davao+City",
    imageSrc: "/image/Lots For Less.jpg",
    address: "De Lara St, Calinan District, Davao City",
    description: "Budget-friendly grocery store known for affordable products, discounted prices, and value-for-money essentials.",
  },
  {
    id: "felcris-supermarket",
    name: "Felcris Supermarket Inc.",
    category: "Mall & Grocery",
    lat: 7.1885,
    lng: 125.4525,
    tag: "Supermarket",
    pin: "🛒",
    mapsQuery: "Felcris+Supermarket+Calinan+Davao+City",
    imageSrc: "/image/Felcris Supermarket Inc..jpg",
    address: "De Lara St, Calinan District, Davao City",
    description: "Offers groceries, snacks, household items, and clothing at organized, budget-friendly prices.",
  },
  {
    id: "multiple-eight",
    name: "Multiple-Eight Merchandise",
    category: "General Merchandise",
    lat: 7.191,
    lng: 125.456,
    tag: "General Merchandise",
    pin: "🏪",
    mapsQuery: "Multiple+Eight+Merchandise+Davao-Bukidnon+Hwy+Calinan+Davao+City",
    imageSrc: "/image/Multiple-Eight Merchandise.png",
    address: "Bukidnon Hwy, Calinan Poblacion, Davao City",
    description: "Budget-friendly general grocery store selling low-priced food items, snacks, and household goods.",
  },
  {
    id: "four-star",
    name: "Four Star Merchandise",
    category: "General Merchandise",
    lat: 7.1902,
    lng: 125.4542,
    tag: "General Merchandise",
    pin: "🏪",
    mapsQuery: "Four+Star+Merchandise+Purok+30+Calinan+Poblacion+Davao+City",
    imageSrc: "/image/Four Star Merchandise.png",
    address: "Purok 30, Calinan Poblacion, Davao City",
    description: "General merchandise and school supply store offering retail goods and everyday essentials.",
  },
  {
    id: "rillan-trading",
    name: "Rillan Trading",
    category: "General Merchandise",
    lat: 7.1895,
    lng: 125.4535,
    tag: "Trading Store",
    pin: "🏪",
    mapsQuery: "Rillan+Trading+Villafuerte+St+Calinan+Davao+City",
    imageSrc: "/image/Rillan Trading.png",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Local trading store selling school supplies, general merchandise, and small business items.",
  },
  {
    id: "ploya-marketing",
    name: "Ploya Marketing",
    category: "General Merchandise",
    lat: 7.1893,
    lng: 125.4533,
    tag: "School & Office Supplies",
    pin: "📚",
    mapsQuery: "Ploya+Marketing+Villafuerte+St+Calinan+Davao+City",
    imageSrc: "/image/Ploya Marketing.png",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Specializes in school supplies, office materials, and general retail goods.",
  },
  {
    id: "ksc-calinan",
    name: "KSC Calinan",
    category: "Mall & Grocery",
    lat: 7.1891,
    lng: 125.4531,
    tag: "Department Store",
    pin: "🏬",
    mapsQuery: "KSC+Calinan+Villafuerte+St+Calinan+Davao+City",
    imageSrc: "/image/KSC Calinan.jpg",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Department-style store offering clothing, footwear, school supplies, and household goods.",
  },
  {
    id: "bcg-trading",
    name: "BCG Trading",
    category: "General Merchandise",
    lat: 7.1912,
    lng: 125.4562,
    tag: "Utility Supply Store",
    pin: "📦",
    mapsQuery: "BCG+Trading+Purok+13+Davao-Bukidnon+Road+Calinan+Davao+City",
    imageSrc: "/image/BCG Trading.jpg",
    address: "Purok 13, Davao–Bukidnon Road, Calinan, Davao City",
    description: "Focuses on store equipment, containers, ice chests, fish boxes, and utility hardware.",
  },
  {
    id: "dd-plasticware",
    name: "D & D Calinan Plasticware",
    category: "General Merchandise",
    lat: 7.1913,
    lng: 125.4563,
    tag: "Plasticware Store",
    pin: "🧴",
    mapsQuery: "D+%26+D+Calinan+Plasticware+Purok+13+Davao-Bukidnon+Road+Calinan+Davao+City",
    imageSrc: "/image/D & D Calinan Plasticware.png",
    address: "Purok 13, Davao–Bukidnon Road, Calinan, Davao City",
    description: "Specializes in household plasticware, kitchen containers, and storage supplies.",
  },
  {
    id: "al-trading",
    name: "A.L. Calinan Trading",
    category: "Mall & Grocery",
    lat: 7.1894,
    lng: 125.4534,
    tag: "Department Store",
    pin: "🏬",
    mapsQuery: "A.L.+Calinan+Trading+Villafuerte+St+Calinan+Davao+City",
    imageSrc: "/image/A.L. Calinan Trading.jpg",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Popular general merchandise store for toys, party decorations, and back-to-school items.",
  },
  {
    id: "jw-kimhim",
    name: "JW KIMHIM Trading",
    category: "General Merchandise",
    lat: 7.1915,
    lng: 125.4565,
    tag: "Wholesale Trading",
    pin: "📦",
    mapsQuery: "JW+KIMHIM+Trading+Davao-Bukidnon+Hwy+Calinan+Davao+City",
    imageSrc: "/image/JW KIMHIM Trading.png",
    address: "Davao - Bukidnon Hwy, Calinan District, Davao City",
    description: "Wholesale distributor of plastic containers, storage products, and retail merchandise.",
  },
  {
    id: "skylight-hardware",
    name: "Calinan Skylight Hardware",
    category: "Hardware & Construction",
    lat: 7.1888,
    lng: 125.4528,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Calinan+Skylight+Hardware+R.+Magsaysay+St+Calinan+Davao+City",
    imageSrc: "/image/Calinan Skylight Hardware.jpg",
    address: "R. Magsaysay St, Calinan District, Davao City",
    description: "Provides comprehensive construction, electrical, and plumbing supplies.",
  },
  {
    id: "blue-star-hardware",
    name: "Calinan Blue Star Hardware",
    category: "Hardware & Construction",
    lat: 7.1886,
    lng: 125.4526,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Calinan+Blue+Star+Hardware+R.+Magsaysay+St+Calinan+Davao+City",
    imageSrc: "/image/Calinan Blue Star Hardware.jpg",
    address: "R. Magsaysay St, Calinan District, Davao City",
    description: "Supplies construction and maintenance materials for contractors and households.",
  },
  {
    id: "edaka-hardware",
    name: "Edaka Hardware",
    category: "Hardware & Construction",
    lat: 7.1892,
    lng: 125.4532,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Edaka+Hardware+Villafuerte+St+Calinan+Davao+City",
    imageSrc: "/image/Edaka Hardware.jpg",
    address: "Villafuerte St, Calinan District, Davao City",
    description: "Neighborhood hardware store supplying wholesale and retail building materials and tools.",
  },
  {
    id: "polycrop-marketing",
    name: "Polycrop Marketing",
    category: "Hardware & Construction",
    lat: 7.189,
    lng: 125.453,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Polycrop+Marketing+Villafuerte+St+Calinan+Davao+City",
    imageSrc: "/image/POLYCROP MARKETING.jpg",
    address: "Villafuerte St, Calinan District, Davao City",
    description: "Key supplier of construction tools and building supplies for local development.",
  },
  {
    id: "kct-motor-parts",
    name: "KCT Motor Vehicle Parts & Accessories",
    category: "Motor Parts",
    lat: 7.1878,
    lng: 125.4518,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "KCT+Motor+Vehicle+Parts+%26+Accessories+Shop+Roman+Diaz+St+Calinan+Davao+City",
    imageSrc: "/image/KCT Motor Vehicle Parts & Accessories Shop.jpg",
    address: "Roman Diaz St, Calinan District, Davao City",
    description: "Motorcycle parts retailer and repair shop offering spare parts and basic servicing.",
  },
  {
    id: "lyr-motorparts",
    name: "LYR Motorparts Calinan",
    category: "Motor Parts",
    lat: 7.188,
    lng: 125.452,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "LYR+Motorparts+Calinan+32+Malanos+St+Calinan+Davao+City",
    imageSrc: "/image/LYR Motorparts Calinan.jpg",
    address: "32 Malanos St, Calinan District, Davao City",
    description: "Authorized motorparts retailer and distributor of motorcycle accessories.",
  },
  {
    id: "motohub-davao",
    name: "Motohub Davao Calinan Branch",
    category: "Motor Parts",
    lat: 7.1908,
    lng: 125.4555,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "Motohub+Davao+Calinan+Branch+Davao-Bukidnon+Rd+Calinan+Davao+City",
    imageSrc: "/image/Motohub Davao Calinan Branch.png",
    address: "Davao-Bukidnon Rd, Calinan District, Davao City",
    description: "Offers motorcycle riding gear, protective equipment, and custom parts.",
  },
  {
    id: "roan-parts-branch",
    name: "Roan Parts And Accessories (Branch)",
    category: "Motor Parts",
    lat: 7.1876,
    lng: 125.4516,
    tag: "Motorshop Branch",
    pin: "🏍️",
    mapsQuery: "Roan+Parts+And+Accessories+Purok+32+Roman+Diaz+St+Calinan+Davao+City",
    imageSrc: "/image/Roan Parts And Accessories.png",
    address: "Purok 32, Roman Diaz St, Calinan, Davao City",
    description: "Motorcycle parts branch supplying maintenance supplies and aftermarket accessories.",
  },
  {
    id: "roan-parts-main",
    name: "Roan Parts And Accessories (Main)",
    category: "Motor Parts",
    lat: 7.1874,
    lng: 125.4514,
    tag: "Motorshop Main Branch",
    pin: "🏍️",
    mapsQuery: "Roan+Parts+And+Accessories+H.+Quiambao+St+Roman+Diaz+St+Calinan+Davao+City",
    imageSrc: "/image/Roan Parts And Accessories.jpg",
    address: "H. Quiambao St cor. Roman Diaz St, Calinan, Davao City",
    description: "Main motorcycle parts store stocking replacement components and maintenance items.",
  },
  {
    id: "pagaran-motor-parts",
    name: "Pagaran Motor Parts",
    category: "Motor Parts",
    lat: 7.1872,
    lng: 125.4512,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "Pagaran+Motor+Parts+Datu+Abing+St+Calinan+Davao+City",
    imageSrc: "/image/Pagaran Motor Parts.jpg",
    address: "Datu Abing St, Calinan District, Davao City",
    description: "Automotive and motorcycle spare parts retailer serving mechanics and vehicle owners.",
  },
  {
    id: "oem-auto-parts",
    name: "OEM Auto Parts Supply",
    category: "Motor Parts",
    lat: 7.1906,
    lng: 125.4553,
    tag: "Motorshop",
    pin: "🔩",
    mapsQuery: "OEM+AUTO+PARTS+SUPPLY+Davao-Bukidnon+Rd+Calinan+Davao+City",
    imageSrc: "/image/OEM AUTO PARTS SUPPLY.jpg",
    address: "Davao-Bukidnon Rd, Calinan District, Davao City",
    description: "Automotive replacement parts supply offering car and motorcycle maintenance goods.",
  },
  {
    id: "lsac-enterprises",
    name: "LSAC Enterprises",
    category: "General Merchandise",
    lat: 7.1898,
    lng: 125.454,
    tag: "General Store",
    pin: "🏪",
    mapsQuery: "LSAC+Enterprises+Calinan+Davao+City",
    imageSrc: "/image/LSAC Enterprises.jpg",
    address: "Calinan Poblacion, Davao City",
    description: "Local retail store providing general household products, goods, and daily essentials.",
  },
];

// Filter options list
const FILTER_OPTIONS: Array<"all" | StoreCategory> = [
  "all",
  "Mall & Grocery",
  "General Merchandise",
  "Hardware & Construction",
  "Motor Parts",
  "Convenience Store",
  "Electronics & Repair",
  "Printing & Photo",
];

// ----------------------------------------------------------------------
// Distance Calculation (Haversine)
// ----------------------------------------------------------------------
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

const EMPTY_ROUTE_GEOJSON: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const ShoppingStorePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | StoreCategory>("all");
  const [sortByNearest, setSortByNearest] = useState<boolean>(false);

  // User location states
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locStatusText, setLocStatusText] = useState<string>("Detecting your location…");
  const [isLocError, setIsLocError] = useState<boolean>(false);
  const [hasLocationActive, setHasLocationActive] = useState<boolean>(false);

  // UI state
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map panel states
  const [isMapPanelOpen, setIsMapPanelOpen] = useState<boolean>(false);
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routingStoreId, setRoutingStoreId] = useState<string | null>(null);

  // Refs for Mapbox objects
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const activeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapLoadedRef = useRef<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Location request handler
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
  };

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
        container: "shopping-map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [125.454, 7.189],
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

  // Sync user location marker
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

  // Map View Pin
  const handleShowOnMap = (item: StoreItem) => {
    setSelectedStore(item);
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
          <a href="${googleMapsSearchUrl(item.mapsQuery)}" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
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

  // Route calculation using OSRM
  const handleGetDirections = async (item: StoreItem) => {
    if (!userLoc) {
      showToast("📍 Enable location first to get directions.");
      return;
    }

    setRoutingStoreId(item.id);
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
      setRoutingStoreId(null);
    }
  };

  const handleCloseMap = () => {
    setIsMapPanelOpen(false);
    setRouteInfo(null);
    setSelectedStore(null);
  };

  // Filter & Sort Logic
  const processedStores = useMemo(() => {
    return STORES_DATA.map((item) => {
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
  }, [searchQuery, activeFilter, sortByNearest, userLoc]);

  // ESC Key listener
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

  return (
    <div>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-btn">
            ← Home
          </Link>
          <h1 className="logo">Shopping & Store</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Search store, mall, hardware…"
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
        <span className="close" id="closeBtn" onClick={() => setModalImageSrc(null)}>
          ×
        </span>
        {modalImageSrc && <img className="modal-content" id="modalImg" src={modalImageSrc} alt="Preview" />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Shopping & Stores in Calinan</h2>
        <p>
          Explore local malls, groceries, hardware, motor shops, and service stores around the Calinan area.
          Enable location to see distances and get directions.
        </p>
        <div id="location-status" className={hasLocationActive ? "visible" : ""}>
          <div className={`loc-dot ${isLocError ? "loc-err" : ""}`} id="loc-dot"></div>
          <span id="loc-text">{locStatusText}</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            className={`filter-chip ${activeFilter === filter ? "active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === "all" ? "All" : filter === "Convenience Store" ? "Convenience" : filter}
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
        {processedStores.length > 0
          ? `Showing ${processedStores.length} of ${STORES_DATA.length} stores`
          : ""}
      </div>

      {/* CARDS CONTAINER */}
      <main className="container" id="cards-container">
        {processedStores.map((item) => (
          <div key={item.id} className="card">
            <div className="card-image" onClick={() => setModalImageSrc(item.imageSrc)}>
              <img src={item.imageSrc} alt={item.name} />
            </div>
            <div className="card-content">
              <h3>
                <a
                  href={googleMapsSearchUrl(item.mapsQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.name}
                </a>
              </h3>
              <p>
                {item.description}
                <br />
                <br />
                Location: {item.address}
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
                    routingStoreId === item.id ? "loading" : ""
                  }`}
                  onClick={() => handleGetDirections(item)}
                >
                  {routingStoreId === item.id ? "⏳ Loading route…" : "🧭 Get Directions"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {processedStores.length === 0 && (
          <div id="empty-state" style={{ display: "flex" }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2e8b57" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <h3>No results found</h3>
            <p>Try a different search term or filter.</p>
          </div>
        )}
      </main>

      {/* SPACER */}
      <div id="map-panel-spacer" className={isMapPanelOpen ? "active" : ""}></div>

      {/* MAP PANEL */}
      <div id="map-panel" className={isMapPanelOpen ? "active" : ""}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {selectedStore ? selectedStore.name : "Map"}</div>
            <div id="map-panel-subtitle">{selectedStore?.tag || ""}</div>
          </div>
          <div id="map-panel-actions">
            {selectedStore && (
              <a
                id="map-directions-link"
                className="visible"
                href={googleMapsSearchUrl(selectedStore.mapsQuery)}
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

        <div id="shopping-map"></div>

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

export default ShoppingStorePage;