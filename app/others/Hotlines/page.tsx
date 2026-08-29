import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Emergency Hotlines | Calinan District",
  description:
    "Daily Emergency Bulletin — important hotlines and public safety contacts for Calinan District, Davao City.",
};

export default function HotlinesPage() {
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
          <div className="hotlines-column">
            <h2>Calinan Police Station No-10</h2>
            <p><b>National Emergency: 911</b></p>
            <p><b>Hotline:</b> (082) 295-0119 / 0982-295-0119</p>
            <p>Location: H Quiambao St, Calinan District, Davao City, Davao del Sur</p>

            <hr />

            <h2>Calinan Fire Station</h2>
            <p><b>Hotline: (082) 295 0475 / 0946-925-5888</b></p>
            <p>Location: H Quiambao St, Calinan District, Davao City, Davao del Sur</p>
          </div>

          <div className="hotlines-column">
            <h2>Calinan Proper Barangay Hall</h2>
            <p><b>Hotline: (082) 295 0191</b></p>
            <p>Location: 34 Aurora, Calinan District, Davao City, Davao del Sur.</p>

            <hr />

            <h2>Public Safety Note</h2>
            <p>
              Always stay calm during emergencies. Provide exact location and
              situation when calling hotlines.
            </p>
          </div>
        </div>

        <div className="hotlines-footer-note">
          “Preparedness saves lives — Keep emergency numbers accessible at all times.”
        </div>
      </section>
    </div>
  );
}