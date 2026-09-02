"use client";

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