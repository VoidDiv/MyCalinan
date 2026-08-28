import React from 'react';

export default function CommunityPage() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="community-header text-center my-8">
        <h1 className="text-4xl font-bold mb-4">Welcome sa Atong Community!</h1>
        <p className="text-lg opacity-90">
          Usa ka lugar para sa pag-explore, pag-share, ug pag-connect.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 my-8">
        <div className="community-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-2">📢 Announcements</h2>
          <p>
            Welcome sa bag-ong update sa atong website! Mag-explore ta ug magkat-on nga padayon.
          </p>
        </div>

        <div className="community-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-2">💬 Discussions</h2>
          <p>
            Puwede ka diri makipag-storya ug mag-share sa imong mga nadiskobrehan sa tsx ug components.
          </p>
        </div>
      </div>
    </main>
  );
}