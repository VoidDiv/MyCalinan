"use client";


import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";


const POLICE_IMG =
  "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Hotlines%2Fpolice%20station.jpg?alt=media&token=f2fb0480-8dd9-4084-99b7-e95192dfaf99";
const FIRE_IMG =
  "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Hotlines%2Ffire%20station.jpg?alt=media&token=7c776ba1-3bb6-4c99-a891-5c734ba6bf77";


export default function HotlinesPage() {
  // Which photo is currently open in the lightbox, if any.
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null
  );


  return (
    <div className="hotlines-page">
      <header className="hotlines-header">
        <div className="hotlines-header-top">
          <Link href="/" className="hotlines-back-btn">
            Home
          </Link>
          <h1 className="hotlines-title">Daily Emergency Bulletin</h1>
        </div>
        <p className="hotlines-subtitle">
          Calinan District • Davao City • Important Hotlines &amp; Public Safety Contacts
        </p>
      </header>


      <section className="hotlines-container">
        <div className="hotlines-headline">🚨 Emergency Hotlines You Must Know</div>


        <div className="hotlines-columns">
          {/* POLICE */}
          <article className="hotlines-service hotlines-service--police">
            <figure className="hotlines-photo">
              <Image
                src={POLICE_IMG}
                alt="Calinan Police Station No-10 building"
                width={1000}
                height={536}
                sizes="(max-width: 768px) 100vw, 500px"
                className="zoomable-img"
                onClick={() =>
                  setLightbox({
                    src: POLICE_IMG,
                    alt: "Calinan Police Station No-10 building",
                  })
                }
              />
            </figure>
            <div className="hotlines-service-body">
              <h2>Calinan Police Station No-10</h2>
              <p><b>National Emergency: 911</b></p>
              <p><b>Hotline:</b> (082) 295-0119 / 0982-295-0119</p>
              <p>Location: H Quiambao St, Calinan District, Davao City, Davao del Sur</p>
            </div>
          </article>


          {/* FIRE */}
          <article className="hotlines-service hotlines-service--fire">
            <figure className="hotlines-photo">
              <Image
                src={FIRE_IMG}
                alt="Calinan Fire Station with fire trucks"
                width={1000}
                height={750}
                sizes="(max-width: 768px) 100vw, 500px"
                className="zoomable-img"
                onClick={() =>
                  setLightbox({
                    src: FIRE_IMG,
                    alt: "Calinan Fire Station with fire trucks",
                  })
                }
              />
            </figure>
            <div className="hotlines-service-body">
              <h2>Calinan Fire Station</h2>
              <p><b>Hotline: (082) 295 0475 / 0946-925-5888</b></p>
              <p>Location: H Quiambao St, Calinan District, Davao City, Davao del Sur</p>
            </div>
          </article>


          {/* BARANGAY */}
          <article className="hotlines-service hotlines-service--barangay">
            <div className="hotlines-service-body">
              <h2>Calinan Proper Barangay Hall</h2>
              <p><b>Hotline: (082) 295 0191</b></p>
              <p>Location: 34 Aurora, Calinan District, Davao City, Davao del Sur.</p>
            </div>
          </article>


          {/* SAFETY NOTE */}
          <article className="hotlines-service hotlines-service--note">
            <div className="hotlines-service-body">
              <h2>Public Safety Note</h2>
              <p>
                Always stay calm during emergencies. Provide exact location and
                situation when calling hotlines.
              </p>
            </div>
          </article>
        </div>


        <div className="hotlines-footer-note">
          “Preparedness saves lives — Keep emergency numbers accessible at all times.”
        </div>
      </section>


      {/* Lightbox — reuses the site's existing .lightbox-overlay pattern */}
      {lightbox && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >
            &times;
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="lightbox-image"
          />
        </div>
      )}
    </div>
  );
}

