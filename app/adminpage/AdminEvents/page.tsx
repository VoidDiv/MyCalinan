"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Gauge,
  CalendarDays,
  Megaphone,
  LineChart,
  Store,
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

const PUBLIC_API = 'http://localhost:5000/api/events';
const ADMIN_API = 'http://localhost:5000/api/admin/events';
const POLL_INTERVAL_MS = 30000;

const CATEGORY_OPTIONS = ['General', 'Event', 'Program', 'Advisory', 'Festival'] as const;

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
   Auth keys — MUST match what the login page (doc 7) actually writes:
   mycalinan_token / mycalinan_username / mycalinan_role
   ──────────────────────────────────────────────────────────────── */
const TOKEN_KEY = 'mycalinan_token';
const USERNAME_KEY = 'mycalinan_username';
const ROLE_KEY = 'mycalinan_role';

/* ────────────────────────────────────────────────────────────────
   Routes — adjust these three constants if your real paths differ
   ──────────────────────────────────────────────────────────────── */
const ROUTES = {
  home: '/',
  events: '/adminpage/AdminEvents',
  announcements: '/adminpage/AdminAnnouncements',
  reports: '/adminpage/AdminReports',
  login: '/login',
};

/* ────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────── */

const menuItems = [
  { label: 'Dashboard', href: '/adminpage/AdminDashboard', icon: Gauge },
  { label: 'Events & Festivals', href: ROUTES.events, icon: CalendarDays, active: true },
  { label: 'Announcements', href: ROUTES.announcements, icon: Megaphone },
  { label: 'Business Listings', href: '/adminpage/AdminListings', icon: Store },
  { label: 'Reports', href: ROUTES.reports, icon: LineChart },
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
    <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>
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
        <Trash2 size={32} className="modal-icon modal-icon-danger" />
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
        <LogOut size={32} className="modal-icon" />
        <h3>Log Out?</h3>
        <p>You will be returned to the login page. Any unsaved changes will be lost.</p>
        <div className="modal-btns">
          <button className="modal-cancel" onClick={onStay}>Stay</button>
          <button className="modal-confirm" onClick={onConfirm}>Log Out</button>
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
    window.localStorage?.getItem(TOKEN_KEY) ||
    window.sessionStorage?.getItem(TOKEN_KEY) ||
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

    const token = readStored(TOKEN_KEY);
    setAdminName(readStored(USERNAME_KEY) || 'Admin');
    setAdminRole(readStored(ROLE_KEY) || 'admin');
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
          window.location.href = ROUTES.login;
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
          window.location.href = ROUTES.login;
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
    [TOKEN_KEY, USERNAME_KEY, ROLE_KEY].forEach((key) => {
      window.localStorage?.removeItem(key);
      window.sessionStorage?.removeItem(key);
    });
    window.location.href = ROUTES.login;
  };

  return (
    <div className="admin-page">


      <Sidebar adminName={adminName} adminRole={adminRole} onLogoutClick={() => setLogoutModalOpen(true)} />

      <main className="content">
        <Toast toast={toast} />

        {authWarning && (
          <div className="auth-warning">
            <AlertTriangle size={16} />
            You are not logged in. <a href={ROUTES.login}>Click here to log in</a> — changes will not be saved until you do.
          </div>
        )}

        <div className="header">
          <h1>
            <CalendarDays size={20} />
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
            <p>Total Events &amp; Festivals</p>
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
          <div className="table-section-head">
            <h2>Event &amp; Festival List</h2>
            <span className="table-count">{loading ? "—" : `${events.length} total`}</span>
          </div>
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
                    <Loader2 size={16} className="spin" aria-hidden="true" /> Loading events…
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
                              e.currentTarget.classList.add('image-error');
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
                      <button
                        className="edit"
                        onClick={() => openEditForm(item)}
                        type="button"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        className="delete"
                        onClick={() => item._id && openDeleteModal(item._id)}
                        type="button"
                      >
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