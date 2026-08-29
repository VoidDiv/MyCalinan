"use client";
import React from 'react';
// import './style/Documents.css'; // Make sure to import your CSS file here
import Link from "next/link";
// ----------------------------------------------------------------------
// Data Arrays (Extracted for easier maintenance)
// ----------------------------------------------------------------------
const REQUIREMENTS_DATA: string[] = [
  'Valid ID',
  'Personal Information (Name, Address, Birthdate)',
  'Income details (if applicable)',
  'Processing fee',
];

const STEPS_DATA: string[] = [
  'Apply online or visit your Barangay/Municipal Hall.',
  'Provide your personal information.',
  'Declare your income (if required).',
  'Pay the corresponding fee.',
  'Receive your Cedula.',
];

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export const CedulaPage: React.FC = () => {
  return (
    <div className="cedula-wrapper">
      {/* HEADER */}
      <header className="doc-header">
         <Link href="/" className="back-btn">
            ← Home
        </Link>
        <h1>Cedula (Community Tax Certificate)</h1>
        <p>Guide for requirements, steps, and online application.</p>
      </header>

      {/* FEATURE IMAGES (SIDE BY SIDE) */}
      <section className="doc-hero-grid">
        <img src="image/Cedula1.png" alt="Cedula Certificate" />
        <img src="image/Cedula2.png" alt="Cedula Application" />
      </section>

      <main className="doc-container">
        {/* ONLINE APPLICATION */}
        <section className="doc-card highlight">
          <h2>Apply Online</h2>
          <p>You can apply for your Cedula (Community Tax Certificate) online through the official Davao City system.</p>
          <a
            href="https://cedula.davaocity.gov.ph/Home/"
            target="_blank"
            rel="noopener noreferrer"
            className="apply-btn"
          >
            Apply Now
          </a>
        </section>

        {/* ABOUT */}
        <section className="doc-card">
          <h2>About Cedula</h2>
          <p>
            A Cedula or Community Tax Certificate (CTC) is a basic identification document
            issued by the local government. It is commonly required for legal transactions,
            permits, and other official purposes.
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
            Cedula is usually required for business permits, notarization, and government transactions.
            Make sure your information is correct before submission.
          </p>
        </section>
      </main>
    </div>
  );
};

export default CedulaPage;