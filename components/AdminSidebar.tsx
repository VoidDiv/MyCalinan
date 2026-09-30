"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Gauge,
  Home,
  CalendarDays,
  Megaphone,
  Layers,
  LineChart,
  Gavel,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { auth } from "@/lib/Firebase";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/adminpage/AdminDashboard", icon: Gauge },
  { label: "Home Page", href: "/", icon: Home },
  { label: "Events & Festivals", href: "/adminpage/AdminEvents", icon: CalendarDays },
  { label: "Announcements", href: "/adminpage/AdminAnnouncements", icon: Megaphone },
  { label: "Listings", href: "/adminpage/AdminListings", icon: Layers },
  { label: "Reports", href: "/adminpage/AdminReports", icon: LineChart },
  { label: "Rules", href: "/adminpage/AdminRules", icon: Gavel },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href !== "/" && (pathname === href || pathname.startsWith(href + "/"));

  // I-close ang drawer kung mo-lihok og page
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      ["mycalinan_uid", "mycalinan_token", "mycalinan_username", "mycalinan_role"].forEach(
        (k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        }
      );
      router.push("/login");
    }
  };

  return (
    <>
      <style>{`
        /* ───────── Sidebar ───────── */
        .adm-sidebar {
          width: 240px; background: #1a5c38; color: #fff;
          display: flex; flex-direction: column;
          height: 100vh; height: 100dvh; overflow: hidden;
          position: fixed; top: 0; left: 0; z-index: 60;
          font-family: 'Segoe UI', sans-serif;
          transition: transform .25s ease;
        }
        .adm-sidebar .adm-logo {
          padding: 24px 24px 18px; border-bottom: 1px solid rgba(255,255,255,.15);
          flex-shrink: 0; position: relative;
        }
        .adm-sidebar .adm-logo h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
        .adm-sidebar .adm-logo p { font-size: .75rem; opacity: .65; margin: 2px 0 0; }
        .adm-close {
          display: none; position: absolute; top: 14px; right: 12px;
          width: 36px; height: 36px; border-radius: 8px; border: none;
          background: rgba(255,255,255,.12); color: #fff; cursor: pointer;
          align-items: center; justify-content: center;
        }
        .adm-badge {
          display: flex; align-items: center; gap: 10px; padding: 14px 24px;
          border-bottom: 1px solid rgba(255,255,255,.1); background: rgba(0,0,0,.12);
          flex-shrink: 0;
        }
        .adm-avatar {
          width: 34px; height: 34px; background: rgba(255,255,255,.25); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .9rem; font-weight: 700; flex-shrink: 0;
        }
        .adm-badge .adm-name { font-size: .82rem; font-weight: 600; color: #fff; }
        .adm-badge .adm-role { font-size: .7rem; color: rgba(255,255,255,.6); }
        .adm-menu { list-style: none; padding: 12px 0; margin: 0; flex: 1; min-height: 0; overflow-y: auto; }
        .adm-menu a {
          display: flex; align-items: center; gap: 12px; padding: 12px 24px;
          color: rgba(255,255,255,.82); text-decoration: none; font-size: .88rem;
          transition: background .2s, color .2s;
        }
        .adm-menu a:hover, .adm-menu a.active { background: rgba(255,255,255,.15); color: #fff; }
        .adm-menu a.active { font-weight: 600; }
        .adm-footer { padding: 16px 20px 20px; border-top: 1px solid rgba(255,255,255,.1); flex-shrink: 0; }
        .adm-logout {
          display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px;
          background: rgba(231,76,60,.2); border: 1px solid rgba(231,76,60,.35);
          color: #ff8f85; border-radius: 8px; font-size: .85rem; font-weight: 600; cursor: pointer;
        }
        .adm-logout:hover { background: rgba(231,76,60,.4); color: #fff; }

        /* Hamburger + backdrop (mobile lang) */
        .adm-burger {
          display: none; position: fixed; top: 12px; left: 12px; z-index: 55;
          width: 44px; height: 44px; border-radius: 10px; border: none;
          background: #1a5c38; color: #fff; cursor: pointer;
          align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,.25);
        }
        .adm-backdrop {
          display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 58;
        }

        /* ───────── Logout modal ───────── */
        .adm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center; z-index: 8000;
        }
        .adm-modal {
          background: #fff; border-radius: 14px; padding: 30px 32px; max-width: 380px;
          width: 90%; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.18);
          font-family: 'Segoe UI', sans-serif;
        }
        .adm-modal h3 { font-size: 1.1rem; font-weight: 700; color: #1a3d28; margin: 10px 0 8px; }
        .adm-modal p { font-size: .88rem; color: #666; margin: 0 0 22px; }
        .adm-modal-btns { display: flex; gap: 10px; justify-content: center; }
        .adm-modal-btns button {
          padding: 9px 24px; border-radius: 8px; font-size: .88rem; font-weight: 600;
          cursor: pointer; border: none;
        }
        .adm-stay { background: #e8f0ec; color: #333; }
        .adm-confirm { background: #1a5c38; color: #fff; }

        /* ───────── Header fix (tanang screen size) ─────────
           Ang .header sa admin pages nagtagbo sa .header sa global CSS
           (berde ang background, itom ang title). I-reset dinhi. */
        main:not(#__adm) .header {
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          position: static !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 0 !important;
          width: auto !important;
          color: #1a3d28 !important;
        }
        main:not(#__adm) .header h1,
        main:not(#__adm) .header h1 * {
          color: #1a3d28 !important;
        }
        main:not(#__adm) .header h1 svg,
        main:not(#__adm) .header h1 i {
          color: #1a5c38 !important;
        }

        /* ───────── RESPONSIVE (tanang admin page) ─────────
           Naka-target sa <main> kay usa ra ka <main> sa matag admin page.
           ":not(#__adm)" gamit aron mas kusog kaysa sa mga class sa matag page. */
        @media (max-width: 900px) {
          .adm-sidebar { width: 260px; transform: translateX(-100%); box-shadow: none; }
          .adm-sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,.35); }
          .adm-close { display: flex; }
          .adm-burger { display: flex; }
          .adm-backdrop.open { display: block; }

          main:not(#__adm) {
            margin-left: 0 !important;
            padding: 68px 16px 24px !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          main:not(#__adm) > *,
          main:not(#__adm) section { min-width: 0 !important; max-width: 100% !important; }

          /* Header / button rows mo-wrap */
          main:not(#__adm) .header { flex-wrap: wrap; gap: 12px; }
          main:not(#__adm) h1 { font-size: 1.15rem !important; }

          /* Tables: mo-scroll pa-tuo/wala sulod sa card */
          main:not(#__adm) .table-section { overflow-x: auto; padding: 18px 14px !important; }
          main:not(#__adm) .table-section table { min-width: 560px; }

          /* Forms 1 column */
          main:not(#__adm) .form-grid { grid-template-columns: 1fr !important; }
          main:not(#__adm) .panels { grid-template-columns: 1fr !important; }
          main:not(#__adm) .form-section { padding: 18px 14px !important; }
        }

        @media (max-width: 480px) {
          .adm-modal { padding: 24px 20px; }
          main:not(#__adm) .stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; }
          main:not(#__adm) .stat-card { padding: 14px 10px !important; }
        }

        @media print {
          .adm-sidebar, .adm-burger, .adm-backdrop { display: none !important; }
        }
      `}</style>

      {/* Hamburger (mobile) */}
      <button
        className="adm-burger"
        aria-label="Open menu"
        onClick={() => setMenuOpen(true)}
      >
        <Menu size={22} />
      </button>

      {/* Backdrop (mobile) */}
      <div
        className={`adm-backdrop${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`adm-sidebar${menuOpen ? " open" : ""}`}>
        <div className="adm-logo">
          <h2>MyCalinan</h2>
          <p>Admin Panel</p>
          <button
            className="adm-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="adm-badge">
          <div className="adm-avatar">A</div>
          <div>
            <div className="adm-name">Admin</div>
            <div className="adm-role">Admin</div>
          </div>
        </div>

        <ul className="adm-menu">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={isActive(href) ? "active" : ""}>
                <Icon size={16} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="adm-footer">
          <button className="adm-logout" onClick={() => setLogoutOpen(true)}>
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>

      {logoutOpen && (
        <div
          className="adm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLogoutOpen(false);
          }}
        >
          <div className="adm-modal">
            <LogOut size={32} color="#1a5c38" />
            <h3>Log Out?</h3>
            <p>You will be returned to the login page.</p>
            <div className="adm-modal-btns">
              <button className="adm-stay" onClick={() => setLogoutOpen(false)}>
                Stay
              </button>
              <button className="adm-confirm" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}