import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Home,
  CalendarDays,
  Megaphone,
  LineChart,
  Store,
  LogOut,
  Check,
  X,
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Loader2,
  Search,
  Phone,
  MapPin,
  Mail,
  User,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   Config
   ──────────────────────────────────────────────────────────────── */

/* Public/admin GET of every submitted listing lives under /api/admin/listings
   (admins need to see pending + denied ones too, not just approved).
   Status changes (approve/deny) and delete live under the same resource. */
const ADMIN_API = 'http://localhost:5000/api/admin/listings';
const POLL_INTERVAL_MS = 30000;

type ListingStatus = 'pending' | 'approved' | 'denied';

const STATUS_FILTERS: { key: 'all' | ListingStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'denied', label: 'Denied' },
];

interface Listing {
  _id?: string;
  businessName?: string;
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  category?: string;
  address?: string;
  description?: string;
  image?: string;
  status?: ListingStatus;
  submittedAt?: string;
  denyReason?: string;
}

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

function statusMeta(status?: ListingStatus) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', className: 'badge approved', icon: CheckCircle2 };
    case 'denied':
      return { label: 'Denied', className: 'badge denied', icon: XCircle };
    default:
      return { label: 'Pending', className: 'badge pending', icon: Clock };
  }
}

/* ────────────────────────────────────────────────────────────────
   Sidebar
   ──────────────────────────────────────────────────────────────── */

const menuItems = [
  { label: 'Home Page', href: 'HomePage.html', icon: Home },
  { label: 'Events & Festivals', href: 'Admin-Events.html', icon: CalendarDays },
  { label: 'Announcements', href: 'Admin-Announcements.html', icon: Megaphone },
  { label: 'Business Listings', href: 'Admin-Listings.html', icon: Store, active: true },
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
        <h3>Remove Listing?</h3>
        <p>This action cannot be undone. The business listing will be permanently removed from the database.</p>
        <div className="modal-btns">
          <button className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-confirm" onClick={onConfirm}>Yes, Remove</button>
        </div>
      </div>
    </div>
  );
}

function DenyModal({
  open,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
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
        <XCircle size={32} color="#c0392b" />
        <h3>Deny Listing?</h3>
        <p>Let the owner know why this listing isn't being approved. This note is optional but helpful.</p>
        <textarea
          className="deny-reason"
          rows={3}
          placeholder="e.g. Missing valid business permit photo…"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
        <div className="modal-btns">
          <button className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-confirm" onClick={onConfirm}>Deny Listing</button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  if (!listing) return null;
  const meta = statusMeta(listing.status);
  const StatusIcon = meta.icon;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box view-box">
        {listing.image && (
          <img
            className="view-thumb"
            src={listing.image}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="view-header">
          <h3>{listing.businessName || 'Untitled Business'}</h3>
          <span className={meta.className}>
            <StatusIcon size={12} /> {meta.label}
          </span>
        </div>

        {listing.category && <p className="view-category">{listing.category}</p>}

        {listing.description && <p className="view-desc">{listing.description}</p>}

        <div className="view-details">
          {listing.ownerName && (
            <div className="view-row"><User size={14} /> {listing.ownerName}</div>
          )}
          {listing.ownerEmail && (
            <div className="view-row"><Mail size={14} /> {listing.ownerEmail}</div>
          )}
          {listing.phone && (
            <div className="view-row"><Phone size={14} /> {listing.phone}</div>
          )}
          {listing.address && (
            <div className="view-row"><MapPin size={14} /> {listing.address}</div>
          )}
        </div>

        {listing.status === 'denied' && listing.denyReason && (
          <div className="deny-note">
            <b>Reason for denial:</b> {listing.denyReason}
          </div>
        )}

        <div className="modal-btns">
          <button className="modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────── */

export default function AdminListings() {
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('admin');
  const [authWarning, setAuthWarning] = useState(false);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | ListingStatus>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const [viewListing, setViewListing] = useState<Listing | null>(null);

  const [denyModalOpen, setDenyModalOpen] = useState(false);
  const [denyTargetId, setDenyTargetId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const readStored = (key: string) =>
      window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || '';

    const token = readStored('mycalinan_admin_token');
    setAdminName(readStored('mycalinan_admin_username') || 'Admin');
    setAdminRole(readStored('mycalinan_admin_role') || 'admin');
    setAuthWarning(!token);
  }, []);

  const checkAuth = () => {
    const token = getToken();
    if (!token) {
      setAuthWarning(true);
      return false;
    }
    return true;
  };

  const loadListings = useCallback(async () => {
    if (!checkAuth()) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(ADMIN_API, { headers: authHeaders() });
      if (res.status === 401) {
        showToast('Session expired. Please log in again.', true);
        setTimeout(() => {
          window.location.href = 'Admin-login.html';
        }, 1500);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setListings(data);
      setLoadError(false);
    } catch (err) {
      console.error('Load listings error:', err);
      setLoadError(true);
      showToast('Server unreachable', true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadListings();
    const id = setInterval(loadListings, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadListings]);

  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let denied = 0;
    listings.forEach((item) => {
      if (item.status === 'approved') approved++;
      else if (item.status === 'denied') denied++;
      else pending++;
    });
    return { total: listings.length, pending, approved, denied };
  }, [listings]);

  const filteredListings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return listings.filter((item) => {
      const status: ListingStatus = item.status || 'pending';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!term) return true;
      return (
        (item.businessName || '').toLowerCase().includes(term) ||
        (item.ownerName || '').toLowerCase().includes(term) ||
        (item.category || '').toLowerCase().includes(term)
      );
    });
  }, [listings, statusFilter, searchTerm]);

  const updateStatus = async (id: string, status: ListingStatus, reason?: string) => {
    if (!checkAuth()) {
      showToast('Please log in first.', true);
      return;
    }
    try {
      const res = await fetch(`${ADMIN_API}/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status, denyReason: reason || '' }),
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
        showToast(err.error || 'Failed to update listing.', true);
        return;
      }

      showToast(
        status === 'approved' ? '✅ Listing approved!' : status === 'denied' ? '🚫 Listing denied.' : 'Status updated.'
      );
      loadListings();
    } catch (err) {
      console.error('Status update error:', err);
      showToast('Cannot reach server. Check Flask is running.', true);
    }
  };

  const handleApprove = (id: string) => updateStatus(id, 'approved');

  const openDenyModal = (id: string) => {
    setDenyTargetId(id);
    setDenyReason('');
    setDenyModalOpen(true);
  };
  const closeDenyModal = () => {
    setDenyTargetId(null);
    setDenyModalOpen(false);
  };
  const confirmDeny = () => {
    if (!denyTargetId) return;
    updateStatus(denyTargetId, 'denied', denyReason.trim());
    closeDenyModal();
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
        showToast(err.error || 'Failed to remove listing.', true);
        return;
      }

      showToast('🗑️ Listing removed.');
      loadListings();
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
    <div className="admin-listings-root">
      <style>{`
        .admin-listings-root, .admin-listings-root *, .admin-listings-root *::before, .admin-listings-root *::after {
          box-sizing: border-box;
        }
        .admin-listings-root {
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

        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 12px; }
        .header h1 { font-size: 1.4rem; color: #1a3d28; font-weight: 700; display: flex; align-items: center; gap: 8px; margin: 0; }
        .subtitle { font-size: .85rem; color: #778; margin-bottom: 28px; }

        /* ── Stats ── */
        .stats {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 18px; margin-bottom: 28px;
        }
        .stat-card {
          background: #fff; border-radius: 12px; padding: 20px 18px;
          text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,.07);
          cursor: pointer; border: 2px solid transparent; transition: border-color .15s;
        }
        .stat-card.active { border-color: #1a5c38; }
        .stat-card svg { color: #1a5c38; margin-bottom: 6px; }
        .stat-card.pending svg { color: #b8860b; }
        .stat-card.approved svg { color: #1f8b3f; }
        .stat-card.denied svg { color: #c0392b; }
        .stat-card h2 { font-size: 1.7rem; font-weight: 700; color: #1a3d28; margin: 0; }
        .stat-card p { font-size: .78rem; color: #777; margin-top: 2px; }

        /* ── Auth warning ── */
        .auth-warning {
          background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px;
          padding: 14px 20px; margin-bottom: 22px; font-size: .88rem; color: #856404;
          display: flex; align-items: center; gap: 8px;
        }
        .auth-warning a { color: #6b5200; font-weight: 600; }

        /* ── Toolbar ── */
        .toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-tab {
          padding: 8px 16px; border-radius: 20px; font-size: .82rem; font-weight: 600;
          border: 1.5px solid #dce8e0; background: #fff; color: #4a5a52; cursor: pointer;
          transition: background .15s, color .15s, border-color .15s;
        }
        .filter-tab:hover { border-color: #1a5c38; }
        .filter-tab.active { background: #1a5c38; border-color: #1a5c38; color: #fff; }

        .search-box {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1.5px solid #dce8e0; border-radius: 8px;
          padding: 8px 14px; min-width: 220px;
        }
        .search-box svg { color: #94a3a8; flex-shrink: 0; }
        .search-box input {
          border: none; outline: none; font-size: .85rem; width: 100%;
          font-family: inherit; color: #2c3e50;
        }

        /* ── Table ── */
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

        .title-cell { display: flex; align-items: center; gap: 10px; }
        .title-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #e8f0ec; }
        .title-sub { font-size: .76rem; color: #8a9a92; margin-top: 2px; }

        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 11px; border-radius: 20px; font-size: .75rem; font-weight: 700;
        }
        .badge.pending { background: #fff3cd; color: #856404; }
        .badge.approved { background: #d4edda; color: #155724; }
        .badge.denied { background: #f8d7da; color: #721c24; }

        td button {
          padding: 5px 12px; border-radius: 6px; font-size: .78rem; font-weight: 600;
          cursor: pointer; border: none; margin-right: 5px; margin-bottom: 4px; transition: opacity .2s;
          display: inline-flex; align-items: center; gap: 5px;
        }
        td button:hover { opacity: .8; }
        td button.approve { background: #d4edda; color: #155724; }
        td button.deny { background: #fff3cd; color: #856404; }
        td button.view { background: #e3f0ff; color: #1a56a0; }
        td button.delete { background: #f8d7da; color: #721c24; }

        .table-state td { text-align: center; padding: 40px; color: #888; }

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
          padding: 20px;
        }
        .modal-overlay.open { display: flex; }
        .modal-box {
          background: #fff; border-radius: 14px; padding: 30px 32px;
          max-width: 380px; width: 90%; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.18);
        }
        .modal-box svg { margin-bottom: 10px; }
        .modal-box h3 { font-size: 1.1rem; font-weight: 700; color: #1a3d28; margin-bottom: 8px; }
        .modal-box p { font-size: .88rem; color: #666; margin-bottom: 18px; }
        .modal-btns { display: flex; gap: 10px; justify-content: center; margin-top: 4px; }
        .modal-btns button {
          padding: 9px 24px; border-radius: 8px; font-size: .88rem; font-weight: 600;
          cursor: pointer; border: none; transition: opacity .2s;
        }
        .modal-btns button:hover { opacity: .85; }
        .modal-confirm { background: #e74c3c; color: #fff; }
        .modal-cancel { background: #e8f0ec; color: #333; }

        .deny-reason {
          width: 100%; padding: 10px 12px; border: 1.5px solid #dce8e0; border-radius: 8px;
          font-size: .85rem; font-family: inherit; resize: vertical; margin-bottom: 18px; color: #2c3e50;
        }
        .deny-reason:focus { outline: none; border-color: #1a5c38; }

        /* ── View modal ── */
        .view-box { max-width: 440px; text-align: left; }
        .view-thumb { width: 100%; height: 160px; object-fit: cover; border-radius: 10px; margin-bottom: 16px; background: #e8f0ec; }
        .view-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
        .view-header h3 { font-size: 1.05rem; font-weight: 700; color: #1a3d28; margin: 0; }
        .view-category { font-size: .78rem; color: #1a5c38; font-weight: 600; margin-bottom: 10px; }
        .view-desc { font-size: .86rem; color: #555; margin-bottom: 16px; line-height: 1.5; }
        .view-details { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .view-row { display: flex; align-items: center; gap: 8px; font-size: .84rem; color: #444; }
        .view-row svg { color: #1a5c38; flex-shrink: 0; }
        .deny-note {
          background: #fdecea; border: 1px solid #f5c2bc; color: #a12b1f;
          font-size: .82rem; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .sidebar { width: 200px; }
          .content { margin-left: 200px; padding: 18px; }
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
            You are not logged in. <a href="Admin-login.html">Click here to log in</a> to manage business listings.
          </div>
        )}

        <div className="header">
          <h1>
            <Store size={20} color="#1a5c38" />
            Business Listings
          </h1>
        </div>
        <p className="subtitle">Review and moderate shop and business posts submitted by registered users.</p>

        <div className="stats">
          <div
            className={`stat-card ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <Layers size={24} />
            <h2>{loading ? '—' : stats.total}</h2>
            <p>Total Listings</p>
          </div>
          <div
            className={`stat-card pending ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <Clock size={24} />
            <h2>{loading ? '—' : stats.pending}</h2>
            <p>Pending Review</p>
          </div>
          <div
            className={`stat-card approved ${statusFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('approved')}
          >
            <CheckCircle2 size={24} />
            <h2>{loading ? '—' : stats.approved}</h2>
            <p>Approved</p>
          </div>
          <div
            className={`stat-card denied ${statusFilter === 'denied' ? 'active' : ''}`}
            onClick={() => setStatusFilter('denied')}
          >
            <XCircle size={24} />
            <h2>{loading ? '—' : stats.denied}</h2>
            <p>Denied</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="filter-tabs">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${statusFilter === f.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search business, owner, or category…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <section className="table-section">
          <h2>Submitted Listings</h2>
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="table-state">
                  <td colSpan={6}>
                    <Loader2 size={16} className="spin" /> Loading listings…
                  </td>
                </tr>
              ) : loadError ? (
                <tr className="table-state">
                  <td colSpan={6}>⚠️ Cannot connect to server. Make sure Flask is running on port 5000.</td>
                </tr>
              ) : filteredListings.length === 0 ? (
                <tr className="table-state">
                  <td colSpan={6}>No listings match this view.</td>
                </tr>
              ) : (
                filteredListings.map((item) => {
                  const meta = statusMeta(item.status);
                  const StatusIcon = meta.icon;
                  const status: ListingStatus = item.status || 'pending';
                  return (
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
                          <div>
                            <b>{item.businessName || '—'}</b>
                            {item.address && <div className="title-sub">{item.address}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.ownerName || '—'}
                        {item.ownerEmail && <div className="title-sub">{item.ownerEmail}</div>}
                      </td>
                      <td>{item.category || '—'}</td>
                      <td>{item.submittedAt || '—'}</td>
                      <td>
                        <span className={meta.className}>
                          <StatusIcon size={12} /> {meta.label}
                        </span>
                      </td>
                      <td>
                        <button className="view" onClick={() => setViewListing(item)}>
                          <Eye size={12} /> View
                        </button>
                        {status !== 'approved' && (
                          <button className="approve" onClick={() => item._id && handleApprove(item._id)}>
                            <Check size={12} /> Approve
                          </button>
                        )}
                        {status !== 'denied' && (
                          <button className="deny" onClick={() => item._id && openDenyModal(item._id)}>
                            <X size={12} /> Deny
                          </button>
                        )}
                        <button className="delete" onClick={() => item._id && openDeleteModal(item._id)}>
                          <Trash2 size={12} /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </main>

      <ViewModal listing={viewListing} onClose={() => setViewListing(null)} />
      <DenyModal
        open={denyModalOpen}
        reason={denyReason}
        onReasonChange={setDenyReason}
        onCancel={closeDenyModal}
        onConfirm={confirmDeny}
      />
      <DeleteModal open={deleteModalOpen} onCancel={closeDeleteModal} onConfirm={handleConfirmDelete} />
      <LogoutModal open={logoutModalOpen} onStay={() => setLogoutModalOpen(false)} onConfirm={handleLogout} />
    </div>
  );
}