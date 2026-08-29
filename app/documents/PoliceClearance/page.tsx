"use client";
import React from 'react';
// import './style/Documents.css'; // Make sure to import your CSS file here
import Link from "next/link";
// ----------------------------------------------------------------------
// Data Arrays (Extracted for easier maintenance)
// ----------------------------------------------------------------------
const REQUIREMENTS_DATA: string[] = [
  'Valid ID',
  'Barangay Clearance',
  'Recent 2x2 picture',
  'Processing fee',
];

const STEPS_DATA: string[] = [
  'Register online or prepare requirements.',
  'Visit the police station.',
  'Submit documents and biometrics.',
  'Pay the fee.',
  'Wait for release.',
];

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const PoliceClearancePage: React.FC = () => {
  return (
    <div className="doc-page police-clearance-wrapper">
      {/* HEADER */}
      <header className="doc-header">
         <Link href="/" className="back-btn">
            ← Home
        </Link>
        <h1>Police Clearance</h1>
        <p>Guide for requirements, steps, and online application.</p>
      </header>

      {/* FEATURE IMAGES (SIDE BY SIDE) */}
      <section className="doc-hero-grid">
        <img src="image/Police-Clearance1.png" alt="Police Clearance" />
        <img src="image/Police-Clearance2.png" alt="Police Clearance Online" />
      </section>

      <main className="doc-container">
        {/* ONLINE APPLICATION */}
        <section className="doc-card highlight">
          <h2>Apply Online</h2>
          <p>You can apply for Police Clearance online using the official PNP system.</p>
          <a
            href="https://pnpclearance.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="apply-btn"
          >
            Apply Now
          </a>
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
            Always bring original IDs. Schedule online to avoid long lines.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PoliceClearancePage;