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

      <style jsx global>{`
        * ,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Segoe UI', sans-serif;
          background: #f0f4f8;
        }

        .admin-shell {
          display: flex;
          min-height: 100vh;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 240px;
          background: #1a5c38;
          color: #fff;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
        }

        .sidebar .logo {
          padding: 24px 24px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .sidebar .logo h2 {
          font-size: 1.2rem;
          font-weight: 700;
        }
        .sidebar .logo p {
          font-size: 0.75rem;
          opacity: 0.65;
          margin-top: 2px;
        }

        .admin-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.12);
        }

        .admin-avatar {
          width: 34px;
          height: 34px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .admin-info {
          min-width: 0;
        }
        .admin-info .name {
          font-size: 0.82rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-info .role {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: capitalize;
        }

        .sidebar .menu {
          list-style: none;
          padding: 16px 0;
          flex: 1;
        }

        .sidebar .menu li a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          color: rgba(255, 255, 255, 0.82);
          text-decoration: none;
          font-size: 0.88rem;
          transition: background 0.2s, color 0.2s;
        }

        .sidebar .menu li a:hover,
        .sidebar .menu li.active a {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .sidebar .menu li a i {
          width: 16px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          background: rgba(231, 76, 60, 0.2);
          border: 1px solid rgba(231, 76, 60, 0.35);
          color: #ff8f85;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }

        .logout-btn:hover {
          background: rgba(231, 76, 60, 0.4);
          color: #fff;
        }

        /* ── Main content ── */
        .content {
          margin-left: 240px;
          padding: 32px 36px;
          flex: 1;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .header h1 {
          font-size: 1.4rem;
          color: #1a3d28;
          font-weight: 700;
        }

        .add-btn {
          background: #1a5c38;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .add-btn:hover {
          background: #145029;
        }

        /* ── Stats ── */
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 18px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px 18px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
        }

        .stat-card i {
          font-size: 1.5rem;
          color: #1a5c38;
          margin-bottom: 6px;
          display: block;
        }
        .stat-card h2 {
          font-size: 1.7rem;
          font-weight: 700;
          color: #1a3d28;
        }
        .stat-card p {
          font-size: 0.78rem;
          color: #777;
          margin-top: 2px;
        }

        /* ── Auth warning ── */
        .auth-warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 10px;
          padding: 14px 20px;
          margin-bottom: 22px;
          font-size: 0.88rem;
          color: #856404;
        }

        /* ── Form section ── */
        .form-section,
        .table-section {
          background: #fff;
          border-radius: 12px;
          padding: 26px 28px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
          margin-bottom: 28px;
        }

        .form-section h2,
        .table-section h2 {
          font-size: 1rem;
          font-weight: 700;
          color: #1a3d28;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e8f5ee;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .input-box {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .input-box.full {
          grid-column: 1 / -1;
        }

        .input-box label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #444;
        }

        .input-box input,
        .input-box select,
        .input-box textarea {
          padding: 9px 13px;
          border: 1.5px solid #dce8e0;
          border-radius: 8px;
          font-size: 0.88rem;
          color: #2c3e50;
          outline: none;
          transition: border 0.2s;
          font-family: inherit;
        }

        .input-box input:focus,
        .input-box select:focus,
        .input-box textarea:focus {
          border-color: #1a5c38;
        }

        .input-box textarea {
          resize: vertical;
        }

        .btn-row {
          display: flex;
          gap: 12px;
          margin-top: 14px;
        }

        .save-btn {
          background: #1a5c38;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-btn:hover {
          background: #145029;
        }
        .save-btn.grey {
          background: #888;
        }
        .save-btn.grey:hover {
          background: #666;
        }

        /* ── Toast ── */
        #toast {
          position: fixed;
          top: 20px;
          right: 24px;
          color: #fff;
          padding: 12px 22px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
          z-index: 9999;
          animation: slideIn 0.25s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(60px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* ── Confirm modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 8000;
        }

        .modal-overlay.open {
          display: flex;
        }

        .modal-box {
          background: #fff;
          border-radius: 14px;
          padding: 30px 32px;
          max-width: 380px;
          width: 90%;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        }

        .modal-box i {
          font-size: 2rem;
          color: #e74c3c;
          margin-bottom: 10px;
        }
        .modal-box h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a3d28;
          margin-bottom: 8px;
        }
        .modal-box p {
          font-size: 0.88rem;
          color: #666;
          margin-bottom: 22px;
        }

        .modal-btns {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .modal-btns button {
          padding: 9px 24px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.2s;
        }

        .modal-btns button:hover {
          opacity: 0.85;
        }
        .modal-confirm {
          background: #e74c3c;
          color: #fff;
        }
        .modal-cancel {
          background: #e8f0ec;
          color: #333;
        }

        /* ── Table ── */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
        }

        thead {
          background: #f4faf6;
        }

        th,
        td {
          padding: 11px 14px;
          text-align: left;
          border-bottom: 1px solid #e8f0ec;
          vertical-align: top;
        }

        th {
          font-weight: 700;
          color: #1a3d28;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        tr:hover td {
          background: #f9fdfb;
        }

        .desc-cell {
          max-width: 320px;
          color: #666;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tag {
          display: inline-block;
          padding: 3px 11px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          background: #e8f5ee;
          color: #1a5c38;
        }

        .tag.event {
          background: #e3f0ff;
          color: #1a56a0;
        }
        .tag.advisory {
          background: #fff3cd;
          color: #856404;
        }
        .tag.program {
          background: #d4edda;
          color: #155724;
        }
        .tag.festival {
          background: #fde8f5;
          color: #8b1a6b;
        }

        td button {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          margin-right: 5px;
          transition: opacity 0.2s;
        }

        td button:hover {
          opacity: 0.8;
        }
        td button.edit {
          background: #d4edda;
          color: #155724;
        }
        td button.delete {
          background: #f8d7da;
          color: #721c24;
        }

        .table-state td {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .sidebar {
            width: 200px;
          }
          .content {
            margin-left: 200px;
            padding: 18px;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 540px) {
          .sidebar {
            display: none;
          }
          .content {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
}