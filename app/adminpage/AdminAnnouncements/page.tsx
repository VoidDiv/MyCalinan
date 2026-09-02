'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * NOTE: This component uses Font Awesome icon classes (fa-*).
 * Add the stylesheet once in app/layout.tsx <head>:
 *   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
 * and set the favicon there as well (rel="icon", href="/image/CALINAN LOGO.png").
 */

/* ── Types ── */
interface Announcement {
  _id: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

interface AnnouncementFormState {
  editId: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

const PUBLIC_API = 'http://localhost:5000/api/announcements';
const ADMIN_API = 'http://localhost:5000/api/admin/announcements';

const EMPTY_FORM: AnnouncementFormState = {
  editId: '',
  title: '',
  date: '',
  category: 'General',
  image: '',
  description: '',
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading');

  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('admin');
  const [isAuthed, setIsAuthed] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM);

  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  /* ── Auth helpers ── */
  function getToken(): string {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('mycalinan_admin_token') ||
      sessionStorage.getItem('mycalinan_admin_token') ||
      ''
    );
  }

  function authHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    };
  }

  function checkAuth(): boolean {
    const token = getToken();
    const authed = !!token;
    setIsAuthed(authed);
    return authed;
  }

  function loadAdminInfo() {
    if (typeof window === 'undefined') return;
    const username =
      localStorage.getItem('mycalinan_admin_username') ||
      sessionStorage.getItem('mycalinan_admin_username') ||
      'Admin';
    const role =
      localStorage.getItem('mycalinan_admin_role') ||
      sessionStorage.getItem('mycalinan_admin_role') ||
      'admin';
    setAdminName(username);
    setAdminRole(role);
  }

  /* ── Toast ── */
  function showToast(message: string, isError = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, isError });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  /* ── Category tag class ── */
  function tagClass(category: string): string {
    const c = (category || '').toLowerCase();
    if (c.includes('event')) return 'tag event';
    if (c.includes('advisory')) return 'tag advisory';
    if (c.includes('program')) return 'tag program';
    if (c.includes('festival')) return 'tag festival';
    return 'tag';
  }

  /* ── Load announcements ── */
  async function loadAnnouncements() {
    try {
      const res = await fetch(PUBLIC_API);
      if (!res.ok) throw new Error(String(res.status));
      const data: Announcement[] = await res.json();
      setAnnouncements(data);
      setLoadState(data.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      console.error('Load announcements error:', err);
      setLoadState('error');
      showToast('Server unreachable', true);
    }
  }

  useEffect(() => {
    loadAdminInfo();
    checkAuth();
    loadAnnouncements();
    const interval = setInterval(loadAnnouncements, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived stats ── */
  const stats = {
    total: loadState === 'ready' || loadState === 'empty' ? announcements.length : null,
    events: announcements.filter((a) => (a.category || '').toLowerCase().includes('event')).length,
    programs: announcements.filter((a) => (a.category || '').toLowerCase().includes('program')).length,
    advisories: announcements.filter((a) => (a.category || '').toLowerCase().includes('advisory')).length,
  };

  /* ── Form show/hide ── */
  function showForm() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function hideForm() {
    setFormOpen(false);
  }

  function updateField<K extends keyof AnnouncementFormState>(key: K, value: AnnouncementFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Save (create or update) ── */
  async function saveAnnouncement() {
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
        showToast(err.error || 'Failed to save announcement.', true);
        return;
      }

      showToast(isEdit ? '✅ Announcement updated!' : '✅ Announcement created!');
      hideForm();
      loadAnnouncements();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Cannot reach server. Check Flask is running.', true);
    }
  }

  /* ── Edit ── */
  function editAnnouncement(id: string) {
    const item = announcements.find((a) => a._id === id);
    if (!item) return;

    setForm({
      editId: id,
      title: item.title || '',
      date: item.date || '',
      category: item.category || 'General',
      image: item.image || '',
      description: item.description || '',
    });
    setFormOpen(true);
  }

  /* ── Delete ── */
  function openDeleteModal(id: string) {
    setDeleteTargetId(id);
  }

  function closeModal() {
    setDeleteTargetId(null);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    closeModal();

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
        showToast(err.error || 'Failed to delete announcement.', true);
        return;
      }

      showToast('🗑️ Announcement deleted.');
      loadAnnouncements();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Cannot reach server. Check Flask is running.', true);
    }
  }

  /* ── Logout ── */
  function confirmLogout() {
    setLogoutOpen(true);
  }

  function closeLogoutModal() {
    setLogoutOpen(false);
  }

  function doLogout() {
    localStorage.removeItem('mycalinan_admin_token');
    localStorage.removeItem('mycalinan_admin_username');
    localStorage.removeItem('mycalinan_admin_role');
    sessionStorage.removeItem('mycalinan_admin_token');
    sessionStorage.removeItem('mycalinan_admin_username');
    sessionStorage.removeItem('mycalinan_admin_role');
    window.location.href = 'Admin-login.html';
  }

  return (
    <>
      <div className="admin-shell">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="logo">
            <h2>MyCalinan</h2>
            <p>Admin Panel</p>
          </div>

          <div className="admin-badge">
            <div className="admin-avatar">{adminName.charAt(0).toUpperCase()}</div>
            <div className="admin-info">
              <div className="name">{adminName}</div>
              <div className="role">{adminRole}</div>
            </div>
          </div>

          <ul className="menu">
            <li>
              <a href="HomePage.html">
                <i className="fas fa-home" /> Home Page
              </a>
            </li>
            <li>
              <a href="Admin-Events.html">
                <i className="fas fa-calendar-alt" /> Events &amp; Festivals
              </a>
            </li>
            <li className="active">
              <a href="Admin-Announcements.html">
                <i className="fas fa-bullhorn" /> Announcements
              </a>
            </li>
            <li>
              <a href="Admin-Reports.html">
                <i className="fas fa-chart-line" /> Reports
              </a>
            </li>
          </ul>

          <div className="sidebar-footer">
            <button className="logout-btn" onClick={confirmLogout}>
              <i className="fas fa-sign-out-alt" /> Log Out
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="content">
          {toast && (
            <div id="toast" style={{ display: 'block', background: toast.isError ? '#c0392b' : '#1a5c38' }}>
              {toast.message}
            </div>
          )}

          {!isAuthed && (
            <div className="auth-warning" style={{ display: 'block' }}>
              <i className="fas fa-exclamation-triangle" /> You are not logged in.{' '}
              <a href="Admin-login.html">Click here to log in</a> — changes will not be saved until you do.
            </div>
          )}

          <div className="header">
            <h1>
              <i className="fas fa-bullhorn" style={{ color: '#1a5c38', marginRight: 8 }} />
              Community Announcements
            </h1>
            <button className="add-btn" onClick={showForm}>
              <i className="fas fa-plus" /> Add Announcement
            </button>
          </div>

          <div className="stats">
            <div className="stat-card">
              <i className="fas fa-bullhorn" />
              <h2>{stats.total === null ? '—' : stats.total}</h2>
              <p>Total Announcements</p>
            </div>
            <div className="stat-card">
              <i className="fas fa-calendar-day" />
              <h2>{stats.total === null ? '—' : stats.events}</h2>
              <p>Events</p>
            </div>
            <div className="stat-card">
              <i className="fas fa-hands-helping" />
              <h2>{stats.total === null ? '—' : stats.programs}</h2>
              <p>Programs</p>
            </div>
            <div className="stat-card">
              <i className="fas fa-exclamation-circle" />
              <h2>{stats.total === null ? '—' : stats.advisories}</h2>
              <p>Advisories</p>
            </div>
          </div>

          {formOpen && (
            <section className="form-section">
              <h2>{form.editId ? 'Edit Announcement' : 'Create Announcement'}</h2>

              <div className="form-grid">
                <div className="input-box">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder="Community Clean-Up Drive"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                </div>
                <div className="input-box">
                  <label>Date</label>
                  <input
                    type="text"
                    placeholder="June 28, 2026"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div className="input-box">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                    <option>General</option>
                    <option>Event</option>
                    <option>Program</option>
                    <option>Advisory</option>
                    <option>Festival</option>
                  </select>
                </div>
                <div className="input-box">
                  <label>Image URL</label>
                  <input
                    type="text"
                    placeholder="image/announcement1.jpg"
                    value={form.image}
                    onChange={(e) => updateField('image', e.target.value)}
                  />
                </div>
                <div className="input-box full">
                  <label>Description *</label>
                  <textarea
                    rows={4}
                    placeholder="Write the announcement details…"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
              </div>

              <div className="btn-row">
                <button className="save-btn" onClick={saveAnnouncement}>
                  <i className="fas fa-save" /> Save Announcement
                </button>
                <button className="save-btn grey" onClick={hideForm}>
                  <i className="fas fa-times" /> Cancel
                </button>
              </div>
            </section>
          )}

          <section className="table-section">
            <h2>Announcement List</h2>
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
                {loadState === 'loading' && (
                  <tr className="table-state">
                    <td colSpan={5}>
                      <i className="fas fa-spinner fa-spin" /> Loading announcements…
                    </td>
                  </tr>
                )}

                {loadState === 'error' && (
                  <tr className="table-state">
                    <td colSpan={5}>⚠️ Cannot connect to server. Make sure Flask is running on port 5000.</td>
                  </tr>
                )}

                {loadState === 'empty' && (
                  <tr className="table-state">
                    <td colSpan={5}>
                      No announcements yet. Click <b>Add Announcement</b> to create one.
                    </td>
                  </tr>
                )}

                {loadState === 'ready' &&
                  announcements.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <b>{item.title || '—'}</b>
                      </td>
                      <td>
                        <span className={tagClass(item.category)}>{item.category || 'General'}</span>
                      </td>
                      <td>{item.date || '—'}</td>
                      <td className="desc-cell">{item.description || '—'}</td>
                      <td>
                        <button className="edit" onClick={() => editAnnouncement(item._id)}>
                          <i className="fas fa-pen" /> Edit
                        </button>
                        <button className="delete" onClick={() => openDeleteModal(item._id)}>
                          <i className="fas fa-trash" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      <div
        className={`modal-overlay${deleteTargetId ? ' open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal-box">
          <i className="fas fa-trash-alt" />
          <h3>Delete Announcement?</h3>
          <p>This action cannot be undone. The announcement will be permanently removed from the database.</p>
          <div className="modal-btns">
            <button className="modal-cancel" onClick={closeModal}>
              Cancel
            </button>
            <button className="modal-confirm" onClick={confirmDelete}>
              Yes, Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── LOGOUT CONFIRM MODAL ── */}
      <div
        className={`modal-overlay${logoutOpen ? ' open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeLogoutModal();
        }}
      >
        <div className="modal-box">
          <i className="fas fa-sign-out-alt" style={{ color: '#1a5c38' }} />
          <h3>Log Out?</h3>
          <p>You will be returned to the login page. Any unsaved changes will be lost.</p>
          <div className="modal-btns">
            <button className="modal-cancel" onClick={closeLogoutModal}>
              Stay
            </button>
            <button className="modal-confirm" style={{ background: '#1a5c38' }} onClick={doLogout}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}