"use client";
import React from 'react';
import Link from "next/link";
// import './style/Documents.css'; // Make sure to import your CSS file here

// ----------------------------------------------------------------------
// Firebase Storage base path (same pattern as Hotspots/Community pages)
// ----------------------------------------------------------------------
const STORAGE_BASE =
  "https://storage.googleapis.com/mycalinan.firebasestorage.app/Documents";

// ----------------------------------------------------------------------
// Data Arrays (Extracted for easier maintenance)
// ----------------------------------------------------------------------
const COMMON_USES_DATA: string[] = [
  'Proof of Residency',
  'Good Moral Character',
  'Business Requirements',
  'School or Job Applications',
];

const REQUIREMENTS_DATA: string[] = [
  'Valid ID',
  'Proof of Residency',
  'Community Tax Certificate (Cedula)',
  'Processing fee',
];

const STEPS_DATA: string[] = [
  'Go to your Barangay Hall.',
  'Request a Barangay Certification.',
  'State your purpose clearly.',
  'Submit required documents.',
  'Pay the processing fee.',
  'Wait for release.',
];

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const BarangayCertificationPage: React.FC = () => {
  return (
    <div className="barangay-certification-wrapper">
      {/* HEADER */}
      <header className="doc-header">
         <Link href="/" className="back-btn">
            ← Home
        </Link>
        <h1>Barangay Certification</h1>
        <p>Guide for requirements, steps, and purpose of certification.</p>
      </header>

      {/* FEATURE IMAGES (SIDE BY SIDE) */}
      <section className="doc-hero-grid">
        <img
          src={`${STORAGE_BASE}/Baranggay-Certification1.png`}
          alt="Barangay Certification"
        />
        <img
          src={`${STORAGE_BASE}/Baranggay-Certification2.png`}
          alt="Barangay Office Certification"
        />
      </section>

      <main className="doc-container">
        {/* ABOUT */}
        <section className="doc-card highlight">
          <h2>About Barangay Certification</h2>
          <p>
            Barangay Certification is a document issued by your barangay to confirm specific
            information such as residency, good moral character, or other requested purposes.
          </p>
        </section>

        {/* COMMON USES */}
        <section className="doc-card">
          <h2>Common Uses</h2>
          <ul>
            {COMMON_USES_DATA.map((use, index) => (
              <li key={index}>{use}</li>
            ))}
          </ul>
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
            Make sure to clearly state the purpose of your certification, as the content
            may vary depending on what you need.
          </p>
        </section>
      </main>
    </div>
  );
};

export default BarangayCertificationPage;