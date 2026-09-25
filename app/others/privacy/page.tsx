import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-card">
        <Link href="/" className="privacy-home-link">
          <i className="fas fa-home" /> Back to Home
        </Link>

        <h1 className="privacy-title">Privacy Notice</h1>
        <p className="privacy-updated">Last updated: [October 2026]</p>

        <section className="privacy-section">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly, such as your name,
            email, phone number, and business documents when you register or
            submit a business listing. We also collect basic account
            information through Firebase Authentication.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. How We Use Your Information</h2>
          <p>
            We use your information to process business listing
            applications, manage your account, respond to inquiries, and
            improve the platform.
          </p>
        </section>

        <section className="privacy-section">
          <h2>3. Document and Image Storage</h2>
          <p>
            Uploaded documents (e.g. Business Permit, DTI/SEC Registration,
            Barangay Clearance) and business pictures are stored securely via
            Firebase Storage and are only accessible to authorized
            administrators for verification purposes.
          </p>
        </section>

        <section className="privacy-section">
          <h2>4. Location and Mapping Data</h2>
          <p>
            If you use the map feature, your device may share location data
            to show nearby places. This is only used to improve your
            experience and is not stored beyond your session unless stated
            otherwise.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Data Sharing</h2>
          <p>
            We do not sell your personal information. Data may be shared
            with barangay officials or administrators solely for listing
            verification and community service purposes.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal information by contacting us.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. Contact</h2>
          <p>For privacy concerns, contact us at [mycalinanadmin@gmail.com].</p>
        </section>
      </div>
    </main>
  );
}
