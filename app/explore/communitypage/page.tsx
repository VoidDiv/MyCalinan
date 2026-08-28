import React from 'react';

export default function CommunityPage() {
  return (
    <div className="community-container">
      {/* HERO SECTION */}
      <section className="community-hero">
        <h2>Calinan Community Hub</h2>
        <p>
          Padayon sa pag-explore sa mga lokal nga nga lugar, balita, ug mga updates sa atong komunidad sa Calinan.
        </p>
      </section>

      {/* TOOLBAR & FILTERS */}
      <div className="community-toolbar">
        <span className="text-xs text-gray-500 font-medium mr-2">Filter:</span>
        <button className="community-chip active">Tanan</button>
        <button className="community-chip">Healthcare</button>
        <button className="community-chip">Pampubliko</button>
        <button className="community-chip">Edukasyon</button>
      </div>

      {/* CARDS GRID */}
      <main className="community-grid">
        {/* CARD 1 */}
        <div className="community-card">
          <div className="community-card-content">
            <span className="community-tag">Healthcare</span>
            <h3 className="text-base font-semibold text-green-900 mt-1">Calinan Health Center</h3>
            <p className="text-xs text-gray-600">
              Panguna nga sentro sa kalusugan nga naghatag og libreng serbisyo alang sa mga residente.
            </p>
            <button className="community-btn">Tan-awon sa Map</button>
          </div>
        </div>

        {/* CARD 2 */}
        <div className="community-card">
          <div className="community-card-content">
            <span className="community-tag">Pampubliko</span>
            <h3 className="text-base font-semibold text-green-900 mt-1">Calinan Public Market</h3>
            <p className="text-xs text-gray-600">
              Ang sentro sa palitanan sa mga preskong prutas, gulay, ug uban pang panginahanglanon.
            </p>
            <button className="community-btn">Tan-awon sa Map</button>
          </div>
        </div>

        {/* CARD 3 */}
        <div className="community-card">
          <div className="community-card-content">
            <span className="community-tag">Edukasyon</span>
            <h3 className="text-base font-semibold text-green-900 mt-1">Calinan National High School</h3>
            <p className="text-xs text-gray-600">
              Sentrong tunghaan alang sa sekundaryang edukasyon sa mga kabataan sa komunidad.
            </p>
            <button className="community-btn">Tan-awon sa Map</button>
          </div>
        </div>
      </main>
    </div>
  );
}