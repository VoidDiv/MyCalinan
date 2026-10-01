'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useExploreListings } from '@/hooks/useLiveListings';

// ══════════════════════════════════════════
// MAPBOX ACCESS TOKEN
// ══════════════════════════════════════════
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

mapboxgl.accessToken = MAPBOX_TOKEN;

// Calinan (Proper) is at about 7.1876, 125.4532.
// The old map started at 7.1648 — roughly 2.5 km SOUTH of the town — which is
// why the pins looked like they were in the wrong place.
const CALINAN_CENTER: [number, number] = [125.4532, 7.1876];

// ══════════════════════════════════════════
// PLACES COME FROM THE SAME LISTINGS AS THE EXPLORE PAGES
// (Admin > Listings > Explore). That means a pin sits on exactly the same
// coordinates as that place's "View on Map" button, and anything the admin
// adds, edits or deletes shows up here automatically.
//
// The map starts CLEAN: no place is shown until the visitor clicks one
// (in the Nearby list, a search result, the Directions list, or an
// Emergency button). Then only that one place gets its pin.
// ══════════════════════════════════════════
const SECTIONS = [
  { key: 'healthcare', label: 'Health', icon: '🏥' },
  { key: 'education', label: 'School', icon: '🎓' },
  { key: 'food', label: 'Food', icon: '🍽️' },
  { key: 'hotspots', label: 'Tourist', icon: '🌴' },
  { key: 'community', label: 'Community', icon: '🏛️' },
  { key: 'finance', label: 'Finance', icon: '🏦' },
  { key: 'transport', label: 'Transport', icon: '🚌' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️' },
  { key: 'lifestyle', label: 'Lifestyle', icon: '🏨' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type Category = 'all' | SectionKey;

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  ...(Object.fromEntries(SECTIONS.map((s) => [s.key, s.label])) as Record<SectionKey, string>),
};

interface Place {
  id: string;
  name: string;
  category: SectionKey;
  lat: number;
  lng: number;
  address: string;
  tag: string;
  icon: string;
}

interface PlaceWithDistance extends Place {
  dist: number | null;
}

// The few fields we read from an Explore listing
interface ListingLike {
  docId: string;
  name?: string;
  lat?: number;
  lng?: number;
  tag?: string;
  pin?: string;
  address?: string;
}

function toPlaces(section: (typeof SECTIONS)[number], listings: unknown[]): Place[] {
  return (listings as ListingLike[])
    .filter(
      (l) =>
        l &&
        typeof l.lat === 'number' &&
        typeof l.lng === 'number' &&
        Number.isFinite(l.lat) &&
        Number.isFinite(l.lng) &&
        !(l.lat === 0 && l.lng === 0)
    )
    .map((l) => ({
      id: `${section.key}:${l.docId}`,
      name: l.name ?? 'Unnamed place',
      category: section.key,
      lat: l.lat as number,
      lng: l.lng as number,
      address: l.address ?? '',
      tag: l.tag ?? '',
      icon: l.pin || section.icon,
    }));
}

// Words used to find the nearest hospital / police / fire station in the listings
const EMERGENCY: Record<'hospital' | 'police' | 'fire', { label: string; match: RegExp }> = {
  hospital: { label: 'hospital', match: /hospital|medical center|medical centre/i },
  police: { label: 'police station', match: /police|pnp/i },
  fire: { label: 'fire station', match: /fire|bfp/i },
};

// GPS fixes worse than this (in meters) are ignored once we already have a position
const MAX_ACCEPTED_ACCURACY_M = 150;

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

/* Place pin: a green teardrop with the place's emoji.
   The teardrop is an INNER element — Mapbox positions a marker by writing its own
   `transform` onto the marker element, which would wipe out a rotation set on that
   same element and leave the pin misaligned. Built with textContent so a place name
   or emoji can never inject HTML. */
function createPinElement(icon: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cursor = 'pointer';

  const drop = document.createElement('div');
  drop.style.cssText =
    'background:#2b6b45;color:#fff;font-size:16px;width:36px;height:36px;' +
    'border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;' +
    'align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);' +
    'border:2px solid #fff;';

  const emoji = document.createElement('span');
  emoji.style.transform = 'rotate(45deg)';
  emoji.textContent = icon;

  drop.appendChild(emoji);
  el.appendChild(drop);
  return el;
}

/* "You are here" — the same pulsing blue dot used on the Explore pages
   (styles .user-dot-wrapper / -ring / -inner live in globals.css). */
function createUserDotElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'user-dot-wrapper';
  el.innerHTML = '<div class="user-dot-ring"></div><div class="user-dot-inner"></div>';
  return el;
}

export default function BarangayMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always holds the latest GPS position. Popup buttons and routing read from
  // here, so they never use a stale (null) position captured at map load.
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);

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

  // The ONE place that has been clicked — the only pin on the map
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ══════════════════════════════════════════
  // PLACES (live from the Explore listings)
  // ══════════════════════════════════════════
  const healthcare = useExploreListings('healthcare').listings;
  const education = useExploreListings('education').listings;
  const food = useExploreListings('food').listings;
  const hotspots = useExploreListings('hotspots').listings;
  const community = useExploreListings('community').listings;
  const finance = useExploreListings('finance').listings;
  const transport = useExploreListings('transport').listings;
  const shopping = useExploreListings('shopping').listings;
  const lifestyle = useExploreListings('lifestyle').listings;

  const allPlaces: Place[] = useMemo(() => {
    const bySection: Record<SectionKey, unknown[]> = {
      healthcare, education, food, hotspots, community, finance, transport, shopping, lifestyle,
    };
    return SECTIONS.flatMap((s) => toPlaces(s, bySection[s.key] ?? []));
  }, [healthcare, education, food, hotspots, community, finance, transport, shopping, lifestyle]);

  // Only offer a filter chip for categories that actually have places
  const availableCategories: Category[] = useMemo(
    () => ['all', ...SECTIONS.filter((s) => allPlaces.some((p) => p.category === s.key)).map((s) => s.key)],
    [allPlaces]
  );

  const categoryPlaces: Place[] = useMemo(
    () => (activeCategory === 'all' ? allPlaces : allPlaces.filter((p) => p.category === activeCategory)),
    [allPlaces, activeCategory]
  );

  // ══════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  // ══════════════════════════════════════════
  // DIRECT ROUTE
  // ══════════════════════════════════════════
  const drawRoute = useCallback(
    async (destLat: number, destLng: number, label: string) => {
      const pos = userPosRef.current;
      if (!pos || !mapRef.current) {
        showToast('Waiting for your GPS location...');
        return;
      }

      // overview=full returns the detailed route line (the default is
      // simplified and can cut corners on curvy roads).
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${pos.lng},${pos.lat};${destLng},${destLat}` +
        `?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        const route = data.routes?.[0]?.geometry;
        if (!route || !mapRef.current) {
          showToast('No route found');
          return;
        }

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

        // Fit the view to the route AND both ends (you + the destination pin)
        const bounds = new mapboxgl.LngLatBounds();
        route.coordinates.forEach((c: [number, number]) => bounds.extend(c));
        bounds.extend([pos.lng, pos.lat]);
        bounds.extend([destLng, destLat]);
        mapRef.current.fitBounds(bounds, { padding: 60 });

        showToast(`Route calculated to ${label}`);
      } catch (err) {
        console.error('Routing error:', err);
        showToast('Could not calculate route');
      }
    },
    [showToast]
  );

  // ══════════════════════════════════════════
  // REVEAL A PLACE (the only way a pin appears)
  // ══════════════════════════════════════════
  const revealPlace = useCallback((place: Place, fly = true) => {
    setSelectedPlace(place);
    setSelectedDestinationId(place.id);
    if (fly) mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 16 });
  }, []);

  // ══════════════════════════════════════════
  // YOU-ARE-HERE MARKER
  // ══════════════════════════════════════════
  const placeUserMarker = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([lng, lat]);
      return;
    }

    userMarkerRef.current = new mapboxgl.Marker({ element: createUserDotElement(), anchor: 'center' })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Your Current Location'))
      .addTo(map);
  }, []);

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
      center: CALINAN_CENTER,
      zoom: 14,
      // Compact attribution: Mapbox/OpenStreetMap credit stays (required),
      // but collapses into a small "i" button.
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    let loaded = false;

    map.on('load', () => {
      loaded = true;
      setMapLoaded(true);
      requestAnimationFrame(() => map.resize());

      // Development only: click the map to print exact coordinates in the
      // browser console, for checking the position of a listing.
      if (process.env.NODE_ENV === 'development') {
        map.on('click', (e) => {
          console.log(`lat: ${e.lngLat.lat.toFixed(6)}, lng: ${e.lngLat.lng.toFixed(6)}`);
        });
      }
    });

    // Only a failure BEFORE the map has loaded is fatal. A later error (one tile
    // that couldn't load, a dropped connection) must not cover the whole map.
    map.on('error', (e) => {
      console.error('[Mapbox error]', e?.error?.message || e);
      if (!loaded) setMapError(e?.error?.message || 'Unknown Mapbox error');
    });

    return () => {
      // Forget every marker that belonged to this map, so a remount
      // (hot reload / React Strict Mode) rebuilds them on the NEW map.
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // ══════════════════════════════════════════
  // THE CLICKED PLACE — its pin + popup (nothing else is ever pinned)
  // ══════════════════════════════════════════
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    const place = selectedPlace;
    if (!place) return;

    const popupNode = document.createElement('div');
    popupNode.className = 'place-popup';

    const title = document.createElement('h4');
    title.textContent = `${place.icon} ${place.name}`;
    popupNode.appendChild(title);

    if (place.tag) {
      const tag = document.createElement('div');
      tag.className = 'popup-tag';
      tag.textContent = place.tag;
      popupNode.appendChild(tag);
    }
    if (place.address) {
      const addr = document.createElement('p');
      addr.textContent = place.address;
      popupNode.appendChild(addr);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🧭 Directions';
    btn.style.cssText =
      'margin-top:8px;padding:6px 14px;border:none;border-radius:999px;' +
      'background:#2b6b45;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    btn.onclick = () => drawRoute(place.lat, place.lng, place.name);
    popupNode.appendChild(btn);

    // offset [0,-7]: the rotated teardrop's tip sticks out ~7px below its box,
    // so lift it by 7px to land exactly on the coordinates.
    const marker = new mapboxgl.Marker({
      element: createPinElement(place.icon),
      anchor: 'bottom',
      offset: [0, -7],
    })
      .setLngLat([place.lng, place.lat])
      .setPopup(new mapboxgl.Popup({ offset: 40, maxWidth: '260px' }).setDOMContent(popupNode))
      .addTo(map);

    marker.togglePopup(); // show its details right away — it was just clicked
    selectedMarkerRef.current = marker;
  }, [selectedPlace, mapLoaded, drawRoute]);

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
        const acc = pos.coords.accuracy;

        // Ignore sudden low-quality fixes once we already have a position
        if (acc > MAX_ACCEPTED_ACCURACY_M && userPosRef.current) return;

        userPosRef.current = { lat, lng };
        setUserLat(lat);
        setUserLng(lng);
        setAccuracy(Math.round(acc));
        setGpsStatus('ok');

        placeUserMarker(lat, lng);
      },
      (err) => {
        console.warn(`GPS Error: ${err.message}`);
        setGpsStatus('denied');
      },
      // maximumAge: 0 means it never reuses an old cached position
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [placeUserMarker]);

  // The map may finish loading AFTER the first GPS fix — draw the dot then too
  useEffect(() => {
    const pos = userPosRef.current;
    if (mapLoaded && pos) placeUserMarker(pos.lat, pos.lng);
  }, [mapLoaded, placeUserMarker]);

  // Nudge the map to recalc size when the sidebar toggles or on mount
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 250);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  // ══════════════════════════════════════════
  // NEARBY LIST (derived) — follows the category chips
  // ══════════════════════════════════════════
  const nearbyList: PlaceWithDistance[] = (() => {
    const withDist: PlaceWithDistance[] = categoryPlaces.map((p) => ({
      ...p,
      dist: userLat !== null && userLng !== null ? calculateDistance(userLat, userLng, p.lat, p.lng) : null,
    }));
    if (userLat !== null && userLng !== null) {
      withDist.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    }
    return withDist.slice(0, 5);
  })();

  // ══════════════════════════════════════════
  // RECENTER
  // ══════════════════════════════════════════
  const recenterMap = () => {
    const pos = userPosRef.current;
    if (pos && mapRef.current) {
      mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: 15 });
      showToast('Recentered to your location');
    } else {
      showToast('GPS position not acquired yet');
    }
  };

  // ══════════════════════════════════════════
  // CATEGORY FILTER — only filters the Nearby list; the map stays clean
  // ══════════════════════════════════════════
  const filterCat = (category: Category) => setActiveCategory(category);

  // ══════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════
  const matchPlaces = (query: string) =>
    allPlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.tag.toLowerCase().includes(query) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(query)
    );

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const query = value.toLowerCase().trim();

    if (query.length < 2) {
      setShowSearchResults(false);
      return;
    }

    setSearchResults(matchPlaces(query));
    setShowSearchResults(true);
  };

  // "Go" lists the matches — a place only appears on the map when you click it.
  // (If there is exactly one match, it is opened straight away.)
  const doSearch = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return;

    const matches = matchPlaces(query);
    if (matches.length === 0) {
      setShowSearchResults(false);
      showToast('No locations matched your query');
    } else if (matches.length === 1) {
      setShowSearchResults(false);
      revealPlace(matches[0]);
      showToast(`Showing ${matches[0].name}`);
    } else {
      setSearchResults(matches);
      setShowSearchResults(true);
      showToast(`Found ${matches.length} places — tap one to show it`);
    }
  };

  const selectSearchResult = (id: string) => {
    const place = allPlaces.find((p) => p.id === id);
    setShowSearchResults(false);
    if (place) {
      revealPlace(place);
      showToast(`Showing ${place.name}`);
    }
  };

  // ══════════════════════════════════════════
  // ROUTING — clear and get directions
  // ══════════════════════════════════════════
  const clearMap = useCallback(() => {
    // Back to a clean map: no route and no place pin
    setSelectedPlace(null);
    setSelectedDestinationId('');
    const map = mapRef.current;
    if (map) {
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
    }
    showToast('Map cleared');
  }, [showToast]);

  const getDirections = useCallback(() => {
    if (!userPosRef.current) {
      showToast('Waiting for your GPS location...');
      return;
    }
    if (!selectedDestinationId) {
      showToast('Please select a destination first');
      return;
    }
    const target = allPlaces.find((p) => p.id === selectedDestinationId);
    if (!target) return;

    revealPlace(target, false); // show the destination pin; the route view fits both ends
    drawRoute(target.lat, target.lng, target.name);
  }, [selectedDestinationId, allPlaces, drawRoute, revealPlace, showToast]);

  // ══════════════════════════════════════════
  // EMERGENCY SEARCH
  // Finds the nearest hospital / police / fire station in the listings
  // (matched by name or tag). Uses your GPS position when available.
  // ══════════════════════════════════════════
  const findNearest = (type: keyof typeof EMERGENCY) => {
    const { label, match } = EMERGENCY[type];
    const matches = allPlaces.filter((p) => match.test(p.name) || match.test(p.tag));

    if (matches.length === 0) {
      showToast(`No ${label} listed yet — add it in Admin > Listings`);
      return;
    }

    const pos = userPosRef.current;
    const target = pos
      ? [...matches].sort(
          (a, b) =>
            calculateDistance(pos.lat, pos.lng, a.lat, a.lng) -
            calculateDistance(pos.lat, pos.lng, b.lat, b.lng)
        )[0]
      : matches[0];

    revealPlace(target, false);
    drawRoute(target.lat, target.lng, target.name);
    showToast(`Nearest ${label}: ${target.name}`);
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
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
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
                        <div className="text-xs text-neutral-500">{m.address || m.tag}</div>
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
              {availableCategories.map((cat) => (
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
            <p className="text-xs font-medium text-neutral-500">Nearby</p>
            <p className="text-[11px] text-neutral-400 mb-2">Tap a place to show it on the map.</p>
            <ul className="text-sm divide-y divide-neutral-100">
              {nearbyList.length === 0 ? (
                <li className="py-2 text-neutral-400">No locations found</li>
              ) : (
                nearbyList.map((item) => (
                  <li
                    key={item.id}
                    className={`py-2 flex items-center gap-2 cursor-pointer hover:bg-neutral-50 rounded px-1 ${
                      selectedPlace?.id === item.id ? 'bg-green-50' : ''
                    }`}
                    onClick={() => {
                      revealPlace(item);
                      showToast(`Showing ${item.name}`);
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
              value={selectedDestinationId}
              onChange={(e) => {
                const place = allPlaces.find((p) => p.id === e.target.value);
                if (place) revealPlace(place);
                else {
                  setSelectedDestinationId('');
                  setSelectedPlace(null);
                }
              }}
              className="w-full text-sm border border-neutral-300 rounded-md px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-green-700/40"
            >
              <option value="">Select destination...</option>
              {allPlaces.map((p) => (
                <option key={p.id} value={p.id}>
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
                onClick={clearMap}
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