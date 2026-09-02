"use client";
import React from 'react';
// import './style/Documents.css'; // Make sure to import your CSS file here
import Link from "next/link";

// ----------------------------------------------------------------------
// Firebase Storage base path (same pattern as Hotspots/Community pages)
// ----------------------------------------------------------------------
const STORAGE_BASE =
  "https://storage.googleapis.com/mycalinan.firebasestorage.app/Documents";

// ----------------------------------------------------------------------
// Data Arrays (Extracted for easier maintenance)
// ----------------------------------------------------------------------
const REQUIREMENTS_DATA: string[] = [
  'Properly filled-out application form',
  'Proof of Identity (Birth Certificate, Passport, etc.)',
  'Proof of Address (Barangay Certificate, Utility Bill, etc.)',
  'Two copies of valid ID (if available)',
  'Processing fee',
];

const STEPS_DATA: string[] = [
  'Get the application form (online or at Post Office).',
  'Fill out the form completely.',
  'Prepare all required documents.',
  'Submit at your nearest Postal Office.',
  'Pay the processing fee.',
  'Wait for delivery or claim your ID at Davao Post Office.',
];

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const PostalIDPage: React.FC = () => {
  return (
    <div className="postal-id-wrapper">
      {/* HEADER */}
      <header className="doc-header">
         <Link href="/" className="back-btn">
            ← Home
        </Link>
        <h1>Postal ID</h1>
        <p>Guide for requirements, steps, and application process.</p>
      </header>

      {/* FEATURE IMAGES (SIDE BY SIDE) */}
      <section className="doc-hero-grid">
        <img
          src={`${STORAGE_BASE}/Postal-ID1.png`}
          alt="Postal ID Card"
        />
        <img
          src={`${STORAGE_BASE}/Postal-ID2.png`}
          alt="Postal ID Application"
        />
      </section>

      <main className="doc-container">
        {/* APPLICATION */}
        <section className="doc-card highlight">
          <h2>Apply for Postal ID</h2>
          <p>
            You can get the application form online or directly from our Post Office in Calinan.
          </p>
          <a
            href="https://www.postalidph.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="apply-btn"
          >
            Visit Official Website
          </a>
        </section>

        {/* ABOUT */}
        <section className="doc-card">
          <h2>About Postal ID</h2>
          <p>
            The Postal ID is a government-issued identification card by the Philippine Postal
            Corporation (PHLPost). It is widely accepted as a valid ID for transactions in banks,
            government offices, and private institutions.
          </p>
        </section>

        {/* REQUIREMENTS */}
        <section className="doc-card">
          <h2>Requirements</h2>
          <ul>
            {REQUIREMENTS_DATA.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        </section>

        {/* STEPS */}
        <section className="doc-card">
          <h2>Steps</h2>
          <ol>
            {STEPS_DATA.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>

        {/* REMINDER */}
        <section className="doc-card">
          <h2>Reminder</h2>
          <p>
            Make sure all information is correct before submission. Processing time may vary depending
            on your location and chosen delivery method.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PostalIDPage;