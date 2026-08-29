"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
// import './style/Finance.css'; // Ensure your CSS file is imported here

// Declare Leaflet global variable for TypeScript
declare const L: any;
import Link from "next/link";
// ----------------------------------------------------------------------
// Types & Data Structure
// ----------------------------------------------------------------------
export interface FinanceLocation {
  id: string;
  name: string;
  category: 'Bank' | 'Remittance';
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  mapsQuery: string;
  image: string;
  description: string;
  mapsUrl: string;
}

const FINANCE_LOCATIONS: FinanceLocation[] = [
  {
    id: 'bdo-calinan',
    name: 'BDO Calinan',
    category: 'Bank',
    lat: 7.1876,
    lng: 125.4524,
    tag: 'Bank',
    pin: '🏦',
    mapsQuery: 'BDO+Calinan+WTKC+Realty+Bldg+Davao+Bukidnon+National+Highway+Calinan+Davao+City+Davao+del+Sur',
    image: 'image/BDO.png',
    description: 'WTKC Realty Bldg., Davao–Bukidnon National Highway, Calinan — Branch of Banco de Oro Unibank, one of the largest banks in the Philippines, serving retail and commercial banking needs in the Calinan district.',
    mapsUrl: 'https://maps.google.com/?q=BDO+Calinan'
  },
  {
    id: 'bdo-network-bank',
    name: 'BDO Network Bank',
    category: 'Bank',
    lat: 7.1850,
    lng: 125.4498,
    tag: 'Bank',
    pin: '🏦',
    mapsQuery: 'BDO+Network+Bank+ONB+Calinan+Building+Davao+Buda+National+Hwy+Calinan+District+Davao+City+Davao+del+Sur',
    image: 'image/BDO Network Bank.jpg',
    description: 'ONB Calinan Building, Davao–Buda National Hwy — Formerly One Network Bank (ONB), serving farmers, employees, small businesses, and residents with savings, loans, ATM access, and money transfers.',
    mapsUrl: 'https://maps.google.com/?q=BDO+Network+Bank+Calinan'
  },
  {
    id: 'pnb',
    name: 'PNB',
    category: 'Bank',
    lat: 7.1882,
    lng: 125.4548,
    tag: 'Bank',
    pin: '🏦',
    mapsQuery: 'PNB+Davao+Calinan+LTH+Building+Davao+Bukidnon+Hwy+Calinan+Davao+City+Davao+del+Sur',
    image: 'image/PNB.png',
    description: 'LTH Building, Davao–Bukidnon Hwy, Calinan — Full-service branch of the Philippine National Bank providing a range of banking and financial services to residents and businesses along the highway corridor.',
    mapsUrl: 'https://maps.google.com/?q=PNB+Calinan'
  },
  {
    id: 'chinabank',
    name: 'ChinaBank',
    category: 'Bank',
    lat: 7.1888,
    lng: 125.4552,
    tag: 'Bank',
    pin: '🏦',
    mapsQuery: 'China+Bank+Honesto+Garcia+St+Calinan+Davao+Buda+National+Hwy+Calinan+District+Davao+City+Davao+del+Sur',
    image: 'image/ChinaBank1.png',
    description: "Honesto Garcia St., Calinan District — Branch of China Banking Corporation, one of the Philippines' oldest private universal banks, serving individuals, businesses, and agricultural clients in the area.",
    mapsUrl: 'https://maps.google.com/?q=ChinaBank+Calinan'
  },
  {
    id: 'landbank-1',
    name: 'Landbank',
    category: 'Bank',
    lat: 7.1878,
    lng: 125.4546,
    tag: 'Bank',
    pin: '🏦',
    mapsQuery: 'Landbank+Calinan+Purok+13+Palarca+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur',
    image: 'image/Landbank1.png',
    description: 'Purok 13, Palarca Street, Calinan Poblacion — Government bank branch offering savings accounts, ATM, loans, fund transfers, and government-related transactions for residents, farmers, and pensioners.',
    mapsUrl: 'https://maps.google.com/?q=Landbank+Calinan'
  },
  {
    id: 'landbank-2',
    name: 'Landbank',
    category: 'Bank',
    lat: 7.1879,
    lng: 125.4547,
    tag: 'Bank',
    pin: '🏦',
    mapsQuery: 'Landbank+Calinan+Purok+13+Palarca+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur',
    image: 'image/Landbank2.jpg',
    description: 'Purok 13, Palarca Street, Calinan Poblacion — Convenient financial access for the Calinan community without traveling to downtown Davao, with full banking services and government transaction support.',
    mapsUrl: 'https://maps.google.com/?q=Landbank+Calinan'
  },
  {
    id: 'm-lhuillier',
    name: 'M Lhuillier',
    category: 'Remittance',
    lat: 7.1870,
    lng: 125.4512,
    tag: 'Remittance Center',
    pin: '💸',
    mapsQuery: 'M+Lhuillier+Calinan+Davao+Bukidnon+Hwy+Calinan+District+Davao+City+Davao+del+Sur',
    image: 'image/M Lhuillier.jpg',
    description: 'Davao–Bukidnon Highway, Calinan — Branch of M Lhuillier Financial Services providing quick-access pawning, money remittance, and financial solutions for the local community.',
    mapsUrl: 'https://maps.google.com/?q=M+Lhuillier+Calinan'
  },
  {
    id: 'palawan-1',
    name: 'Palawan Pawnshop',
    category: 'Remittance',
    lat: 7.1886,
    lng: 125.4560,
    tag: 'Remittance Center',
    pin: '💸',
    mapsQuery: 'Palawan+Pawnshop+Villafuerte+St+Calinan+District+Davao+City+Davao+del+Sur',
    image: 'image/Palawan Pawnshop.png',
    description: 'Villafuerte St., Calinan — Palawan Express branch providing pawnbroking, money remittance, and payment solutions for residents and businesses in the Calinan Poblacion area.',
    mapsUrl: 'https://maps.google.com/?q=Palawan+Pawnshop+Villafuerte+Calinan'
  },
  {
    id: 'palawan-2',
    name: 'Palawan Pawnshop',
    category: 'Remittance',
    lat: 7.1865,
    lng: 125.4518,
    tag: 'Remittance Center',
    pin: '💸',
    mapsQuery: 'Palawan+Pawnshop+Davao+Bukidnon+Hwy+Calinan+Calinan+District+Davao+City+Davao+del+Sur',
    image: 'image/Palawan Pawnshop1.png',
    description: 'Davao–Bukidnon Highway, Calinan — Accessible pawnbroking, money remittance, and payment services for residents and businesses along the main highway in Calinan District.',
    mapsUrl: 'https://maps.google.com/?q=Palawan+Pawnshop+Highway+Calinan'
  }
];

// Helper: Haversine distance formula (in km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const FinancePage: React.FC = () => {
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'Bank' | 'Remittance'>('all');
  const [sortByNearest, setSortByNearest] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Detecting your location…');
  const [locationError, setLocationError] = useState(false);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Map state
  const [isMapActive, setIsMapActive] = useState(false);
  const [activeLocation, setActiveLocation] = useState<FinanceLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ dist: string; time: string } | null>(null);
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);

  // --- Refs ---
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const activeMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);

  // --- Dynamically Load Leaflet Assets ---
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(script);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // --- Toast Trigger ---
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // --- Geolocation ---
  const startLocating = () => {
    if (!navigator.geolocation) {
      showToast('⚠️ Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationError(false);
    setLocationStatus('Detecting your location…');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setUserLocation(coords);
        setIsLocating(false);
        setLocationError(false);
        setLocationStatus(`Location active · ±${coords.accuracy} m accuracy`);
        updateUserMarkerOnMap(coords.lat, coords.lng);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(true);
        const msgs: Record<number, string> = {
          1: 'Location access denied. Please allow it in your browser settings.',
          2: 'Location unavailable. Check your GPS or network.',
          3: 'Location request timed out. Try again.',
        };
        const errorMsg = msgs[err.code] || 'Could not get location.';
        setLocationStatus(errorMsg);
        showToast('⚠️ ' + errorMsg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  // --- Map Operations ---
  const initMapIfNeeded = () => {
    if (mapRef.current || typeof L === 'undefined') return;
    mapRef.current = L.map(mapContainerRef.current, { zoomControl: true }).setView([7.1876, 125.453], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    if (userLocation) {
      updateUserMarkerOnMap(userLocation.lat, userLocation.lng);
    }
  };

  const updateUserMarkerOnMap = (lat: number, lng: number) => {
    if (!mapRef.current || typeof L === 'undefined') return;
    if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);

    const icon = L.divIcon({
      className: '',
      html: `<div class="user-dot-wrapper">
               <div class="user-dot-ring"></div>
               <div class="user-dot-inner"></div>
             </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    });

    userMarkerRef.current = L.marker([lat, lng], { icon })
      .addTo(mapRef.current)
      .bindPopup('<div class="user-popup"><h4>📍 Your Location</h4><p>You are here</p></div>');
  };

  const showOnMap = (loc: FinanceLocation) => {
    setIsMapActive(true);
    setActiveLocation(loc);
    setRouteInfo(null);

    setTimeout(() => {
      initMapIfNeeded();
      if (!mapRef.current || typeof L === 'undefined') return;

      if (activeMarkerRef.current) mapRef.current.removeLayer(activeMarkerRef.current);
      if (routeLayerRef.current) {
        mapRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:#2b6b45; color:white; font-size:16px;
          width:36px; height:36px; border-radius:50% 50% 50% 0;
          transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;
          box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid white;">
          <span style="transform:rotate(45deg)">${loc.pin}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -40],
      });

      const distText = userLocation
        ? `<br><strong>${formatDist(haversine(userLocation.lat, userLocation.lng, loc.lat, loc.lng))}</strong> straight-line from you`
        : '';

      activeMarkerRef.current = L.marker([loc.lat, loc.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(
          `<div class="finance-popup">
            <h4>${loc.name}</h4>
            <div class="popup-tag">${loc.tag}</div>
            <p>${distText}</p>
            <a href="https://maps.google.com/?q=${loc.mapsQuery}" target="_blank">🧭 Open in Google Maps</a>
          </div>`,
          { maxWidth: 250 }
        )
        .openPopup();

      mapRef.current.flyTo([loc.lat, loc.lng], 17, { duration: 1.0 });
      setTimeout(() => mapRef.current.invalidateSize(), 320);

      document.getElementById('map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  const getRoute = (loc: FinanceLocation) => {
    if (!userLocation) {
      showToast('📍 Enable location first to get directions.');
      return;
    }

    setLoadingRouteId(loc.id);
    showOnMap(loc);

    const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${loc.lng},${loc.lat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!data.routes || data.routes.length === 0) throw new Error('No route found');

        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distKm = (route.distance / 1000).toFixed(1);
        const mins = Math.round(route.duration / 60);
        const timeStr = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

        if (mapRef.current && typeof L !== 'undefined') {
          if (routeLayerRef.current) mapRef.current.removeLayer(routeLayerRef.current);

          routeLayerRef.current = L.polyline(coords, {
            color: '#2b6b45',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(mapRef.current);

          mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
        }

        setRouteInfo({ dist: `${distKm} km`, time: timeStr });
        showToast(`🧭 Route to ${loc.name}: ${distKm} km · ${timeStr}`);
      })
      .catch(() => {
        showToast('⚠️ Could not load route. Check your internet connection.');
      })
      .finally(() => {
        setLoadingRouteId(null);
      });
  };

  const closeMap = () => {
    setIsMapActive(false);
    setRouteInfo(null);
    if (routeLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
  };

  // --- Computed Locations List (Filtering, Searching, Sorting) ---
  const filteredLocations = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    let list = FINANCE_LOCATIONS.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);

      const matchFilter = activeFilter === 'all' || item.category.toLowerCase() === activeFilter.toLowerCase();

      return matchSearch && matchFilter;
    });

    if (sortByNearest && userLocation) {
      list = [...list].sort((a, b) => {
        const distA = haversine(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = haversine(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return list;
  }, [searchTerm, activeFilter, sortByNearest, userLocation]);

  return (
    <div className="finance-page-wrapper">
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
         <Link href="/" className="back-btn">
            ← Home
        </Link>
          <h1 className="logo">Finance</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Search bank, remittance, pawnshop…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            id="locate-btn"
            className={isLocating ? 'loading' : ''}
            onClick={startLocating}
            disabled={isLocating}
            title="Find my location"
          >
            <div className="spinner"></div>
            <span className="btn-label">{userLocation ? '📍 Tracking' : '📍 Locate Me'}</span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div
        className={`image-modal ${modalImage ? 'active' : ''}`}
        id="imageModal"
        onClick={(e) => {
          if ((e.target as HTMLElement).id !== 'modalImg') setModalImage(null);
        }}
      >
        <span className="close" onClick={() => setModalImage(null)}>
          ×
        </span>
        {modalImage && <img id="modalImg" src={modalImage} alt="Preview" />}
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Finance Services in Calinan</h2>
        <p>Find banks, remittance centers, and financial institutions near you. Enable location to see distances and get directions.</p>
        <div className={`location-status ${userLocation || locationError ? 'visible' : ''}`}>
          <div className={`loc-dot ${locationError ? 'loc-err' : ''}`} id="loc-dot"></div>
          <span id="loc-text">{locationStatus}</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        <button
          className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-chip ${activeFilter === 'Bank' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Bank')}
        >
          Banks
        </button>
        <button
          className={`filter-chip ${activeFilter === 'Remittance' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Remittance')}
        >
          Remittance
        </button>
        <button
          className={`sort-btn ${sortByNearest ? 'active' : ''}`}
          disabled={!userLocation}
          onClick={() => setSortByNearest(!sortByNearest)}
          title={!userLocation ? 'Enable location first' : 'Sort locations by distance'}
        >
          {sortByNearest ? '✅ Sorted by nearest' : '📶 Sort by nearest'}
        </button>
      </div>

      <div id="result-count">
        {filteredLocations.length > 0
          ? `Showing ${filteredLocations.length} of ${FINANCE_LOCATIONS.length} locations`
          : ''}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {filteredLocations.map((loc) => {
          const distanceKm = userLocation ? haversine(userLocation.lat, userLocation.lng, loc.lat, loc.lng) : null;

          return (
            <div className="card" key={loc.id}>
              <div className="card-image" onClick={() => setModalImage(loc.image)}>
                <img src={loc.image} alt={loc.name} />
              </div>
              <div className="card-content">
                <h3>
                  <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer">
                    {loc.name}
                  </a>
                </h3>
                <p>{loc.description}</p>
                <span className="tag">{loc.tag}</span>

                {distanceKm !== null && (
                  <div className="dist-badge visible">
                    <div className="dot"></div>
                    <span className="dist-text">{formatDist(distanceKm)}</span>
                  </div>
                )}

                <div className="card-actions">
                  <button className="view-map-btn" onClick={() => showOnMap(loc)}>
                    📍 View on Map
                  </button>
                  <button
                    className={`route-btn ${userLocation ? 'visible' : ''} ${loadingRouteId === loc.id ? 'loading' : ''}`}
                    onClick={() => getRoute(loc)}
                  >
                    {loadingRouteId === loc.id ? '⏳ Loading route…' : '🧭 Get Directions'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredLocations.length === 0 && (
          <div id="empty-state" style={{ display: 'flex' }}>
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2b6b45" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <h3>No results found</h3>
            <p>Try a different search term or filter.</p>
          </div>
        )}
      </section>

      {/* SPACER */}
      <div id="map-panel-spacer" className={isMapActive ? 'active' : ''}></div>

      {/* MAP PANEL */}
      <div id="map-panel" className={isMapActive ? 'active' : ''}>
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 {activeLocation ? activeLocation.name : 'Map'}</div>
            <div id="map-panel-subtitle">{activeLocation?.tag}</div>
          </div>
          <div id="map-panel-actions">
            {activeLocation && (
              <a
                id="map-directions-link"
                className="visible"
                href={`https://maps.google.com/?q=${activeLocation.mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                🧭 Open in Google Maps
              </a>
            )}
            <button id="map-panel-close" onClick={closeMap} title="Close map">
              ✕
            </button>
          </div>
        </div>

        <div id="finance-map" ref={mapContainerRef}></div>

        {routeInfo && (
          <div id="route-info" className="visible">
            <span>
              🛣️ Road distance: <strong>{routeInfo.dist}</strong>
            </span>
            <span>
              ⏱️ Estimated time: <strong>{routeInfo.time}</strong>
            </span>
          </div>
        )}
      </div>

      {/* TOAST */}
      <div id="toast" className={toastMsg ? 'show' : ''}>
        {toastMsg}
      </div>
    </div>
  );
};

export default FinancePage;
