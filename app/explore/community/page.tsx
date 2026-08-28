"use client";

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';

export default function CommunityPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Dynamic Script Loading para sa Leaflet JS
    const leafletScript = document.createElement('script');
    leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    leafletScript.async = true;
    document.body.appendChild(leafletScript);

    return () => {
      if (document.body.contains(leafletScript)) {
        document.body.removeChild(leafletScript);
      }
    };
  }, []);

  return (
    <>
      {/* CDN External Stylesheets */}
      <link rel="icon" type="image/png" href="/image/CALINAN LOGO.png" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="/style/Community.css" />

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <a href="/HomePage.html" className="back-btn">← Home</a>
          <h1 className="logo">Community</h1>
        </div>
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="Search church, barangay hall, cemetery…" autoComplete="off" />
          </div>
          <button id="locate-btn" title="Find my location">
            <div className="spinner"></div>
            <span className="btn-label">📍 Locate Me</span>
          </button>
        </div>
      </header>

      {/* IMAGE MODAL */}
      <div className="image-modal" id="imageModal">
        <span className="close">&times;</span>
        <img id="modalImg" alt="Photo" />
      </div>

      {/* HERO */}
      <section className="hero">
        <h2>Community Services in Calinan</h2>
        <p>Explore essential public spaces and institutions that serve the Calinan community. Enable location to see distances and get directions.</p>
        <div id="location-status">
          <div className="loc-dot" id="loc-dot"></div>
          <span id="loc-text">Detecting your location…</span>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="toolbar">
        <span className="toolbar-label">Filter:</span>
        <button className="filter-chip active" data-filter="all">All</button>
        <button className="filter-chip" data-filter="Church">Churches</button>
        <button className="filter-chip" data-filter="Cemetery">Cemeteries</button>
        <button className="filter-chip" data-filter="Barangay Hall">Barangay Hall</button>
        <button className="filter-chip" data-filter="District Hall">District Hall</button>
        <button className="sort-btn" id="sort-btn" disabled title="Enable location first">
          📶 Sort by nearest
        </button>
      </div>
      <div id="result-count"></div>

      {/* CARDS */}
      <section className="container" id="cards-container">

        {/* CARD 1 */}
        <div className="card"
             data-name="The Most Sacred Heart of Jesus Parish"
             data-category="Church"
             data-lat="7.1903" data-lng="125.4543"
             data-tag="Church"
             data-pin="⛪"
             data-maps-query="The+Most+Sacred+Heart+of+Jesus+Parish+Datu+Abing+St+Calinan+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/The Most Sacred Heart of Jesus Parish.png" alt="The Most Sacred Heart of Jesus Parish" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=The+Most+Sacred+Heart+of+Jesus+Parish+Datu+Abing+St+Calinan+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">The Most Sacred Heart of Jesus Parish</a></h3>
            <p>Datu Abing St., Calinan — Roman Catholic parish under the Archdiocese of Davao serving as the central place of worship for Calinan's Catholic community, offering daily Masses and full sacraments.</p>
            <span className="tag">Church</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 2 */}
        <div className="card"
             data-name="Calinan Central Adventist Church of Davao Mission"
             data-category="Church"
             data-lat="7.1845" data-lng="125.4505"
             data-tag="Church"
             data-pin="⛪"
             data-maps-query="Calinan+Central+Adventist+Church+of+Davao+Mission+Mc+Arthur+Highway+Calinan+District+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Calinan Central Adventist Church of Davao Mission.png" alt="Calinan Central Adventist Church" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=Calinan+Central+Adventist+Church+of+Davao+Mission+Mc+Arthur+Highway+Calinan+District+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">Calinan Central Adventist Church of Davao Mission</a></h3>
            <p>McArthur Highway, Calinan District — Seventh-day Adventist congregation under the Davao Mission, serving as a community worship center for members in the Davao Region.</p>
            <span className="tag">Church</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 3 */}
        <div className="card"
             data-name="Iglesia Ni Cristo"
             data-category="Church"
             data-lat="7.1858" data-lng="125.4580"
             data-tag="Church"
             data-pin="⛪"
             data-maps-query="Iglesia+Ni+Cristo+Purok+18+De+Lara+Street+Calinan+District+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Iglesia Ni Cristo1.png" alt="Iglesia Ni Cristo" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=Iglesia+Ni+Cristo+Purok+18+De+Lara+Street+Calinan+District+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">Iglesia Ni Cristo</a></h3>
            <p>Purok 18, De Lara St., Calinan District — Local congregation of the international Christian organization headquartered in Quezon City, serving as a place of worship for INC members in the Calinan area.</p>
            <span className="tag">Church</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 4 */}
        <div className="card"
             data-name="The Church of Jesus Christ of Latter-day Saints"
             data-category="Church"
             data-lat="7.1895" data-lng="125.4548"
             data-tag="Church"
             data-pin="⛪"
             data-maps-query="The+Church+of+Jesus+Christ+of+Latter-day+Saints+Lanzona+Subdivision+Calinan+Poblacion+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Iglesia Ni Cristo2.png" alt="The Church of Jesus Christ of Latter-day Saints" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=The+Church+of+Jesus+Christ+of+Latter-day+Saints+Lanzona+Subdivision+Calinan+Poblacion+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">The Church of Jesus Christ of Latter-day Saints</a></h3>
            <p>Lanzona Subd., Calinan Poblacion — Local meetinghouse for the global Latter-day Saint community, offering weekly services and programs emphasizing faith in Jesus Christ and family values.</p>
            <span className="tag">Church</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 5 */}
        <div className="card"
             data-name="International Bible Baptist Church"
             data-category="Church"
             data-lat="7.1883" data-lng="125.4552"
             data-tag="Church"
             data-pin="⛪"
             data-maps-query="International+Bible+Baptist+Church+Guiho+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/International Bible Baptist Church.png" alt="International Bible Baptist Church" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=International+Bible+Baptist+Church+Guiho+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">International Bible Baptist Church</a></h3>
            <p>Guiho Street, Calinan Poblacion — Baptist congregation offering worship services, Bible preaching, prayer meetings, youth fellowship, and outreach programs for the Calinan community.</p>
            <span className="tag">Church</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 6 */}
        <div className="card"
             data-name="Calinan Public Cemetery"
             data-category="Cemetery"
             data-lat="7.1830" data-lng="125.4530"
             data-tag="Public Cemetery"
             data-pin="🪦"
             data-maps-query="Calinan+Public+Cemetery+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Calinan Public Cementery.png" alt="Calinan Public Cemetery" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=Calinan+Public+Cemetery+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">Calinan Public Cemetery</a></h3>
            <p>Calinan Poblacion — Traditional public burial ground serving families and residents of Calinan, providing accessible burial services and long part of the district's history and heritage.</p>
            <span className="tag">Public Cemetery</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 7 */}
        <div className="card"
             data-name="Calinan Private Cemetery"
             data-category="Cemetery"
             data-lat="7.1895" data-lng="125.4565"
             data-tag="Private Cemetery"
             data-pin="🪦"
             data-maps-query="Calinan+Memorial+Park+R.+Magsaysay+Street+Calinan+District+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Calinan Private Cementery.png" alt="Calinan Private Cemetery" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=Calinan+Memorial+Park+R.+Magsaysay+Street+Calinan+District+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">Calinan Private Cemetery</a></h3>
            <p>R. Magsaysay Street, Calinan — Privately managed memorial park offering burial and commemorative services in a landscaped setting, part of Calinan's network of community memorial spaces.</p>
            <span className="tag">Private Cemetery</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 8 */}
        <div className="card"
             data-name="Calinan Poblacion Barangay Hall"
             data-category="Barangay Hall"
             data-lat="7.1873" data-lng="125.4513"
             data-tag="Barangay Hall"
             data-pin="🏛️"
             data-maps-query="Calinan+Poblacion+Barangay+Hall+34+Aurora+Calinan+District+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Calinan Poblacion Barangay Hall.png" alt="Calinan Poblacion Barangay Hall" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=Calinan+Poblacion+Barangay+Hall+34+Aurora+Calinan+District+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">Calinan Poblacion Barangay Hall</a></h3>
            <p>34 Aurora, Calinan Poblacion — Primary local government office providing barangay clearances, certificates of residency, dispute mediation, peace and order coordination, and assistance programs.</p>
            <span className="tag">Barangay Hall</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* CARD 9 */}
        <div className="card"
             data-name="Calinan District Hall"
             data-category="District Hall"
             data-lat="7.1878" data-lng="125.4548"
             data-tag="District Hall"
             data-pin="🏛️"
             data-maps-query="Calinan+District+Hall+H.+Quiambao+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur">
          <div className="card-image"><img src="/image/Calinan District Hall.png" alt="Calinan District Hall" /></div>
          <div className="card-content">
            <h3><a href="https://www.google.com/maps/search/?api=1&query=Calinan+District+Hall+H.+Quiambao+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur" target="_blank" rel="noreferrer">Calinan District Hall</a></h3>
            <p>H. Quiambao Street, Calinan Poblacion — District-level government office managing programs, administrative concerns, infrastructure coordination, and public services for all barangays under Calinan.</p>
            <span className="tag">District Hall</span>
            <div className="dist-badge"><div className="dot"></div><span className="dist-text"></span></div>
            <div className="card-actions">
              <button className="view-map-btn">📍 View on Map</button>
              <button className="route-btn">🧭 Get Directions</button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div id="empty-state" style={{ display: 'none' }}>
          <svg width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="#2b6b45" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <h3>No results found</h3>
          <p>Try a different search term or filter.</p>
        </div>

      </section>

      {/* SPACER */}
      <div id="map-panel-spacer"></div>

      {/* MAP PANEL */}
      <div id="map-panel">
        <div id="map-panel-header">
          <div>
            <div id="map-panel-title">📍 Map</div>
            <div id="map-panel-subtitle"></div>
          </div>
          <div id="map-panel-actions">
            <a id="map-directions-link" href="#" target="_blank" rel="noreferrer">🧭 Open in Google Maps</a>
            <button id="map-panel-close" title="Close map">✕</button>
          </div>
        </div>
        <div id="community-map"></div>
        <div id="route-info">
          <span>🛣️ Road distance: <strong id="route-dist">–</strong></span>
          <span>⏱️ Estimated time: <strong id="route-time">–</strong></span>
        </div>
      </div>

      {/* TOAST */}
      <div id="toast"></div>
    </>
  );
}