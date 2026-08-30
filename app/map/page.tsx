'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ══════════════════════════════════════════
// MAPBOX ACCESS TOKEN
// ══════════════════════════════════════════
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

// Debug helper — tells you in the browser console whether the token
// actually loaded from .env.local or fell back to the hardcoded one.
if (typeof window !== 'undefined') {
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    console.warn(
      '[BarangayMap] NEXT_PUBLIC_MAPBOX_TOKEN wala ma-detect gikan sa .env.local — gigamit ang fallback token. ' +
        'Kung na-edit nimo ang .env.local, i-restart ang dev server (Ctrl+C, then npm run dev).'
    );
  }
}

// ══════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════
type Category =
  | 'all'
  | 'tourist'
  | 'hospital'
  | 'school'
  | 'restaurant'
  | 'police'
  | 'fire'
  | 'government';

interface Place {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  icon: string;
}

interface PlaceWithDistance extends Place {
  dist: number | null;
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  tourist: 'Tourist',
  hospital: 'Hospital',
  school: 'School',
  restaurant: 'Food',
  police: 'Police',
  fire: 'Fire',
  government: "Gov't",
};

// ══════════════════════════════════════════
// DATA
// ══════════════════════════════════════════
const CALINAN_PLACES: Place[] = [
  { id: '1', name: 'Philippine Eagle Center', category: 'tourist', lat: 7.1824, lng: 125.4093, address: 'Malagos, Calinan, Davao City', icon: '🦅' },
  { id: '2', name: 'Malagos Garden Resort', category: 'tourist', lat: 7.1833, lng: 125.4132, address: 'Bagkiwet, Malagos, Calinan', icon: '🌺' },
  { id: '3', name: 'Bamboo Sanctuary', category: 'tourist', lat: 7.1700, lng: 125.4200, address: 'Calinan District, Davao City', icon: '🎋' },
  { id: '4', name: 'Isaac T. Robillo Memorial Hospital', category: 'hospital', lat: 7.1662, lng: 125.4590, address: 'McArthur Highway, Calinan', icon: '🏥' },
  { id: '5', name: 'Calinan National High School', category: 'school', lat: 7.1650, lng: 125.4630, address: 'Roman Diaz St, Calinan', icon: '🏫' },
  { id: '6', name: 'Holy Cross College of Calinan', category: 'school', lat: 7.1640, lng: 125.4615, address: 'Villafuerte St, Calinan', icon: '🎓' },
  { id: '7', name: 'Calinan Public Market', category: 'restaurant', lat: 7.1643, lng: 125.4608, address: 'Market Site, Calinan', icon: '🏪' },
  { id: '8', name: 'Calinan Police Station (Station 10)', category: 'police', lat: 7.1635, lng: 125.4621, address: 'Roman Diaz St, Calinan', icon: '🚔' },
  { id: '9', name: 'Calinan Fire Station', category: 'fire', lat: 7.1630, lng: 125.4610, address: 'Central Calinan', icon: '🚒' },
  { id: '10', name: 'Calinan District Hall', category: 'government', lat: 7.1648, lng: 125.4602, address: 'District Center, Calinan', icon: '🏛️' },
];

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function BarangayMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const placeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'ok' | 'denied' | 'unsupported'>('unsupported');

  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [selectedDestination, setSelectedDestination] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ══════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ══════════════════════════════════════════
  // DIRECT ROUTE (declared early so it's safe to
  // reference from renderPlacesOnMap's popup buttons)
  // ══════════════════════════════════════════
  const drawRoute = useCallback(
    async (destLat: number, destLng: number, label: string) => {
      if (userLat === null || userLng === null || !mapRef.current) return;

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destLng},${destLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        const route = data.routes?.[0]?.geometry;
        if (!route || !mapRef.current) return;

        const geojsonData = { type: 'Feature' as const, properties: {}, geometry: route };
        const existingSource = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource | undefined;

        if (existingSource) {
          existingSource.setData(geojsonData);
        } else {
          mapRef.current.addSource('route', { type: 'geojson', data: geojsonData });
          mapRef.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#2b6b45', 'line-width': 6, 'line-opacity': 0.85 },
          });
        }

        const bounds = new mapboxgl.LngLatBounds();
        route.coordinates.forEach((c: [number, number]) => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 60 });

        showToast(`Route calculated to ${label}`);
      } catch (err) {
        console.error('Routing error:', err);
        showToast('Could not calculate route');
      }
    },
    [userLat, userLng, showToast]
  );

  const directRouteTo = useCallback(
    (destinationName: string) => {
      setSelectedDestination(destinationName);
      const target = CALINAN_PLACES.find((p) => p.name === destinationName);
      if (target) drawRoute(target.lat, target.lng, target.name);
    },
    [drawRoute]
  );

  // ══════════════════════════════════════════
  // FILTERED PLACES
  // ══════════════════════════════════════════
  const getFilteredPlaces = useCallback(
    (category: Category = activeCategory): Place[] => {
      if (category === 'all') return CALINAN_PLACES;
      return CALINAN_PLACES.filter((p) => p.category === category);
    },
    [activeCategory]
  );

  // ══════════════════════════════════════════
  // RENDER MARKERS
  // ══════════════════════════════════════════
  const renderPlacesOnMap = useCallback(
    (places: Place[]) => {
      if (!mapRef.current) return;

      placeMarkersRef.current.forEach((m) => m.remove());
      placeMarkersRef.current = [];

      places.forEach((place) => {
        const popupNode = document.createElement('div');
        popupNode.className = 'popup-content';
        popupNode.innerHTML = `
          <h4>${place.icon} ${place.name}</h4>
          <p>${place.address}</p>
        `;
        const btn = document.createElement('button');
        btn.textContent = 'Directions';
        btn.onclick = () => directRouteTo(place.name);
        popupNode.appendChild(btn);

        const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode);

        const marker = new mapboxgl.Marker()
          .setLngLat([place.lng, place.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        placeMarkersRef.current.push(marker);
      });
    },
    [directRouteTo]
  );

  // ══════════════════════════════════════════
  // NEARBY LIST (derived)
  // ══════════════════════════════════════════
  const nearbyList: PlaceWithDistance[] = (() => {
    const places = getFilteredPlaces();
    const withDist: PlaceWithDistance[] = places.map((p) => ({
      ...p,
      dist: userLat !== null && userLng !== null ? calculateDistance(userLat, userLng, p.lat, p.lng) : null,
    }));
    if (userLat !== null && userLng !== null) {
      withDist.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    }
    return withDist.slice(0, 5);
  })();

  // ══════════════════════════════════════════
  // MAP INITIALIZATION
  // ══════════════════════════════════════════
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      setMapError('Missing Mapbox access token.');
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [125.46, 7.1648],
      zoom: 13,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
      renderPlacesOnMap(CALINAN_PLACES);
      // Force a resize in case the container's real dimensions
      // weren't final yet when the map first painted.
      requestAnimationFrame(() => map.resize());
    });

    // This is the important part for debugging a blank map:
    // any style/network/token failure will show up here instead
    // of failing silently.
    map.on('error', (e) => {
      console.error('[Mapbox error]', e?.error?.message || e);
      setMapError(e?.error?.message || 'Unknown Mapbox error');
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════
  // GEOLOCATION TRACKING
  // ══════════════════════════════════════════
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        setAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus('ok');

        if (!mapRef.current) return;

        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'user-gps-marker';
          el.style.cssText =
            'background:#2b6b45;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.4);';

          userMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup().setText('Your Current Location'))
            .addTo(mapRef.current);
        }
      },
      (err) => {
        console.warn(`GPS Error: ${err.message}`);
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Nudge the map to recalc size when the sidebar toggles or on mount
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 250);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  // ══════════════════════════════════════════
  // RECENTER
  // ══════════════════════════════════════════
  const recenterMap = () => {
    if (userLat !== null && userLng !== null && mapRef.current) {
      mapRef.current.flyTo({ center: [userLng, userLat], zoom: 15 });
      showToast('Recentered to your location');
    } else {
      showToast('GPS position not acquired yet');
    }
  };

  // ══════════════════════════════════════════
  // CATEGORY FILTER
  // ══════════════════════════════════════════
  const filterCat = (category: Category) => {
    setActiveCategory(category);
    const filtered = category === 'all' ? CALINAN_PLACES : CALINAN_PLACES.filter((p) => p.category === category);

    renderPlacesOnMap(filtered);

    if (filtered.length > 0 && mapRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      filtered.forEach((p) => bounds.extend([p.lng, p.lat]));
      mapRef.current.fitBounds(bounds, { padding: 60 });
    }
  };

  // ══════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const query = value.toLowerCase().trim();

    if (query.length < 2) {
      setShowSearchResults(false);
      return;
    }

    const matches = CALINAN_PLACES.filter(
      (p) => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
    );
    setSearchResults(matches);
    setShowSearchResults(true);
  };

  const doSearch = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return;

    const matches = CALINAN_PLACES.filter(
      (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    );

    renderPlacesOnMap(matches);
    setShowSearchResults(false);

    if (matches.length > 0 && mapRef.current) {
      mapRef.current.flyTo({ center: [matches[0].lng, matches[0].lat], zoom: 15 });
      showToast(`Found ${matches.length} matching location(s)`);
    } else {
      showToast('No locations matched your query');
    }
  };

  const selectSearchResult = (id: string) => {
    const place = CALINAN_PLACES.find((p) => p.id === id);
    setShowSearchResults(false);
    if (place && mapRef.current) {
      mapRef.current.flyTo({ center: [place.lng, place.lat], zoom: 16 });
      showToast(`Navigated to ${place.name}`);
    }
  };

  // ══════════════════════════════════════════
  // ROUTING — clear
  // ══════════════════════════════════════════
  const clearRoute = useCallback(() => {
    if (!mapRef.current) return;
    if (mapRef.current.getLayer('route')) {
      mapRef.current.removeLayer('route');
    }
    if (mapRef.current.getSource('route')) {
      mapRef.current.removeSource('route');
    }
    showToast('Route cleared');
  }, [showToast]);

  const getDirections = useCallback(() => {
    if (userLat === null || userLng === null) {
      showToast('Waiting for your GPS location...');
      return;
    }
    if (!selectedDestination) {
      showToast('Please select a destination first');
      return;
    }
    const target = CALINAN_PLACES.find((p) => p.name === selectedDestination);
    if (!target) return;

    drawRoute(target.lat, target.lng, target.name);
  }, [userLat, userLng, selectedDestination, drawRoute, showToast]);

  // ══════════════════════════════════════════
  // EMERGENCY SEARCH
  // ══════════════════════════════════════════
  const findNearest = (type: Category) => {
    const matches = CALINAN_PLACES.filter((p) => p.category === type);
    if (matches.length > 0) {
      const target = matches[0];
      renderPlacesOnMap(matches);
      mapRef.current?.flyTo({ center: [target.lng, target.lat], zoom: 16 });
      directRouteTo(target.name);
      showToast(`Found nearest ${type}: ${target.name}`);
    } else {
      showToast(`No ${type} services found in database`);
    }
  };

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  return (
    <div className="flex w-full h-screen overflow-hidden bg-neutral-100">
      {/* ─── SIDEBAR ─── */}
      <aside
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } flex-shrink-0 h-full bg-white border-r border-neutral-200 overflow-hidden transition-all duration-200 flex flex-col`}
      >
        <div className="w-80 flex flex-col h-full">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-neutral-200">
            <h1 className="text-lg font-semibold text-neutral-800">Barangay Map</h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  gpsStatus === 'ok' ? 'bg-green-600' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-neutral-500">
                {gpsStatus === 'ok'
                  ? `GPS Active${accuracy ? ` · ±${accuracy}m` : ''}`
                  : gpsStatus === 'unsupported'
                  ? 'GPS Unsupported'
                  : 'GPS Signal Weak / Denied'}
              </span>
            </div>
            {userLat !== null && userLng !== null && (
              <p className="text-[11px] text-neutral-400 mt-1">
                {userLat.toFixed(5)}, {userLng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Emergency quick-find */}
          <div className="px-4 py-3 border-b border-neutral-200">
            <p className="text-xs font-medium text-neutral-500 mb-2">Emergency</p>
            <div className="flex gap-2">
              <button
                onClick={() => findNearest('hospital')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                🏥 Hospital
              </button>
              <button
                onClick={() => findNearest('police')}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                🚔 Police
              </button>
              <button
                onClick={() => findNearest('fire')}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                🚒 Fire
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-neutral-200 relative">
            <p className="text-xs font-medium text-neutral-500 mb-2">Search</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search places..."
                className="flex-1 rounded-md px-3 py-1.5 border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/40"
              />
              <button
                onClick={doSearch}
                className="bg-green-700 hover:bg-green-800 text-white rounded-md px-3 text-sm font-medium transition-colors"
              >
                Go
              </button>
            </div>
            {showSearchResults && (
              <div className="absolute left-4 right-4 mt-1 bg-white rounded-md shadow-lg border border-neutral-200 divide-y divide-neutral-100 max-h-64 overflow-y-auto z-20">
                {searchResults.length === 0 ? (
                  <div className="p-2 text-sm text-neutral-500">No results found</div>
                ) : (
                  searchResults.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-neutral-50"
                      onClick={() => selectSearchResult(m.id)}
                    >
                      <span>{m.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-neutral-800">{m.name}</div>
                        <div className="text-xs text-neutral-500">{m.address}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Category filters */}
          <div className="px-4 py-3 border-b border-neutral-200">
            <p className="text-xs font-medium text-neutral-500 mb-2">Filter</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => filterCat(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-green-700 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Nearby list */}
          <div className="px-4 py-3 border-b border-neutral-200 flex-1 min-h-0 overflow-y-auto">
            <p className="text-xs font-medium text-neutral-500 mb-2">Nearby</p>
            <ul className="text-sm divide-y divide-neutral-100">
              {nearbyList.length === 0 ? (
                <li className="py-2 text-neutral-400">No locations found</li>
              ) : (
                nearbyList.map((item) => (
                  <li
                    key={item.id}
                    className="py-2 flex items-center gap-2 cursor-pointer hover:bg-neutral-50 rounded px-1"
                    onClick={() => {
                      mapRef.current?.flyTo({ center: [item.lng, item.lat], zoom: 16 });
                      showToast(`Panned to ${item.name}`);
                    }}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1 text-neutral-700 truncate">{item.name}</span>
                    {item.dist !== null && (
                      <span className="text-xs text-neutral-400 flex-shrink-0">{item.dist.toFixed(1)} km</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Directions panel */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-neutral-500 mb-2">Directions</p>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full text-sm border border-neutral-300 rounded-md px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-green-700/40"
            >
              <option value="">Select destination...</option>
              {CALINAN_PLACES.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={getDirections}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-md py-1.5 text-sm font-medium transition-colors"
              >
                Get Directions
              </button>
              <button
                onClick={clearRoute}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md px-3 text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              onClick={recenterMap}
              className="w-full mt-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md py-1.5 text-sm font-medium transition-colors"
            >
              📍 Recenter
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAP ─── */}
      <div className="relative flex-1 min-h-0" style={{ height: '100vh' }}>
        <div ref={mapContainerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

        {/* Loading / error overlay — this is the part that will
            actually tell you WHY the map looks blank */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm">
            Loading map…
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-700 text-sm px-6 text-center">
            Map failed to load: {mapError}
          </div>
        )}

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-3 left-3 z-10 bg-white shadow-md rounded-md w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-50"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '‹' : '›'}
        </button>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white text-sm px-4 py-2 rounded-full shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}