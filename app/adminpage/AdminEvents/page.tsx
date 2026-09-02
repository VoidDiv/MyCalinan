import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  CalendarDays,
  Megaphone,
  LineChart,
  LogOut,
  Plus,
  Save,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Drama,
  AlertCircle,
  Loader2,
  CalendarClock,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   Config
   ──────────────────────────────────────────────────────────────── */

/* Public GET lives at /api/events.
   Admin create/update/delete live under /api/admin/events.
   These mirror the Announcements routes — matching Flask routes should
   already exist in app.py for a separate "events" collection. */
const PUBLIC_API = 'http://localhost:5000/api/events';
const ADMIN_API = 'http://localhost:5000/api/admin/events';
const POLL_INTERVAL_MS = 30000;

const CATEGORY_OPTIONS = ['General', 'Event', 'Program', 'Advisory', 'Festival'] as const;
type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

interface EventItem {
  _id?: string;
  title?: string;
  date?: string;
  category?: string;
  image?: string;
  description?: string;
}

interface FormState {
  editId: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

const emptyForm = (): FormState => ({
  editId: '',
  title: '',
  date: '',
  category: 'General',
  image: '',
  description: '',
});

function tagClass(category?: string) {
  const c = (category || '').toLowerCase();
  if (c.includes('event')) return 'tag event';
  if (c.includes('advisory')) return 'tag advisory';
  if (c.includes('program')) return 'tag program';
  if (c.includes('festival')) return 'tag festival';
  return 'tag';
}

/* ────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────── */

const menuItems = [
  { label: 'Home Page', href: 'HomePage.html', icon: Home },
  { label: 'Events & Festivals', href: 'Admin-Events.html', icon: CalendarDays, active: true },
  { label: 'Announcements', href: 'Admin-Announcements.html', icon: Megaphone },
  { label: 'Reports', href: 'Admin-Reports.html', icon: LineChart },
];

function Sidebar({
  adminName,
  adminRole,
  onLogoutClick,
}: {
  adminName: string;
  adminRole: string;
  onLogoutClick: () => void;
}) {
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
   Toast
   ──────────────────────────────────────────────────────────────── */

interface ToastState {
  message: string;
  isError: boolean;
}

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.isError ? '#c0392b' : '#1a5c38' }}>
      {toast.message}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Modals
   ──────────────────────────────────────────────────────────────── */

function DeleteModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className={`modal-overlay ${open ? 'open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-box">
        <Trash2 size={32} color="#e74c3c" />
        <h3>Delete Event?</h3>
        <p>This action cannot be undone. The event will be permanently removed from the database.</p>
        <div className="modal-btns">
          <button className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-confirm" onClick={onConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}

function LogoutModal({
  open,
  onStay,
  onConfirm,
}: {
  open: boolean;
  onStay: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className={`modal-overlay ${open ? 'open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
    >
      <div className="modal-box">
        <LogOut size={32} color="#1a5c38" />
        <h3>Log Out?</h3>
        <p>You will be returned to the login page. Any unsaved changes will be lost.</p>
        <div className="modal-btns">
          <button className="modal-cancel" onClick={onStay}>Stay</button>
          <button className="modal-confirm" style={{ background: '#1a5c38' }} onClick={onConfirm}>Log Out</button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────── */

export default function AdminEvents() {
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('admin');
  const [authWarning, setAuthWarning] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const formRef = useRef<HTMLElement>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formOpenRef = useRef(formOpen);
  formOpenRef.current = formOpen;

  const getToken = () =>
    window.localStorage?.getItem('mycalinan_admin_token') ||
    window.sessionStorage?.getItem('mycalinan_admin_token') ||
    '';

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const showToast = (message: string, isError = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, isError });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // Read admin identity + auth token from storage on mount
  useEffect(() => {
    const readStored = (key: string) =>
      window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || '';

    const token = readStored('mycalinan_admin_token');
    setAdminName(readStored('mycalinan_admin_username') || 'Admin');
    setAdminRole(readStored('mycalinan_admin_role') || 'admin');
    setAuthWarning(!token);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_API);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setEvents(data);
      setLoadError(false);
    } catch (err) {
      console.error('Load events error:', err);
      setLoadError(true);
      showToast('Server unreachable', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const id = setInterval(() => {
      // Skip the periodic refresh while the form is open so it can't wipe
      // out an in-progress create/edit.
      if (!formOpenRef.current) loadEvents();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadEvents]);

  const stats = (() => {
    let eventCount = 0;
    let festivals = 0;
    let advisories = 0;
    events.forEach((item) => {
      const cat = (item.category || '').toLowerCase();
      if (cat.includes('event')) eventCount++;
      if (cat.includes('festival')) festivals++;
      if (cat.includes('advisory')) advisories++;
    });
    return { total: events.length, events: eventCount, festivals, advisories };
  })();

  const openCreateForm = () => {
    setForm(emptyForm());
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const openEditForm = (item: EventItem) => {
    setForm({
      editId: item._id || '',
      title: item.title || '',
      date: item.date || '',
      category: CATEGORY_OPTIONS.find(
        (c) => c.toLowerCase() === (item.category || '').toLowerCase()
      ) || 'General',
      image: item.image || '',
      description: item.description || '',
    });
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const hideForm = () => setFormOpen(false);

  const checkAuth = () => {
    const token = getToken();
    if (!token) {
      setAuthWarning(true);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!checkAuth()) {
      showToast('Please log in first.', true);
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title || !description) {
      showToast('Title and Description are required.', true);
      return;
    }

    const isEdit = form.editId !== '';
    const url = isEdit ? `${ADMIN_API}/${form.editId}` : ADMIN_API;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          date: form.date.trim(),
          category: form.category,
          image: form.image.trim(),
          description,
        }),
      });

      if (res.status === 401) {
        showToast('Session expired. Please log in again.', true);
        setTimeout(() => {
          window.location.href = 'Admin-login.html';
        }, 1500);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to save event.', true);
        return;
      }

      showToast(isEdit ? '✅ Event updated!' : '✅ Event created!');
      hideForm();
      loadEvents();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Cannot reach server. Check Flask is running.', true);
    }
  };

  const openDeleteModal = (id: string) => {
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteId(null);
    setDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    closeDeleteModal();

    if (!checkAuth()) {
      showToast('Please log in first.', true);
      return;
    }

    try {
      const res = await fetch(`${ADMIN_API}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.status === 401) {
        showToast('Session expired. Please log in again.', true);
        setTimeout(() => {
          window.location.href = 'Admin-login.html';
        }, 1500);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to delete event.', true);
        return;
      }

      showToast('🗑️ Event deleted.');
      loadEvents();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Cannot reach server. Check Flask is running.', true);
    }
  };

  const handleLogout = () => {
    ['mycalinan_admin_token', 'mycalinan_admin_username', 'mycalinan_admin_role'].forEach((key) => {
      window.localStorage?.removeItem(key);
      window.sessionStorage?.removeItem(key);
    });
    window.location.href = 'Admin-login.html';
  };

  return (
    <div className="admin-events-root">
      <style>{`
        .admin-events-root, .admin-events-root *, .admin-events-root *::before, .admin-events-root *::after {
          box-sizing: border-box;
        }
        .admin-events-root {
          font-family: 'Segoe UI', sans-serif;
          background: #f0f4f8;
          display: flex;
          min-height: 100vh;
          position: relative;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Sidebar ── */
        .sidebar {
          width: 240px; background: #1a5c38; color: #fff;
          display: flex; flex-direction: column; min-height: 100vh;
          position: fixed; top: 0; left: 0; z-index: 50;
        }
        .sidebar .logo { padding: 24px 24px 18px; border-bottom: 1px solid rgba(255,255,255,.15); }
        .sidebar .logo h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
        .sidebar .logo p { font-size: .75rem; opacity: .65; margin-top: 2px; }

        .admin-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,.1);
          background: rgba(0,0,0,.12);
        }
        .admin-avatar {
          width: 34px; height: 34px; background: rgba(255,255,255,.25);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: .9rem; font-weight: 700; flex-shrink: 0;
        }
        .admin-info { min-width: 0; }
        .admin-info .name { font-size: .82rem; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-info .role { font-size: .7rem; color: rgba(255,255,255,.6); text-transform: capitalize; }

        .sidebar .menu { list-style: none; padding: 16px 0; flex: 1; margin: 0; }
        .sidebar .menu li a {
          display: flex; align-items: center; gap: 12px; padding: 12px 24px;
          color: rgba(255,255,255,.82); text-decoration: none; font-size: .88rem;
          transition: background .2s, color .2s;
        }
        .sidebar .menu li a:hover, .sidebar .menu li.active a { background: rgba(255,255,255,.15); color: #fff; }

        .sidebar-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,.1); }
        .logout-btn {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 16px; background: rgba(231,76,60,.2);
          border: 1px solid rgba(231,76,60,.35); color: #ff8f85;
          border-radius: 8px; font-size: .85rem; font-weight: 600; cursor: pointer;
          transition: background .2s, color .2s;
        }
        .logout-btn:hover { background: rgba(231,76,60,.4); color: #fff; }

        /* ── Main content ── */
        .content { margin-left: 240px; padding: 32px 36px; flex: 1; }

        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .header h1 { font-size: 1.4rem; color: #1a3d28; font-weight: 700; display: flex; align-items: center; gap: 8px; margin: 0; }

        .add-btn {
          background: #1a5c38; color: #fff; border: none; padding: 10px 20px;
          border-radius: 8px; font-size: .88rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 8px; transition: background .2s;
        }
        .add-btn:hover { background: #145029; }

        /* ── Stats ── */
        .stats {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 18px; margin-bottom: 28px;
        }
        .stat-card { background: #fff; border-radius: 12px; padding: 20px 18px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,.07); }
        .stat-card svg { color: #1a5c38; margin-bottom: 6px; }
        .stat-card h2 { font-size: 1.7rem; font-weight: 700; color: #1a3d28; margin: 0; }
        .stat-card p { font-size: .78rem; color: #777; margin-top: 2px; }

        /* ── Auth warning ── */
        .auth-warning {
          background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px;
          padding: 14px 20px; margin-bottom: 22px; font-size: .88rem; color: #856404;
          display: flex; align-items: center; gap: 8px;
        }
        .auth-warning a { color: #6b5200; font-weight: 600; }

        /* ── Form section ── */
        .form-section, .table-section {
          background: #fff; border-radius: 12px; padding: 26px 28px;
          box-shadow: 0 2px 10px rgba(0,0,0,.07); margin-bottom: 28px;
        }
        .form-section h2, .table-section h2 {
          font-size: 1rem; font-weight: 700; color: #1a3d28;
          margin: 0 0 18px; padding-bottom: 12px; border-bottom: 2px solid #e8f5ee;
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .input-box { display: flex; flex-direction: column; gap: 5px; }
        .input-box.full { grid-column: 1 / -1; }
        .input-box label { font-size: .8rem; font-weight: 600; color: #444; }
        .input-box input, .input-box select, .input-box textarea {
          padding: 9px 13px; border: 1.5px solid #dce8e0; border-radius: 8px;
          font-size: .88rem; color: #2c3e50; outline: none; transition: border .2s;
          font-family: inherit; width: 100%;
        }
        .input-box input:focus, .input-box select:focus, .input-box textarea:focus { border-color: #1a5c38; }
        .input-box textarea { resize: vertical; }

        .btn-row { display: flex; gap: 12px; margin-top: 14px; }
        .save-btn {
          background: #1a5c38; color: #fff; border: none; padding: 10px 24px;
          border-radius: 8px; font-size: .88rem; font-weight: 600; cursor: pointer;
          transition: background .2s; display: flex; align-items: center; gap: 8px;
        }
        .save-btn:hover { background: #145029; }
        .save-btn.grey { background: #888; }
        .save-btn.grey:hover { background: #666; }

        /* ── Toast ── */
        .toast {
          position: fixed; top: 20px; right: 24px; background: #1a5c38; color: #fff;
          padding: 12px 22px; border-radius: 8px; font-size: .88rem; font-weight: 600;
          box-shadow: 0 4px 14px rgba(0,0,0,.2); z-index: 9999; animation: slideIn .25s ease;
        }
        @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* ── Modals ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: none; align-items: center; justify-content: center; z-index: 8000;
        }
        .modal-overlay.open { display: flex; }
        .modal-box {
          background: #fff; border-radius: 14px; padding: 30px 32px;
          max-width: 380px; width: 90%; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.18);
        }
        .modal-box svg { margin-bottom: 10px; }
        .modal-box h3 { font-size: 1.1rem; font-weight: 700; color: #1a3d28; margin-bottom: 8px; }
        .modal-box p { font-size: .88rem; color: #666; margin-bottom: 22px; }
        .modal-btns { display: flex; gap: 10px; justify-content: center; }
        .modal-btns button {
          padding: 9px 24px; border-radius: 8px; font-size: .88rem; font-weight: 600;
          cursor: pointer; border: none; transition: opacity .2s;
        }
        .modal-btns button:hover { opacity: .85; }
        .modal-confirm { background: #e74c3c; color: #fff; }
        .modal-cancel { background: #e8f0ec; color: #333; }

        /* ── Table ── */
        table { width: 100%; border-collapse: collapse; font-size: .86rem; }
        thead { background: #f4faf6; }
        th, td { padding: 11px 14px; text-align: left; border-bottom: 1px solid #e8f0ec; vertical-align: top; }
        th { font-weight: 700; color: #1a3d28; font-size: .78rem; text-transform: uppercase; letter-spacing: .4px; }
        tbody tr:hover td { background: #f9fdfb; }

        .desc-cell {
          max-width: 320px; color: #666; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        .title-cell { display: flex; align-items: center; gap: 10px; }
        .title-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #e8f0ec; }

        .tag { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: .75rem; font-weight: 700; background: #e8f5ee; color: #1a5c38; }
        .tag.event { background: #e3f0ff; color: #1a56a0; }
        .tag.advisory { background: #fff3cd; color: #856404; }
        .tag.program { background: #d4edda; color: #155724; }
        .tag.festival { background: #fde8f5; color: #8b1a6b; }

        td button {
          padding: 5px 12px; border-radius: 6px; font-size: .78rem; font-weight: 600;
          cursor: pointer; border: none; margin-right: 5px; transition: opacity .2s;
          display: inline-flex; align-items: center; gap: 5px;
        }
        td button:hover { opacity: .8; }
        td button.edit { background: #d4edda; color: #155724; }
        td button.delete { background: #f8d7da; color: #721c24; }

        .table-state td { text-align: center; padding: 40px; color: #888; }

        @media (max-width: 768px) {
          .sidebar { width: 200px; }
          .content { margin-left: 200px; padding: 18px; }
          .form-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 540px) {
          .sidebar { display: none; }
          .content { margin-left: 0; }
        }
      `}</style>

      <Sidebar adminName={adminName} adminRole={adminRole} onLogoutClick={() => setLogoutModalOpen(true)} />

      <main className="content">
        <Toast toast={toast} />

        {authWarning && (
          <div className="auth-warning">
            <AlertTriangle size={16} />
            You are not logged in. <a href="Admin-login.html">Click here to log in</a> — changes will not be saved until you do.
          </div>
        )}

        <div className="header">
          <h1>
            <CalendarDays size={20} color="#1a5c38" />
            Events &amp; Festivals
          </h1>
          <button className="add-btn" onClick={openCreateForm}>
            <Plus size={16} />
            Add Event / Festival
          </button>
        </div>

        <div className="stats">
          <div className="stat-card">
            <CalendarDays size={24} />
            <h2>{loading ? '—' : stats.total}</h2>
            <p>Total Listings</p>
          </div>
          <div className="stat-card">
            <CalendarClock size={24} />
            <h2>{loading ? '—' : stats.events}</h2>
            <p>Events</p>
          </div>
          <div className="stat-card">
            <Drama size={24} />
            <h2>{loading ? '—' : stats.festivals}</h2>
            <p>Festivals</p>
          </div>
          <div className="stat-card">
            <AlertCircle size={24} />
            <h2>{loading ? '—' : stats.advisories}</h2>
            <p>Advisories</p>
          </div>
        </div>

        {formOpen && (
          <section className="form-section" ref={formRef}>
            <h2>{form.editId ? 'Edit Event / Festival' : 'Create Event / Festival'}</h2>

            <div className="form-grid">
              <div className="input-box">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="Calinan Foundation Day Festival"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="input-box">
                <label>Date</label>
                <input
                  type="text"
                  placeholder="June 28, 2026"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="input-box">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="input-box">
                <label>Image URL</label>
                <input
                  type="text"
                  placeholder="image/event1.jpg"
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                />
              </div>
              <div className="input-box full">
                <label>Description *</label>
                <textarea
                  rows={4}
                  placeholder="Write the event or festival details…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="btn-row">
              <button className="save-btn" onClick={handleSave}>
                <Save size={16} />
                Save Event
              </button>
              <button className="save-btn grey" onClick={hideForm}>
                <X size={16} />
                Cancel
              </button>
            </div>
          </section>
        )}

        <section className="table-section">
          <h2>Event &amp; Festival List</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="table-state">
                  <td colSpan={5}>
                    <Loader2 size={16} className="spin" /> Loading events…
                  </td>
                </tr>
              ) : loadError ? (
                <tr className="table-state">
                  <td colSpan={5}>⚠️ Cannot connect to server. Make sure Flask is running on port 5000.</td>
                </tr>
              ) : events.length === 0 ? (
                <tr className="table-state">
                  <td colSpan={5}>
                    No events yet. Click <b>Add Event / Festival</b> to create one.
                  </td>
                </tr>
              ) : (
                events.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="title-cell">
                        {item.image && (
                          <img
                            className="title-thumb"
                            src={item.image}
                            alt=""
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <b>{item.title || '—'}</b>
                      </div>
                    </td>
                    <td>
                      <span className={tagClass(item.category)}>{item.category || 'General'}</span>
                    </td>
                    <td>{item.date || '—'}</td>
                    <td className="desc-cell">{item.description || '—'}</td>
                    <td>
                      <button className="edit" onClick={() => openEditForm(item)}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button className="delete" onClick={() => item._id && openDeleteModal(item._id)}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      <DeleteModal open={deleteModalOpen} onCancel={closeDeleteModal} onConfirm={handleConfirmDelete} />
      <LogoutModal open={logoutModalOpen} onStay={() => setLogoutModalOpen(false)} onConfirm={handleLogout} />
    </div>
  );
}


