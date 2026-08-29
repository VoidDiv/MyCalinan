
"use client";
import React from 'react';
// import './style/Documents.css'; // Make sure to import your CSS file here
import Link from "next/link";

// ----------------------------------------------------------------------
// Data Arrays (Extracted for easier maintenance)
// ----------------------------------------------------------------------
const REQUIREMENTS_DATA: string[] = [
  'Valid ID',
  'Proof of Residency',
  'Community Tax Certificate (Cedula)',
  'Processing fee',
];

const STEPS_DATA: string[] = [
  'Go to your Barangay Hall.',
  'Fill out the request form.',
  'Submit required documents.',
  'Pay the processing fee.',
  'Wait for release of clearance.',
];

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const BarangayClearancePage: React.FC = () => {
  return (
    <div className="barangay-clearance-wrapper">
      {/* HEADER */}
      <header className="doc-header">
         <Link href="/" className="back-btn">
            ← Home
        </Link>
        <h1>Barangay Clearance</h1>
        <p>Guide for requirements, steps, and reminders.</p>
      </header>

      {/* FEATURE IMAGES (SIDE BY SIDE) */}
      <section className="doc-hero-grid">
        <img src="image/Baranggay-Clearance1.png" alt="Barangay Clearance" />
        <img src="image/Baranggay-Clearance2.png" alt="Barangay Office" />
      </section>

      <main className="doc-container">
        {/* ABOUT */}
        <section className="doc-card highlight">
          <h2>About Barangay Clearance</h2>
          <p>
            Barangay Clearance is a document issued by your barangay to certify that you are a resident
            and have no pending issues in the community.
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
            Bring original IDs and correct information. Processing is usually fast, but it depends on
            barangay office hours.
          </p>
        </section>
      </main>
    </div>
  );
};

export default BarangayClearancePage;