import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Home,
  CalendarDays,
  Megaphone,
  LineChart,
  LogOut,
  Printer,
  AlertTriangle,
  Layers,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   Config
   ──────────────────────────────────────────────────────────────── */

const ANNOUNCEMENTS_API = 'http://localhost:5000/api/announcements';
const EVENTS_API = 'http://localhost:5000/api/events';
const POLL_INTERVAL_MS = 30000;

const CATEGORIES = ['General', 'Event', 'Program', 'Advisory', 'Festival'] as const;
type Category = (typeof CATEGORIES)[number];

const BAR_COLORS: Record<Category, string> = {
  General: '#6c7a72',
  Event: '#1a56a0',
  Program: '#1f8b3f',
  Advisory: '#d9a300',
  Festival: '#a8256f',
};

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

/* ────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────── */

interface SidebarProps {
  adminName: string;
  adminRole: string;
  onLogoutClick: () => void;
}

const menuItems = [
  { label: 'Dashboard', href: 'Admin-Dashboard.html', icon: Gauge },
  { label: 'Home Page', href: 'HomePage.html', icon: Home },
  { label: 'Events & Festivals', href: 'Admin-Events.html', icon: CalendarDays },
  { label: 'Announcements', href: 'Admin-Announcements.html', icon: Megaphone },
  { label: 'Reports', href: 'Admin-Reports.html', icon: LineChart, active: true },
];

function Sidebar({ adminName, adminRole, onLogoutClick }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>MyCalinan</h2>
        <p>Admin Panel</p>
      </div>

      <div className="admin-badge">
        <div className="admin-avatar">{adminName.charAt(0).toUpperCase() || 'A'}</div>
        <div className="admin-info">
          <div className="name">{adminName}</div>
          <div className="role">{adminRole}</div>
        </div>
      </div>

      <ul className="menu">
        {menuItems.map(({ label, href, icon: Icon, active }) => (
          <li key={label} className={active ? 'active' : ''}>
            <a href={href}>
              <Icon size={16} />
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogoutClick}>
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────
   Breakdown panel (bars)
   ──────────────────────────────────────────────────────────────── */

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
        <div className="panel-state">⚠️ Cannot connect to server.</div>
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

/* ────────────────────────────────────────────────────────────────
   Logout confirm modal
   ──────────────────────────────────────────────────────────────── */

function LogoutModal({
  open,
  onStay,
  onConfirm,
}: {
  open: boolean;
  onStay: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
    >
      <div className="modal-box">
        <LogOut size={32} className="modal-icon" />
        <h3>Log Out?</h3>
        <p>You will be returned to the login page. Any unsaved changes will be lost.</p>
        <div className="modal-actions">
          <button className="btn-stay" onClick={onStay}>
            Stay
          </button>
          <button className="btn-logout" onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────── */

export default function AdminReports() {
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('admin');
  const [authWarning, setAuthWarning] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const [announcements, setAnnouncements] = useState<Posting[]>([]);
  const [events, setEvents] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Read admin identity + auth token from storage on mount
  useEffect(() => {
    const readStored = (key: string) =>
      window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || '';

    const token = readStored('mycalinan_admin_token');
    const username = readStored('mycalinan_admin_username') || 'Admin';
    const role = readStored('mycalinan_admin_role') || 'admin';

    setAdminName(username);
    setAdminRole(role);
    setAuthWarning(!token);
  }, []);

  const loadReport = useCallback(async () => {
    let failed = false;
    let annData: Posting[] = [];
    let evtData: Posting[] = [];

    try {
      const res = await fetch(ANNOUNCEMENTS_API);
      if (!res.ok) throw new Error(String(res.status));
      annData = await res.json();
    } catch (err) {
      console.error('Load announcements error:', err);
      failed = true;
    }

    try {
      const res = await fetch(EVENTS_API);
      if (!res.ok) throw new Error(String(res.status));
      evtData = await res.json();
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
    loadReport();
    const id = setInterval(loadReport, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadReport]);

  const annCounts = tally(announcements);
  const evtCounts = tally(events);
  const advisoryTotal = annCounts.Advisory + evtCounts.Advisory;
  const allTotal = announcements.length + events.length;

  const handleLogout = () => {
    ['mycalinan_admin_token', 'mycalinan_admin_username', 'mycalinan_admin_role'].forEach((key) => {
      window.localStorage?.removeItem(key);
      window.sessionStorage?.removeItem(key);
    });
    window.location.href = '/login';
  };

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

        /* ── Sidebar ── */
        .sidebar {
          width: 240px;
          background: #1a5c38;
          color: #fff;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: fixed;
          top: 0; left: 0;
          z-index: 50;
        }
        .sidebar .logo { padding: 24px 24px 18px; border-bottom: 1px solid rgba(255,255,255,.15); }
        .sidebar .logo h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
        .sidebar .logo p { font-size: .75rem; opacity: .65; margin-top: 2px; }

        .admin-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(255,255,255,.1);
          background: rgba(0,0,0,.12);
        }
        .admin-avatar {
          width: 34px; height: 34px;
          background: rgba(255,255,255,.25);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .9rem; font-weight: 700; flex-shrink: 0;
        }
        .admin-info { min-width: 0; }
        .admin-info .name { font-size: .82rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-info .role { font-size: .7rem; color: rgba(255,255,255,.6); text-transform: capitalize; }

        .sidebar .menu { list-style: none; padding: 16px 0; flex: 1; margin: 0; }
        .sidebar .menu li a {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 24px;
          color: rgba(255,255,255,.82);
          text-decoration: none;
          font-size: .88rem;
          transition: background .2s, color .2s;
        }
        .sidebar .menu li a:hover,
        .sidebar .menu li.active a { background: rgba(255,255,255,.15); color: #fff; }

        .sidebar-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,.1); }
        .logout-btn {
          display: flex; align-items: center; gap: 10px;
          width: 100%;
          padding: 10px 16px;
          background: rgba(231,76,60,.2);
          border: 1px solid rgba(231,76,60,.35);
          color: #ff8f85;
          border-radius: 8px;
          font-size: .85rem; font-weight: 600;
          cursor: pointer;
          transition: background .2s, color .2s;
        }
        .logout-btn:hover { background: rgba(231,76,60,.4); color: #fff; }

        /* ── Main content ── */
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

        .auth-warning {
          background: #fff3cd; border: 1px solid #ffc107;
          border-radius: 10px; padding: 14px 20px; margin-bottom: 22px;
          font-size: .88rem; color: #856404;
          display: flex; align-items: center; gap: 8px;
        }
        .auth-warning a { color: #6b5200; font-weight: 600; }

        /* ── Stats ── */
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

        /* ── Report panels ── */
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

        /* ── Table panel ── */
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

        /* ── Logout modal ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center; z-index: 8000;
        }
        .modal-box {
          background: #fff; border-radius: 14px; padding: 30px 32px;
          max-width: 380px; width: 90%; text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,.18);
        }
        .modal-icon { color: #1a5c38; margin-bottom: 10px; }
        .modal-box h3 { font-size: 1.1rem; font-weight: 700; color: #1a3d28; margin-bottom: 8px; }
        .modal-box p { font-size: .88rem; color: #666; margin-bottom: 22px; }
        .modal-actions { display: flex; gap: 10px; justify-content: center; }
        .modal-actions button {
          padding: 9px 24px; border-radius: 8px; font-size: .88rem; font-weight: 600;
          cursor: pointer; border: none;
        }
        .btn-stay { background: #e8f0ec; color: #333; }
        .btn-logout { background: #1a5c38; color: #fff; }

        @media (max-width: 900px) {
          .panels { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .sidebar { width: 200px; }
          .content { margin-left: 200px; padding: 18px; }
        }
        @media (max-width: 540px) {
          .sidebar { display: none; }
          .content { margin-left: 0; }
        }
        @media print {
          .sidebar, .export-btn, .auth-warning { display: none !important; }
          .content { margin-left: 0; }
        }
      `}</style>

      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        onLogoutClick={() => setLogoutModalOpen(true)}
      />

      <main className="content">
        {authWarning && (
          <div className="auth-warning">
            <AlertTriangle size={16} />
            You are not logged in. <a href="/login">Click here to log in</a>.
          </div>
        )}

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
                  <td colSpan={4}>⚠️ Cannot connect to server. Make sure Flask is running on port 5000.</td>
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

      <LogoutModal
        open={logoutModalOpen}
        onStay={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}


