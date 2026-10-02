"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Megaphone,
  LineChart,
  Printer,
  Layers,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/Firebase';
import useAdminGuard from '@/hooks/useAdminGuard';
import AdminSidebar from '@/components/AdminSidebar';
import CategoryBarChart from '@/components/CategoryBarChart';

/* ─────────────────────────────────────────────────────────
   Config
   ───────────────────────────────────────────────────────── */

const CATEGORIES = ['General', 'Event', 'Program', 'Advisory', 'Festival'] as const;
type Category = (typeof CATEGORIES)[number];

const BAR_COLORS: Record<Category, string> = {
  General: '#6c7a72',
  Event: '#1a56a0',
  Program: '#1f8b3f',
  Advisory: '#d9a300',
  Festival: '#a8256f',
};

/* Colors of the two bars in the "Postings by Category" bar chart */
const ANNOUNCEMENT_COLOR = '#1a5c38';
const EVENT_COLOR = '#d99b34';

interface Posting {
  category?: string;
  [key: string]: unknown;
}

type CategoryCounts = Record<Category, number>;

const emptyCounts = (): CategoryCounts => ({
  General: 0,
  Event: 0,
  Program: 0,
  Advisory: 0,
  Festival: 0,
});

function classify(category: string | undefined): Category {
  const c = (category || 'General').toLowerCase();
  const match = CATEGORIES.find((cat) => c.includes(cat.toLowerCase()));
  return match || 'General';
}

function tally(items: Posting[]): CategoryCounts {
  const counts = emptyCounts();
  items.forEach((item) => {
    counts[classify(item.category)]++;
  });
  return counts;
}

const sumCounts = (counts: CategoryCounts) =>
  Object.values(counts).reduce((s, n) => s + n, 0);

/* ─────────────────────────────────────────────────────────
   Breakdown panel (bars)
   ───────────────────────────────────────────────────────── */

function BreakdownPanel({
  title,
  icon: Icon,
  counts,
  total,
  loading,
  error,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  counts: CategoryCounts;
  total: number;
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="panel">
      <h2>
        <Icon size={16} className="panel-heading-icon" />
        {title}
      </h2>

      {loading ? (
        <div className="panel-state">
          <Loader2 size={16} className="spin" /> Loading…
        </div>
      ) : error ? (
        <div className="panel-state">⚠️ Unable to load data.</div>
      ) : total === 0 ? (
        <div className="panel-state">No data yet.</div>
      ) : (
        CATEGORIES.map((cat) => {
          const n = counts[cat];
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div className="bar-row" key={cat}>
              <div className="bar-label">
                <span>{cat}</span>
                <b>{n}</b>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${pct}%`, background: BAR_COLORS[cat] }}
                />
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────── */

export default function AdminReports() {
  const { ready } = useAdminGuard();

  const [announcements, setAnnouncements] = useState<Posting[]>([]);
  const [events, setEvents] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadReport = useCallback(async () => {
    let failed = false;
    let annData: Posting[] = [];
    let evtData: Posting[] = [];

    try {
      const snapshot = await getDocs(collection(db, 'announcements'));
      annData = snapshot.docs.map((d) => d.data() as Posting);
    } catch (err) {
      console.error('Load announcements error:', err);
      failed = true;
    }

    try {
      const snapshot = await getDocs(collection(db, 'events'));
      evtData = snapshot.docs.map((d) => d.data() as Posting);
    } catch (err) {
      console.error('Load events error:', err);
      failed = true;
    }

    setAnnouncements(annData);
    setEvents(evtData);
    setLoadError(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (ready) loadReport();
  }, [ready, loadReport]);

  if (!ready) return null;

  const annCounts = tally(announcements);
  const evtCounts = tally(events);
  const advisoryTotal = annCounts.Advisory + evtCounts.Advisory;
  const allTotal = announcements.length + events.length;

  return (
    <div className="admin-reports-root">
      <style>{`
        .admin-reports-root, .admin-reports-root *, .admin-reports-root *::before, .admin-reports-root *::after {
          box-sizing: border-box;
        }
        .admin-reports-root {
          font-family: 'Segoe UI', sans-serif;
          background: #f0f4f8;
          display: flex;
          min-height: 100vh;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .content { margin-left: 240px; padding: 32px 36px; flex: 1; }

        .header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 6px; flex-wrap: wrap; gap: 12px;
        }
        .header h1 {
          font-size: 1.4rem; color: #1a3d28; font-weight: 700;
          display: flex; align-items: center; gap: 8px; margin: 0;
        }
        .subtitle { font-size: .85rem; color: #778; margin-bottom: 28px; }

        .export-btn {
          background: #1a5c38; color: #fff; border: none;
          padding: 10px 20px; border-radius: 8px;
          font-size: .88rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: background .2s;
        }
        .export-btn:hover { background: #145029; }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 18px; margin-bottom: 28px;
        }
        .stat-card {
          background: #fff; border-radius: 12px; padding: 20px 18px;
          text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,.07);
        }
        .stat-card svg { color: #1a5c38; margin-bottom: 6px; }
        .stat-card h2 { font-size: 1.7rem; font-weight: 700; color: #1a3d28; margin: 0; }
        .stat-card p { font-size: .78rem; color: #777; margin-top: 2px; }

        .chart-panel { margin-bottom: 24px; }
        .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .panel { background: #fff; border-radius: 12px; padding: 26px 28px; box-shadow: 0 2px 10px rgba(0,0,0,.07); }
        .panel h2 {
          font-size: 1rem; font-weight: 700; color: #1a3d28;
          margin: 0 0 18px; padding-bottom: 12px; border-bottom: 2px solid #e8f5ee;
          display: flex; align-items: center; gap: 6px;
        }
        .panel-heading-icon { color: #1a5c38; }

        .bar-row { margin-bottom: 16px; }
        .bar-row:last-child { margin-bottom: 0; }
        .bar-label { display: flex; justify-content: space-between; font-size: .82rem; color: #333; margin-bottom: 6px; }
        .bar-label b { color: #1a3d28; }
        .bar-track { background: #eef4f0; border-radius: 6px; height: 10px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 6px; background: #1a5c38; transition: width .4s ease; }
        .panel-state {
          text-align: center; padding: 30px 10px; color: #888; font-size: .86rem;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }

        .table-section { background: #fff; border-radius: 12px; padding: 26px 28px; box-shadow: 0 2px 10px rgba(0,0,0,.07); }
        .table-section h2 {
          font-size: 1rem; font-weight: 700; color: #1a3d28;
          margin: 0 0 18px; padding-bottom: 12px; border-bottom: 2px solid #e8f5ee;
        }
        table { width: 100%; border-collapse: collapse; font-size: .86rem; }
        thead { background: #f4faf6; }
        th, td { padding: 11px 14px; text-align: left; border-bottom: 1px solid #e8f0ec; vertical-align: top; }
        th { font-weight: 700; color: #1a3d28; font-size: .78rem; text-transform: uppercase; letter-spacing: .4px; }
        tbody tr:hover td { background: #f9fdfb; }
        td.num { text-align: right; font-weight: 600; color: #1a3d28; }
        .table-state td { text-align: center; padding: 40px; color: #888; }
        .total-row { background: #f4faf6; }

        @media (max-width: 900px) {
          .panels { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .content { margin-left: 200px; padding: 18px; }
        }
        @media (max-width: 540px) {
          .content { margin-left: 0; }
        }
        @media print {
          .adm-sidebar, .export-btn { display: none !important; }
          .content { margin-left: 0; }
          .panel, .table-section { box-shadow: none; border: 1px solid #ddd; break-inside: avoid; }
        }
      `}</style>

      <AdminSidebar />

      <main className="content">
        <div className="header">
          <h1>
            <LineChart size={20} color="#1a5c38" />
            Reports
          </h1>
          <button className="export-btn" onClick={() => window.print()}>
            <Printer size={16} />
            Print / Export
          </button>
        </div>
        <p className="subtitle">A category breakdown of everything posted across MyCalinan.</p>

        <div className="stats">
          <div className="stat-card">
            <Layers size={24} />
            <h2>{loading ? '—' : allTotal}</h2>
            <p>Total Postings</p>
          </div>
          <div className="stat-card">
            <Megaphone size={24} />
            <h2>{loading ? '—' : announcements.length}</h2>
            <p>Announcements</p>
          </div>
          <div className="stat-card">
            <CalendarDays size={24} />
            <h2>{loading ? '—' : events.length}</h2>
            <p>Events &amp; Festivals</p>
          </div>
          <div className="stat-card">
            <AlertCircle size={24} />
            <h2>{loading ? '—' : advisoryTotal}</h2>
            <p>Advisories</p>
          </div>
        </div>

        {/* Bar chart: announcements vs events, side by side for each category */}
        <section className="panel chart-panel">
          <h2>
            <Layers size={16} className="panel-heading-icon" />
            Postings by Category
          </h2>

          {loading ? (
            <div className="panel-state">
              <Loader2 size={16} className="spin" /> Loading…
            </div>
          ) : loadError ? (
            <div className="panel-state">⚠️ Unable to load data.</div>
          ) : allTotal === 0 ? (
            <div className="panel-state">No data yet.</div>
          ) : (
            <CategoryBarChart
              categories={CATEGORIES}
              series={[
                {
                  label: 'Announcements',
                  color: ANNOUNCEMENT_COLOR,
                  values: CATEGORIES.map((cat) => annCounts[cat]),
                },
                {
                  label: 'Events & Festivals',
                  color: EVENT_COLOR,
                  values: CATEGORIES.map((cat) => evtCounts[cat]),
                },
              ]}
            />
          )}
        </section>

        <div className="panels">
          <BreakdownPanel
            title="Announcements by Category"
            icon={Megaphone}
            counts={annCounts}
            total={announcements.length}
            loading={loading}
            error={loadError}
          />
          <BreakdownPanel
            title="Events & Festivals by Category"
            icon={CalendarDays}
            counts={evtCounts}
            total={events.length}
            loading={loading}
            error={loadError}
          />
        </div>

        <section className="table-section">
          <h2>Category Summary — All Postings</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Announcements</th>
                <th style={{ textAlign: 'right' }}>Events &amp; Festivals</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="table-state">
                  <td colSpan={4}>
                    <Loader2 size={16} className="spin" /> Loading report…
                  </td>
                </tr>
              ) : loadError ? (
                <tr className="table-state">
                  <td colSpan={4}>⚠️ Unable to load report. Check your connection and try again.</td>
                </tr>
              ) : (
                <>
                  {CATEGORIES.map((cat) => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td className="num">{annCounts[cat]}</td>
                      <td className="num">{evtCounts[cat]}</td>
                      <td className="num">{annCounts[cat] + evtCounts[cat]}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td><b>Total</b></td>
                    <td className="num"><b>{sumCounts(annCounts)}</b></td>
                    <td className="num"><b>{sumCounts(evtCounts)}</b></td>
                    <td className="num"><b>{sumCounts(annCounts) + sumCounts(evtCounts)}</b></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}