'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/Firebase';
import useAdminGuard from '@/hooks/useAdminGuard';
import AdminSidebar from '@/components/AdminSidebar';
import ImagePicker from '@/components/ImagePicker';
import { uploadImage } from '@/lib/uploadImage';

/* ── Types ── */
interface Announcement {
  _id: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
  _sort: number;
}

interface AnnouncementFormState {
  editId: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

const CATEGORY_OPTIONS = ['General', 'Event', 'Program', 'Advisory', 'Festival'] as const;

const EMPTY_FORM: AnnouncementFormState = {
  editId: '',
  title: '',
  date: '',
  category: 'General',
  image: '',
  description: '',
};

function tagClass(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('event')) return 'tag event';
  if (c.includes('advisory')) return 'tag advisory';
  if (c.includes('program')) return 'tag program';
  if (c.includes('festival')) return 'tag festival';
  return 'tag';
}

export default function AdminAnnouncementsPage() {
  const { user, ready } = useAdminGuard();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM);

  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Toast ── */
  function showToast(message: string, isError = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, isError });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /* ── Load announcements (Firestore) ── */
  async function loadAnnouncements(showSpinner = true) {
    try {
      if (showSpinner) setLoadState('loading');
      const snapshot = await getDocs(collection(db, 'announcements'));

      const data: Announcement[] = snapshot.docs.map((d) => {
        const v = d.data();
        const created = v.createdAt?.toMillis?.() as number | undefined;
        const parsed = Date.parse(v.date || '');
        return {
          _id: d.id,
          title: v.title || '',
          date: v.date || '',
          category: v.category || 'General',
          image: v.image || '',
          description: v.description || '',
          _sort: created ?? (Number.isNaN(parsed) ? 0 : parsed),
        };
      });

      data.sort((a, b) => b._sort - a._sort);

      setAnnouncements(data);
      setLoadState(data.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      console.error('Load announcements error:', err);
      setLoadState('error');
      showToast('Unable to load announcements from Firestore.', true);
    }
  }

  useEffect(() => {
    if (ready) loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ── Derived stats ── */
  const hasCount = loadState === 'ready' || loadState === 'empty';
  const countBy = (word: string) =>
    announcements.filter((a) => (a.category || '').toLowerCase().includes(word)).length;

  const stats = {
    total: hasCount ? announcements.length : null,
    events: countBy('event'),
    programs: countBy('program'),
    advisories: countBy('advisory'),
  };

  /* ── Form show/hide ── */
  function showForm() {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setFormOpen(true);
  }

  function hideForm() {
    setImageFile(null);
    setFormOpen(false);
  }

  function updateField<K extends keyof AnnouncementFormState>(key: K, value: AnnouncementFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Save (create or update) — Firestore ── */
  async function saveAnnouncement() {
    if (!user) {
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
    setSaving(true);

    try {
      let image = form.image.trim();
      if (imageFile) {
        image = await uploadImage(imageFile, 'announcements');
      }

      const payload = {
        title,
        date: form.date.trim(),
        category: form.category,
        image,
        description,
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'announcements', form.editId), payload);
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      showToast(isEdit ? '✅ Announcement updated!' : '✅ Announcement created!');
      hideForm();
      loadAnnouncements(false);
    } catch (err: any) {
      console.error('Save error:', err);
      if (err?.code === 'permission-denied') {
        showToast('Permission denied. Admin access required.', true);
      } else {
        showToast(err?.message || 'Failed to save announcement.', true);
      }
    } finally {
      setSaving(false);
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
      category:
        CATEGORY_OPTIONS.find((c) => c.toLowerCase() === (item.category || '').toLowerCase()) ||
        'General',
      image: item.image || '',
      description: item.description || '',
    });
    setImageFile(null);
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

    if (!user) {
      showToast('Please log in first.', true);
      return;
    }

    try {
      await deleteDoc(doc(db, 'announcements', id));
      showToast('🗑️ Announcement deleted.');
      loadAnnouncements(false);
    } catch (err: any) {
      console.error('Delete error:', err);
      if (err?.code === 'permission-denied') {
        showToast('Permission denied. Admin access required.', true);
      } else {
        showToast('Failed to delete announcement.', true);
      }
    }
  }

  if (!ready) return null;

  return (
    <>
      <div className="admin-shell">
        <AdminSidebar />

        {/* ── MAIN ── */}
        <main className="content">
          {toast && (
            <div id="toast" style={{ display: 'block', background: toast.isError ? '#c0392b' : '#1a5c38' }}>
              {toast.message}
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
                  <label htmlFor="ann-title">Title *</label>
                  <input
                    id="ann-title"
                    type="text"
                    placeholder="Community Clean-Up Drive"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                </div>
                <div className="input-box">
                  <label htmlFor="ann-date">Date</label>
                  <input
                    id="ann-date"
                    type="text"
                    placeholder="June 28, 2026"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div className="input-box full">
                  <label htmlFor="ann-category">Category</label>
                  <select
                    id="ann-category"
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="input-box full">
                  <label htmlFor="ann-description">Description *</label>
                  <textarea
                    id="ann-description"
                    rows={5}
                    placeholder="Write the announcement details here…"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
                <div className="input-box full">
                  <label>Image</label>
                  <ImagePicker
                    currentImage={form.image}
                    file={imageFile}
                    onFileChange={setImageFile}
                    onClearCurrent={() => updateField('image', '')}
                    onError={(m) => showToast(m, true)}
                  />
                </div>
              </div>

              <div className="btn-row">
                <button className="save-btn" onClick={saveAnnouncement} disabled={saving}>
                  <i className="fas fa-save" /> {saving ? 'Saving…' : 'Save Announcement'}
                </button>
                <button className="save-btn grey" onClick={hideForm} disabled={saving}>
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
                    <td colSpan={5}>⚠️ Unable to load announcements. Check your connection and try again.</td>
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
                      <td>
                        <div className="desc-cell">{item.description || '—'}</div>
                      </td>
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

      <style jsx global>{`
        body {
          font-family: 'Segoe UI', sans-serif;
          background: #f0f4f8;
        }

        .admin-shell {
          display: flex;
          min-height: 100vh;
        }

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
          width: 100%;
          box-sizing: border-box;
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
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

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

        @media (max-width: 768px) {
          .content {
            margin-left: 200px;
            padding: 18px;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 540px) {
          .content {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
}