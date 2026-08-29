"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
interface Hotspot {
  name: string;
  category: string;
  tag: string;
  image: string;
  description: string;
  location: string;
  mapsQuery: string;
}

const hotspots: Hotspot[] = [
  {
    name: "Bamboo Sanctuary",
    category: "Nature Spot",
    tag: "Nature Spot",
    image: "/image/bamboo-sanctuary-and-ecological-park.webp",
    description:
      "A peaceful eco-tourism spot in Calinan, Davao City, known for its relaxing bamboo scenery, fresh air, and calm natural surroundings. Popular for nature walks, scenic photos, and quiet relaxation away from the busy city.",
    location:
      "Sitio Sto. Niño, Barangay Tamayong, Calinan District, Davao City",
    mapsQuery: "Bamboo+Sanctuary+Tamayong+Davao+City",
  },
  {
    name: "Philippine Eagle Center (PEC)",
    category: "Wildlife & Conservation",
    tag: "Wildlife & Conservation",
    image: "/image/PhpEagleCenter.png",
    description:
      "A conservation and education facility in Malagos, Davao City, dedicated to protecting the critically endangered Philippine Eagle. Home to the country's national bird and other wildlife — great for families, nature lovers, and visitors.",
    location: "Purok 5, Malagos-Baguio District, Davao City",
    mapsQuery: "Philippine+Eagle+Center+Malagos+Davao+City",
  },
  {
    name: "Malagos Garden Resort",
    category: "Eco Tourism",
    tag: "Eco Tourism",
    image: "/image/Malagos Garden Resort.jpg",
    description:
      "A 12-hectare eco-tourism destination in Malagos, Davao City, known for its lush gardens, nature attractions, and award-winning Malagos Chocolate. Offers a relaxing and educational experience promoting sustainable tourism.",
    location: "Malagos-Baguio District, Davao City",
    mapsQuery: "Malagos+Garden+Resort+Davao+City",
  },
  {
    name: "Malagos Chocolate Museum",
    category: "Cultural Attraction",
    tag: "Cultural Attraction",
    image: "/image/Malagos Chocolate Museum.jpg",
    description:
      "The first chocolate museum in the Philippines, inside Malagos Garden Resort in Davao City. An interactive attraction showcasing the country's growing cacao industry and the award-winning chocolates of Malagos.",
    location: "Malagos-Baguio District, Davao City",
    mapsQuery: "Malagos+Chocolate+Museum+Davao+City",
  },
  {
    name: "Tamayong Prayer Mountain",
    category: "Spiritual Retreat",
    tag: "Spiritual Retreat",
    image: "/image/Tamayong Prayer Mountain.jpg",
    description:
      "Also known as the Garden of Eden Restored, this private spiritual retreat in Tamayong, Calinan serves as a place for prayer, meditation, worship, and spiritual reflection in a serene highland setting.",
    location: "Tamayong, Calinan District, Davao City",
    mapsQuery: "Tamayong+Prayer+Mountain+Calinan+Davao+City",
  },
  {
    name: "Lantaw Bukid Resort",
    category: "Resort / Leisure",
    tag: "Resort / Leisure",
    image: "/image/Lantaw Bukid Resort.jpg",
    description:
      "A family-friendly inland resort known for its peaceful countryside atmosphere, open green spaces, pools, cottages, and relaxing nature views. A popular budget-friendly getaway for outings, reunions, and weekend swimming.",
    location:
      "Campo Cienco Road, Barangay Los Amigos, Tugbok District, Davao City",
    mapsQuery: "Lantaw+Bukid+Resort+Davao+City",
  },
  {
    name: "Calinan Public Market",
    category: "Local Market",
    tag: "Local Market",
    image: "/image/Calinan Public Market.jpg",
    description:
      "The main marketplace in Calinan where locals and farmers trade fresh produce and daily goods. Known for experiencing local life and buying fresh fruits, vegetables, durian, souvenirs, and local snacks.",
    location: "Calinan District, Davao City",
    mapsQuery: "Calinan+Public+Market+Calinan+Davao+City",
  },
  {
    name: "Calinan Park",
    category: "Community Park",
    tag: "Community Park",
    image: "/image/Calinan Park.png",
    description:
      "A small community park in the heart of Calinan offering a quiet green space where locals can relax, socialize, or take a break. A common meeting spot for commuters, students, and families in the poblacion area.",
    location: "H Quiambao St, Calinan District, Davao City",
    mapsQuery: "Calinan+Park+Calinan+Davao+City",
  },
  {
    name: "Calinan Commercial Center",
    category: "Commercial Hub",
    tag: "Commercial Hub",
    image: "/image/Brows1.png",
    description:
      "A local hub in Calinan where people gather for daily needs, small businesses, and community activities. Reflects the active local life in the district and serves nearby residents and visitors passing through the area.",
    location: "H Quiambao St, Calinan District, Davao City",
    mapsQuery: "Calinan+Commercial+Center+Calinan+Davao+City",
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

export default function HotspotPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const filteredHotspots = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return hotspots.filter((hotspot) => {
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
  }, [searchQuery, activeFilter]);

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

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const openGoogleMaps = (query: string) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

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
          from nature escapes to cultural landmarks.
        </p>
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
      </div>

      {/* RESULT COUNT */}
      <div id="result-count">
        {filteredHotspots.length > 0
          ? `Showing ${filteredHotspots.length} of ${hotspots.length} hotspots`
          : ""}
      </div>

      {/* CARDS */}
      <section className="container" id="cards-container">
        {filteredHotspots.map((hotspot) => (
          <div
            className="card"
            key={`${hotspot.name}-${hotspot.location}`}
          >
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
                  href={`https://www.google.com/maps/search/?api=1&query=${hotspot.mapsQuery}`}
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
            </div>
          </div>
        ))}

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

      {/* TOAST */}
      <div id="toast" className={toast ? "show" : ""}>
        {toast}
      </div>
    </>
  );
}