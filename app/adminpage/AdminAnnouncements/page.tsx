"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Gauge,
  HandHelping,
  LineChart,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Store,
  Trash2,
  X,
} from "lucide-react";

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

const PUBLIC_API = "http://localhost:5000/api/announcements";
const ADMIN_API = "http://localhost:5000/api/admin/announcements";

const EMPTY_FORM: AnnouncementFormState = {
  editId: "",
  title: "",
  date: "",
  category: "General",
  image: "",
  description: "",
};

/* ────────────────────────────────────────────────────────────────
   Authentication keys
   Supports both current and legacy naming conventions.
   ──────────────────────────────────────────────────────────────── */

const TOKEN_KEY = "mycalinan_token";
const USERNAME_KEY = "mycalinan_username";
const ROLE_KEY = "mycalinan_role";

const LEGACY_TOKEN_KEY = "mycalinan_admin_token";
const LEGACY_USERNAME_KEY = "mycalinan_admin_username";
const LEGACY_ROLE_KEY = "mycalinan_admin_role";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadState, setLoadState] = useState<
    "loading" | "empty" | "error" | "ready"
  >("loading");

  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("admin");
  const [isAuthed, setIsAuthed] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] =
    useState<AnnouncementFormState>(EMPTY_FORM);

  const [toast, setToast] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  const toastTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deleteTargetId, setDeleteTargetId] =
    useState<string | null>(null);

  const [logoutOpen, setLogoutOpen] =
    useState(false);

  /* ── Auth helpers ── */

  function getStoredValue(
    primaryKey: string,
    legacyKey: string
  ): string {
    if (typeof window === "undefined") {
      return "";
    }

    return (
      localStorage.getItem(primaryKey) ||
      sessionStorage.getItem(primaryKey) ||
      localStorage.getItem(legacyKey) ||
      sessionStorage.getItem(legacyKey) ||
      ""
    );
  }

  function getToken(): string {
    return getStoredValue(
      TOKEN_KEY,
      LEGACY_TOKEN_KEY
    );
  }

  function authHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
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
    if (typeof window === "undefined") {
      return;
    }

    const username =
      getStoredValue(
        USERNAME_KEY,
        LEGACY_USERNAME_KEY
      ) || "Admin";

    const role =
      getStoredValue(
        ROLE_KEY,
        LEGACY_ROLE_KEY
      ) || "admin";

    setAdminName(username);
    setAdminRole(role);
  }

  /* ── Toast ── */

  function showToast(
    message: string,
    isError = false
  ) {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast({
      message,
      isError,
    });

    toastTimer.current = setTimeout(
      () => setToast(null),
      3000
    );
  }

  /* ── Category tag class ── */

  function tagClass(category: string): string {
    const c = (category || "").toLowerCase();

    if (c.includes("event")) {
      return "tag event";
    }

    if (c.includes("advisory")) {
      return "tag advisory";
    }

    if (c.includes("program")) {
      return "tag program";
    }

    if (c.includes("festival")) {
      return "tag festival";
    }

    return "tag";
  }

  /* ── Load announcements ── */

  async function loadAnnouncements() {
    try {
      const res = await fetch(PUBLIC_API);

      if (!res.ok) {
        throw new Error(String(res.status));
      }

      const data: Announcement[] = await res.json();

      setAnnouncements(data);

      setLoadState(
        data.length === 0
          ? "empty"
          : "ready"
      );
    } catch (err) {
      console.error(
        "Load announcements error:",
        err
      );

      setLoadState("error");

      showToast(
        "Server unreachable",
        true
      );
    }
  }

  useEffect(() => {
    loadAdminInfo();
    checkAuth();
    loadAnnouncements();

    const interval = setInterval(
      loadAnnouncements,
      30000
    );

    return () =>
      clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived stats ── */

  const stats = {
    total:
      loadState === "ready" ||
      loadState === "empty"
        ? announcements.length
        : null,

    events: announcements.filter((a) =>
      (a.category || "")
        .toLowerCase()
        .includes("event")
    ).length,

    programs: announcements.filter((a) =>
      (a.category || "")
        .toLowerCase()
        .includes("program")
    ).length,

    advisories: announcements.filter((a) =>
      (a.category || "")
        .toLowerCase()
        .includes("advisory")
    ).length,
  };

  /* ── Form show/hide ── */

  function showForm() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function hideForm() {
    setFormOpen(false);
  }

  function updateField<
    K extends keyof AnnouncementFormState
  >(
    key: K,
    value: AnnouncementFormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  /* ── Save (create or update) ── */

  async function saveAnnouncement() {
    if (!checkAuth()) {
      showToast(
        "Please log in first.",
        true
      );
      return;
    }

    const title = form.title.trim();
    const description =
      form.description.trim();

    if (!title || !description) {
      showToast(
        "Title and Description are required.",
        true
      );
      return;
    }

    const isEdit =
      form.editId !== "";

    const url = isEdit
      ? `${ADMIN_API}/${form.editId}`
      : ADMIN_API;

    const method = isEdit
      ? "PUT"
      : "POST";

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
        showToast(
          "Session expired. Please log in again.",
          true
        );

        setTimeout(() => {
          window.location.href =
            "/login";
        }, 1500);

        return;
      }

      if (!res.ok) {
        const err =
          await res
            .json()
            .catch(() => ({}));

        showToast(
          err.error ||
            "Failed to save announcement.",
          true
        );

        return;
      }

      showToast(
        isEdit
          ? "✅ Announcement updated!"
          : "✅ Announcement created!"
      );

      hideForm();
      loadAnnouncements();
    } catch (err) {
      console.error(
        "Save error:",
        err
      );

      showToast(
        "Cannot reach server. Check Flask is running.",
        true
      );
    }
  }

  /* ── Edit ── */

  function editAnnouncement(id: string) {
    const item =
      announcements.find(
        (a) => a._id === id
      );

    if (!item) {
      return;
    }

    setForm({
      editId: id,
      title: item.title || "",
      date: item.date || "",
      category:
        item.category || "General",
      image: item.image || "",
      description:
        item.description || "",
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
    if (!deleteTargetId) {
      return;
    }

    const id = deleteTargetId;

    closeModal();

    if (!checkAuth()) {
      showToast(
        "Please log in first.",
        true
      );
      return;
    }

    try {
      const res = await fetch(
        `${ADMIN_API}/${id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      if (res.status === 401) {
        showToast(
          "Session expired. Please log in again.",
          true
        );

        setTimeout(() => {
          window.location.href =
            "/login";
        }, 1500);

        return;
      }

      if (!res.ok) {
        const err =
          await res
            .json()
            .catch(() => ({}));

        showToast(
          err.error ||
            "Failed to delete announcement.",
          true
        );

        return;
      }

      showToast(
        "🗑️ Announcement deleted."
      );

      loadAnnouncements();
    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      showToast(
        "Cannot reach server. Check Flask is running.",
        true
      );
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
    [
      TOKEN_KEY,
      USERNAME_KEY,
      ROLE_KEY,
      LEGACY_TOKEN_KEY,
      LEGACY_USERNAME_KEY,
      LEGACY_ROLE_KEY,
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.href =
      "/login";
  }

  return (
    <>
      <div className="admin-page">

        {/* ── SIDEBAR ── */}

        <aside className="sidebar">

          <div className="logo">
            <h2>MyCalinan</h2>
            <p>Admin Panel</p>
          </div>

          <div className="admin-badge">

            <div className="admin-avatar">
              {adminName
                .charAt(0)
                .toUpperCase() || "A"}
            </div>

            <div className="admin-info">

              <div className="name">
                {adminName}
              </div>

              <div className="role">
                {adminRole}
              </div>

            </div>

          </div>

          <ul className="menu">

            <li>
              <a href="/adminpage/AdminDashboard">
                <Gauge size={16} />
                Dashboard
              </a>
            </li>

            <li>
              <a href="/adminpage/AdminEvents">
                <CalendarDays size={16} />
                Events &amp; Festivals
              </a>
            </li>

            <li className="active">
              <a href="/adminpage/AdminAnnouncements">
                <Megaphone size={16} />
                Announcements
              </a>
            </li>

            <li>
              <a href="/adminpage/AdminListings">
                <Store size={16} />
                Business Listings
              </a>
            </li>

            <li>
              <a href="/adminpage/AdminReports">
                <LineChart size={16} />
                Reports
              </a>
            </li>

          </ul>

          <div className="sidebar-footer">

            <button
              className="logout-btn"
              onClick={confirmLogout}
            >
              <LogOut size={16} />
              Log Out
            </button>

          </div>

        </aside>

        {/* ── MAIN ── */}

        <main className="content">

          {toast && (
            <div
              className={`toast ${
                toast.isError
                  ? "toast-error"
                  : ""
              }`}
            >
              {toast.message}
            </div>
          )}

          {!isAuthed && (
            <div className="auth-warning">

              <AlertTriangle size={16} />

              <span>
                You are not logged in.{" "}
                <a href="/login">
                  Click here to log in
                </a>{" "}
                — changes will not be saved
                until you do.
              </span>

            </div>
          )}

          <div className="header">

            <h1>
              <Megaphone size={20} />
              Community Announcements
            </h1>

            <button
              className="add-btn"
              onClick={showForm}
            >
              <Plus size={16} />
              Add Announcement
            </button>

          </div>

          <div className="stats">

            <div className="stat-card">
              <Megaphone size={24} />

              <h2>
                {stats.total === null
                  ? "—"
                  : stats.total}
              </h2>

              <p>
                Total Announcements
              </p>
            </div>

            <div className="stat-card">
              <CalendarDays size={24} />

              <h2>
                {stats.total === null
                  ? "—"
                  : stats.events}
              </h2>

              <p>Events</p>
            </div>

            <div className="stat-card">
              <HandHelping size={24} />

              <h2>
                {stats.total === null
                  ? "—"
                  : stats.programs}
              </h2>

              <p>Programs</p>
            </div>

            <div className="stat-card">
              <AlertTriangle size={24} />

              <h2>
                {stats.total === null
                  ? "—"
                  : stats.advisories}
              </h2>

              <p>Advisories</p>
            </div>

          </div>

          {formOpen && (
            <section className="form-section">

              <h2>
                {form.editId
                  ? "Edit Announcement"
                  : "Create Announcement"}
              </h2>

              <div className="form-grid">

                <div className="input-box">
                  <label>Title *</label>

                  <input
                    type="text"
                    placeholder="Community Clean-Up Drive"
                    value={form.title}
                    onChange={(e) =>
                      updateField(
                        "title",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="input-box">
                  <label>Date</label>

                  <input
                    type="text"
                    placeholder="June 28, 2026"
                    value={form.date}
                    onChange={(e) =>
                      updateField(
                        "date",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="input-box">
                  <label>Category</label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      updateField(
                        "category",
                        e.target.value
                      )
                    }
                  >
                    <option>
                      General
                    </option>
                    <option>
                      Event
                    </option>
                    <option>
                      Program
                    </option>
                    <option>
                      Advisory
                    </option>
                    <option>
                      Festival
                    </option>
                  </select>
                </div>

                <div className="input-box">
                  <label>Image URL</label>

                  <input
                    type="text"
                    placeholder="image/announcement1.jpg"
                    value={form.image}
                    onChange={(e) =>
                      updateField(
                        "image",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="input-box full">

                  <label>
                    Description *
                  </label>

                  <textarea
                    rows={4}
                    placeholder="Write the announcement details…"
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="btn-row">

                <button
                  className="save-btn"
                  onClick={saveAnnouncement}
                >
                  <Save size={16} />
                  Save Announcement
                </button>

                <button
                  className="save-btn grey"
                  onClick={hideForm}
                >
                  <X size={16} />
                  Cancel
                </button>

              </div>

            </section>
          )}

          <section className="table-section">

            <h2>
              Announcement List
            </h2>

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

                {loadState === "loading" && (
                  <tr className="table-state">
                    <td colSpan={5}>
                      <Loader2
                        size={16}
                        className="spin"
                      />
                      Loading announcements…
                    </td>
                  </tr>
                )}

                {loadState === "error" && (
                  <tr className="table-state">
                    <td colSpan={5}>
                      ⚠️ Cannot connect to
                      server. Make sure Flask
                      is running on port 5000.
                    </td>
                  </tr>
                )}

                {loadState === "empty" && (
                  <tr className="table-state">

                    <td colSpan={5}>
                      No announcements yet.
                      Click{" "}
                      <b>
                        Add Announcement
                      </b>{" "}
                      to create one.
                    </td>

                  </tr>
                )}

                {loadState === "ready" &&
                  announcements.map(
                    (item) => (
                      <tr key={item._id}>

                        <td>
                          <b>
                            {item.title || "—"}
                          </b>
                        </td>

                        <td>
                          <span
                            className={tagClass(
                              item.category
                            )}
                          >
                            {item.category ||
                              "General"}
                          </span>
                        </td>

                        <td>
                          {item.date || "—"}
                        </td>

                        <td className="desc-cell">
                          {item.description ||
                            "—"}
                        </td>

                        <td>

                          <button
                            className="edit"
                            onClick={() =>
                              editAnnouncement(
                                item._id
                              )
                            }
                          >
                            <Pencil size={12} />
                            Edit
                          </button>

                          <button
                            className="delete"
                            onClick={() =>
                              openDeleteModal(
                                item._id
                              )
                            }
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>

                        </td>

                      </tr>
                    )
                  )}

              </tbody>

            </table>

          </section>

        </main>
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}

      <div
        className={`modal-overlay${
          deleteTargetId
            ? " open"
            : ""
        }`}
        onClick={(e) => {
          if (
            e.target ===
            e.currentTarget
          ) {
            closeModal();
          }
        }}
      >

        <div className="modal-box">

          <Trash2
            size={32}
            className="modal-icon"
          />

          <h3>
            Delete Announcement?
          </h3>

          <p>
            This action cannot be undone.
            The announcement will be
            permanently removed from the
            database.
          </p>

          <div className="modal-btns">

            <button
              className="modal-cancel"
              onClick={closeModal}
            >
              Cancel
            </button>

            <button
              className="modal-confirm"
              onClick={confirmDelete}
            >
              Yes, Delete
            </button>

          </div>

        </div>

      </div>

      {/* ── LOGOUT CONFIRM MODAL ── */}

      <div
        className={`modal-overlay${
          logoutOpen
            ? " open"
            : ""
        }`}
        onClick={(e) => {
          if (
            e.target ===
            e.currentTarget
          ) {
            closeLogoutModal();
          }
        }}
      >

        <div className="modal-box">

          <LogOut
            size={32}
            className="modal-icon"
          />

          <h3>
            Log Out?
          </h3>

          <p>
            You will be returned to the
            login page. Any unsaved changes
            will be lost.
          </p>

          <div className="modal-btns">

            <button
              className="modal-cancel"
              onClick={
                closeLogoutModal
              }
            >
              Stay
            </button>

            <button
              className="modal-confirm"
              onClick={doLogout}
            >
              Log Out
            </button>

          </div>

        </div>

      </div>
    </>
  );
}