"use client";

import React, { useState, useMemo } from 'react';
import Link from "next/link";

interface FoodPlace {
  name: string;
  category: string;
  lat: number;
  lng: number;
  tag: string;
  pin: string;
  description: string;
  mapsQuery: string;
  image?: string;
}

const foodPlaces: FoodPlace[] = [
  {
    name: "Penong's Calinan",
    category: "Restaurant",
    lat: 7.1882,
    lng: 125.4542,
    tag: "Restaurant",
    pin: "🍗",
    description:
      "Calinan District — Founded in 2003, Penong's is known for its Chicken Inato and grilled chicken meals.",
    mapsQuery: "Penong's Calinan District Davao City",
    image: "/image/Penong_s Calinan.jpg",
  },
  {
    name: "TAPOK Grill and Seafood Restaurant",
    category: "Eatery",
    lat: 7.1930,
    lng: 125.4510,
    tag: "Eatery",
    pin: "🦐",
    description:
      "Bukidnon Highway, Acacia — Casual dining spot known for grilled seafood and a lively atmosphere.",
    mapsQuery:
      "Tapok Grill and Seafood Restaurant Acacia Calinan Davao City",
    image: "/image/TAPOK Grill and Seafood Restaurant.jpg",
  },
  {
    name: "Station Grill",
    category: "Restaurant",
    lat: 7.1875,
    lng: 125.4530,
    tag: "Restaurant",
    pin: "🍖",
    description:
      "National Highway, Calinan District — Casual Filipino restaurant offering grilled specialties and comfort food.",
    mapsQuery: "Station Grill National Highway Calinan Davao City",
    image: "/image/Station Grill.png",
  },
  {
    name: "Dowens Food & Drinks",
    category: "Eatery",
    lat: 7.1878,
    lng: 125.4545,
    tag: "Eatery",
    pin: "🍽️",
    description:
      "Calinan District — Small local eatery serving affordable meals and refreshments.",
    mapsQuery: "Dowens Food & Drinks Calinan District Davao City",
    image: "/image/DOWENS FOOD & DRINKS.png",
  },
  {
    name: "Kabawan Sa Calinan",
    category: "Eatery",
    lat: 7.1885,
    lng: 125.4522,
    tag: "Eatery",
    pin: "🍲",
    description:
      "Davao–Bukidnon Highway, Calinan Poblacion — Well-known eatery serving hearty local dishes.",
    mapsQuery:
      "Kabawan Sa Calinan Davao-Bukidnon Highway Calinan Davao City",
    image: "/image/Kabawan Sa Calinan.png",
  },
  {
    name: "Laher's Lechon Haus",
    category: "Eatery",
    lat: 7.1880,
    lng: 125.4538,
    tag: "Eatery",
    pin: "🐷",
    description:
      "Villafuerte Street, Calinan Poblacion — Local lechon eatery known for roasted pork.",
    mapsQuery: "Laher's Lechon Haus Villafuerte Street Calinan Davao City",
    image: "/image/Laher_s Lechon Haus.jpg",
  },
  {
    name: "Kwekens Carenderia",
    category: "Eatery",
    lat: 7.1900,
    lng: 125.4543,
    tag: "Eatery",
    pin: "🍱",
    description:
      "Datu Abing Street, Calinan Poblacion — Small carinderia serving affordable lutong-bahay meals.",
    mapsQuery: "Kwekens Carenderia Datu Abing Street Calinan Davao City",
    image: "/image/Kwekens Carenderia.png",
  },
  {
    name: "Onen's Chicken House",
    category: "Eatery",
    lat: 7.1902,
    lng: 125.4544,
    tag: "Eatery",
    pin: "🍗",
    description:
      "Datu Abing Street, Calinan Poblacion — Fried chicken spot offering affordable meals.",
    mapsQuery: "Onen's Chicken House Datu Abing Street Calinan Davao City",
    image: "/image/Onen’s Chicken House.png",
  },
  {
    name: "Kunam Chicken House",
    category: "Eatery",
    lat: 7.1877,
    lng: 125.4540,
    tag: "Eatery",
    pin: "🍗",
    description:
      "Calinan Poblacion — Local fried chicken eatery offering affordable chicken meals.",
    mapsQuery: "Kunam Chicken House Calinan Poblacion Davao City",
    image: "/image/Kunam Chicken House.png",
  },
  {
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1903,
    lng: 125.4543,
    tag: "Eatery",
    pin: "🍗",
    description:
      "Datu Abing St, Calinan District — Local chicken house offering fried chicken and chicken meals.",
    mapsQuery: "Nam Manok Chicken House Datu Abing St Calinan Davao City",
    image: "/image/Nam…Manok Chicken House Branch 1.png",
  },
  {
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1868,
    lng: 125.4535,
    tag: "Eatery",
    pin: "🍗",
    description:
      "Purok 32 Roman Diaz St, Calinan District — Local chicken house offering chicken meals.",
    mapsQuery:
      "Nam Manok Chicken House Purok 32 Roman Diaz St Calinan Davao City",
    image: "/image/Nam…Manok Chicken Branch 2.png",
  },
  {
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1872,
    lng: 125.4548,
    tag: "Eatery",
    pin: "🍗",
    description:
      "Canete Building, Calinan District — Local chicken house offering chicken meals.",
    mapsQuery:
      "Nam Manok Chicken House Canete Building Calinan Davao City",
    image: "/image/Nam…Manok Chicken House Branch 3.png",
  },
  {
    name: "Minute Burger",
    category: "Fast-Food",
    lat: 7.1904,
    lng: 125.4542,
    tag: "Fast-Food",
    pin: "🍔",
    description:
      "Datu Abing St, Calinan District — Affordable burger meals and Buy 1, Take 1 offerings.",
    mapsQuery: "Minute Burger Datu Abing St Calinan Davao City",
    image: "/image/Minute Burger1.png",
  },
  {
    name: "Minute Burger",
    category: "Fast-Food",
    lat: 7.1873,
    lng: 125.4514,
    tag: "Fast-Food",
    pin: "🍔",
    description:
      "Aurora St, Calinan District — Affordable burger meals and Buy 1, Take 1 offerings.",
    mapsQuery: "Minute Burger Aurora St Calinan Davao City",
    image: "/image/Minute Burger2.png",
  },
  {
    name: "Jollibee",
    category: "Fast-Food",
    lat: 7.1872,
    lng: 125.4549,
    tag: "Fast-Food",
    pin: "🍟",
    description:
      "Canete Building, Calinan District — Fast-food branch serving popular Filipino fast-food meals.",
    mapsQuery: "Jollibee Canete Building Calinan Davao City",
    image: "/image/Jollibee.png",
  },
  {
    name: "Kopikuys",
    category: "Cafe",
    lat: 7.1876,
    lng: 125.4536,
    tag: "Café",
    pin: "☕",
    description:
      "Calinan District — Local café offering coffee, drinks, and light meals.",
    mapsQuery: "Kopikuys Calinan Davao City",
    image: "/image/Kopikuys.jpg",
  },
  {
    name: "Hikaru de Cielo Cafe",
    category: "Cafe",
    lat: 7.1950,
    lng: 125.4500,
    tag: "Café",
    pin: "☕",
    description:
      "Purok 21, San Roque, Davao–Bukidnon Hwy — Cozy café-restaurant with a scenic atmosphere.",
    mapsQuery: "Hikaru de Cielo Cafe Calinan Davao City",
    image: "/image/Hikaru de Cielo Cafe.jpg",
  },
  {
    name: "Kapekol Calinan",
    category: "Cafe",
    lat: 7.1878,
    lng: 125.4541,
    tag: "Café",
    pin: "☕",
    description:
      "Calinan Poblacion — Small budget-friendly coffee stall.",
    mapsQuery: "Kapekol Calinan Poblacion Davao City",
    image: "/image/Kapekol.png",
  },
  {
    name: "TeaTuh Cafe",
    category: "Cafe",
    lat: 7.1880,
    lng: 125.4537,
    tag: "Café",
    pin: "🧋",
    description:
      "Villafuerte Street, Calinan Poblacion — Coffee and milk tea shop.",
    mapsQuery: "TeaTuh Cafe Villafuerte Street Calinan Poblacion Davao City",
    image: "/image/TeaTuh Cafe.png",
  },
  {
    name: "Machatuals",
    category: "Cafe",
    lat: 7.1893,
    lng: 125.4562,
    tag: "Café",
    pin: "🍵",
    description:
      "R. Magsaysay St, Calinan — Milk tea and matcha drink shop.",
    mapsQuery: "Machatuals Calinan Poblacion Davao City",
    image: "/image/Machatuals.jpg",
  },
  {
    name: "Rose Bakeshop",
    category: "Bakeshop",
    lat: 7.1884,
    lng: 125.4521,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "Davao–Bukidnon Hwy, Calinan — Bakery offering breads and pastries.",
    mapsQuery: "Rose Bakeshop Davao-Bukidnon Hwy Calinan Davao City",
    image: "/image/Rose Bakeshop1.png",
  },
  {
    name: "Rose Bakeshop",
    category: "Bakeshop",
    lat: 7.1857,
    lng: 125.4578,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "De Lara St, Calinan District — Bakery offering breads and pastries.",
    mapsQuery: "Rose Bakeshop De Lara St Calinan Davao City",
    image: "/image/Rose Bakeshop2.png",
  },
  {
    name: "Panadero Bakeshop",
    category: "Bakeshop",
    lat: 7.1866,
    lng: 125.4530,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "Fausta St, National Highway, Calinan — Bakery offering everyday breads and pastries.",
    mapsQuery: "Panadero Bakeshop Fausta St Calinan Davao City",
    image: "/image/Panadero Bakeshop1.png",
  },
  {
    name: "Panadero Bakeshop",
    category: "Bakeshop",
    lat: 7.1870,
    lng: 125.4533,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "Purok 30, Calinan — Bakery offering everyday breads and pastries.",
    mapsQuery: "Panadero Bakeshop Purok 30 Calinan Davao City",
    image: "/image/Panadero Bakeshop2.png",
  },
  {
    name: "Manolette Bakeshop",
    category: "Bakeshop",
    lat: 7.1881,
    lng: 125.4536,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "Villafuerte St, Calinan District — Local bakery offering bread, cakes, and pastries.",
    mapsQuery: "Manolette Bakeshop Villafuerte St Calinan District Davao City",
    image: "/image/Manolette Bakeshop1.png",
  },
  {
    name: "Manolette Bakeshop",
    category: "Bakeshop",
    lat: 7.1873,
    lng: 125.4514,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "Aurora St, Calinan District — Local bakery offering bread, cakes, and pastries.",
    mapsQuery: "Manolette Bakeshop Aurora Calinan District Davao City",
    image: "/image/Manolette Bakeshop2.jpg",
  },
  {
    name: "Nikka's Breadhaus",
    category: "Bakeshop",
    lat: 7.1869,
    lng: 125.4533,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "H. Garcia St corner Roman Diaz St, Calinan Poblacion — Local bakery.",
    mapsQuery:
      "Nikka's Breadhaus H. Garcia Street Corner Roman Diaz St Calinan Davao City",
    image: "/image/Nikka_s Breadhaus.jpg",
  },
  {
    name: "A&A Breadhaus",
    category: "Bakeshop",
    lat: 7.1882,
    lng: 125.4537,
    tag: "Bakeshop",
    pin: "🍞",
    description:
      "Villafuerte St, Calinan — Local bakery offering breads, cakes, and pastries.",
    mapsQuery: "A&A Breadhaus Villafuerte St Calinan Davao City",
    image: "/image/A&A Breadhaus.jpg",
  },
  {
    name: "Starlett Night Bar",
    category: "Bar",
    lat: 7.1876,
    lng: 125.4540,
    tag: "KTV Bar",
    pin: "🎤",
    description:
      "Calinan District — Casual nightlife spot offering music and social entertainment.",
    mapsQuery: "Starlett Night Bar Calinan Davao City",
    image: "/image/Starlett Night Bar.png",
  },
];

const categories = [
  "All",
  "Restaurant",
  "Eatery",
  "Fast-Food",
  "Cafe",
  "Bakeshop",
  "Bar",
];

function openGoogleMaps(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m away`;
  }

  return `${distance.toFixed(1)} km away`;
}

export default function FoodDiningPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [sortNearest, setSortNearest] = useState(false);

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = foodPlaces.filter((place) => {
      const matchesSearch =
        !query ||
        place.name.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.tag.toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === "All" || place.category === activeCategory;

      return matchesSearch && matchesCategory;
    });

    if (sortNearest && userLocation) {
      result.sort((a, b) => {
        const distanceA = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          a.lat,
          a.lng
        );

        const distanceB = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          b.lat,
          b.lng
        );

        return distanceA - distanceB;
      });
    }

    return result;
  }, [search, activeCategory, sortNearest, userLocation]);

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setLocationLoading(false);
      },
      (error) => {
        let message = "Unable to get your location.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission was denied. Please allow location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Your location is currently unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }

        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search restaurant, cafe..."
              aria-label="Search food places"
              autoComplete="off"
            />
          </div>

          <button type="button" onClick={locateUser} disabled={locationLoading}>
            {locationLoading ? "Locating..." : "📍 Locate Me"}
          </button>
        </div>
      </header>

      <section className="food-hero">
        <h2>Savor the Flavors of Calinan</h2>

        <p>
          Discover restaurants, eateries, cafés, bakeshops, and other food
          places around the Calinan area.
        </p>

        {userLocation && (
          <p className="location-success">📍 Location detected successfully.</p>
        )}

        {locationError && <p className="location-error">⚠️ {locationError}</p>}
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
          disabled={!userLocation}
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
          {filteredPlaces.map((place, index) => {
            const distance = userLocation
              ? calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  place.lat,
                  place.lng
                )
              : null;

            return (
              <article
                className="food-card"
                key={`${place.name}-${place.lat}-${place.lng}-${index}`}
              >
                {place.image ? (
                  <div className="food-card-image">
                    <img
                      src={place.image}
                      alt={place.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="food-card-image food-card-placeholder">
                    {place.pin}
                  </div>
                )}

                <div className="food-card-content">
                  <h3>{place.name}</h3>

                  <p>{place.description}</p>

                  <span className="food-tag">{place.tag}</span>

                  {distance !== null && (
                    <div className="food-distance">
                      📍 {formatDistance(distance)}
                    </div>
                  )}

                  <div className="food-card-actions">
                    <button type="button" onClick={() => openGoogleMaps(place.mapsQuery)}>
                      📍 View on Map
                    </button>

                    <button type="button" onClick={() => openGoogleMaps(place.mapsQuery)}>
                      🧭 Get Directions
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}