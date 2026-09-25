import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="terms-page">
      <div className="terms-card">
        <Link href="/" className="terms-home-link">
          <i className="fas fa-home" /> Back to Home
        </Link>

        <h1 className="terms-title">Terms and Conditions</h1>
        <p className="terms-updated">Last updated: [October 2026]</p>

        <section className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By using MyCalinan, you agree to these Terms and Conditions. If
            you do not agree, please do not use the platform.
          </p>
        </section>

        <section className="terms-section">
          <h2>2. Use of the Platform</h2>
          <p>
            MyCalinan provides tourism and community information, including
            listings, maps, announcements, and chatbot assistance (CaliBot).
            Content is provided for general informational purposes only.
          </p>
        </section>

        <section className="terms-section">
          <h2>3. Business Registration and Listings</h2>
          <p>
            Business owners who submit listings are responsible for the
            accuracy of the information and documents they provide.
            MyCalinan reserves the right to approve, reject, or remove any
            listing at its discretion.
          </p>
        </section>

        <section className="terms-section">
          <h2>4. User Accounts</h2>
          <p>
            Users are responsible for keeping their account credentials
            secure and for all activity under their account.
          </p>
        </section>

        <section className="terms-section">
          <h2>5. Limitation of Liability</h2>
          <p>
            MyCalinan is provided &quot;as is&quot; without warranties of any
            kind. We are not liable for any damages arising from the use of
            this platform.
          </p>
        </section>

        <section className="terms-section">
          <h2>6. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of
            the platform after changes means you accept the updated Terms.
          </p>
        </section>

        <section className="terms-section">
          <h2>7. Contact</h2>
          <p>
            For questions about these Terms, contact us at mycalinanadmin@gmail.com.
          </p>
        </section>
      </div>
    </main>
  );
}

