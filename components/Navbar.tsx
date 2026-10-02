"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fullLogout } from "../lib/session"; // adjust path to match your project structure
import { useLanguage, type Lang } from "./LanguageProvider";
import { useOfflineAccess } from "@/hooks/useOfflineAccess";

const EXPLORE_LINKS = [
  { label: "Health", href: "/explore/HealthCare" },
  { label: "Education", href: "/explore/Education" },
  { label: "Transport & Utilities", href: "/explore/Transportation" },
  { label: "Finance", href: "/explore/Finance" },
  { label: "Community", href: "/explore/Community" },
  { label: "Lifestyle", href: "/explore/Lifestyle" },
  { label: "Shopping & Stores", href: "/explore/Shopping" },
  { label: "Food & Dining", href: "/explore/Food" },
  { label: "Hotspots", href: "/explore/Hotspots" },
];

const DOCUMENT_LINKS = [
  { label: "Police Clearance", href: "/documents/PoliceClearance" },
  { label: "Barangay Clearance", href: "/documents/BarangayClearance" },
  { label: "Barangay Certification", href: "/documents/BarangayCertificate" },
  { label: "Cedula", href: "/documents/Cedula" },
  { label: "Get Postal ID", href: "/documents/Postal" },
];

const DIRECT_LINKS = [
  { label: "Barangay Map", href: "/map" },
  { label: "History", href: "/others/History" },
  { label: "Hotlines", href: "/others/Hotlines" },
  { label: "Announcements", href: "/others/Announcements" },
  { label: "Events", href: "/others/Events" },
  { label: "Business Registration", href: "/business-registration" },
];

/* Where the admin's "Admin Dashboard" menu item goes.
   If your dashboard lives at a different address, change this one line. */
const ADMIN_DASHBOARD_HREF = "/adminpage/AdminDashboard";

/* Which kind of account button the top-right corner should show. */
type AuthState = "none" | "guest" | "user" | "admin";

/* Shared style for the round yellow account buttons (smaller on phones). */
const ACCOUNT_BTN =
  "whitespace-nowrap rounded-full bg-durian-500 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-durian-400 sm:px-4 sm:text-sm";

/* Shown instead of a link when the phone is offline and that page was never saved */
const NOT_SAVED_TITLE = "Not saved for offline use — connect to the internet to open it";

/* ── Desktop dropdown (hover + click, closes on click-outside) ── */
function NavDropdown({
  label,
  links,
  isAvailable,
}: {
  label: string;
  links: { label: string; href: string }[];
  isAvailable: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="relative"
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 py-1 font-semibold text-ink-900 transition hover:text-canopy-700"
      >
        {label}
        <span aria-hidden="true" className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 min-w-[190px] overflow-hidden rounded-[var(--radius-stall)] border border-canopy-100 bg-white shadow-lg">
          {links.map((link) =>
            isAvailable(link.href) ? (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-canopy-100 hover:text-canopy-800"
              >
                {link.label}
              </Link>
            ) : (
              <span
                key={link.href}
                aria-disabled="true"
                title={NOT_SAVED_TITLE}
                className="block cursor-not-allowed px-4 py-2.5 text-sm font-medium text-ink-900/40"
              >
                {link.label} <span className="text-[10px] font-normal">(not saved)</span>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Mobile accordion group (Explore / Documents) ── */
function MobileGroup({
  label,
  links,
  isAvailable,
}: {
  label: string;
  links: { label: string; href: string }[];
  isAvailable: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-b border-canopy-600/15">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-left text-[15px] font-semibold text-ink-900"
      >
        {label}
        <span
          aria-hidden="true"
          className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <ul className="mb-2 rounded-[var(--radius-stall)] bg-white/70">
          {links.map((link) => (
            <li key={link.href}>
              {isAvailable(link.href) ? (
                <Link
                  href={link.href}
                  className="block px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-canopy-100 hover:text-canopy-800"
                >
                  {link.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title={NOT_SAVED_TITLE}
                  className="block cursor-not-allowed px-4 py-2.5 text-sm font-medium text-ink-900/40"
                >
                  {link.label} <span className="text-[10px] font-normal">(not saved)</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/*
  Dropdown shown for a logged-in business owner ("user") and for the admin.
  The links inside it are passed in, and "Log out" is always the last item.
  Opens on click (not hover) and closes on click-outside.
*/
function AccountDropdown({
  label,
  links,
  onLogout,
}: {
  label: string;
  links: { label: string; href: string }[];
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1 ${ACCOUNT_BTN}`}
      >
        {label}
        <span aria-hidden="true" className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 min-w-[210px] overflow-hidden rounded-[var(--radius-stall)] border border-canopy-100 bg-white shadow-lg">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-canopy-100 hover:text-canopy-800"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // ENG / CEB — saved on the device; Cebuano translates the page (see LanguageProvider)
  const { lang, setLang } = useLanguage();
  // Offline? Then only pages saved on the phone can be opened
  const { isAvailable } = useOfflineAccess();
  const [authState, setAuthState] = useState<AuthState>("none");
  const [menuOpen, setMenuOpen] = useState(false);

  /* I-close ang mobile menu kung mo-lihok og page */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /*
    Figure out who (if anyone) is signed in.
    - Guest: sessionStorage "mycalinan_guest" flag
    - Admin / User: mycalinan_role from the unified /login page
  */
  useEffect(() => {
    const isGuest = sessionStorage.getItem("mycalinan_guest") === "true";

    const role =
      localStorage.getItem("mycalinan_role") ||
      sessionStorage.getItem("mycalinan_role");

    if (isGuest) {
      setAuthState("guest");
    } else if (role === "admin") {
      setAuthState("admin");
    } else if (role === "user") {
      setAuthState("user");
    } else {
      setAuthState("none");
    }
  }, []);

  /*
    Single shared logout path for every role. fullLogout() ends the real
    Firebase Auth session AND clears every app-level storage flag, so the
    navbar's "logged out" state and Firebase's own session can never drift
    apart again.
  */
  async function handleGuestLogout() {
    await fullLogout();
    setAuthState("none");
    router.push("/");
  }

  async function handleUserLogout() {
    await fullLogout();
    setAuthState("none");
    router.push("/login");
  }

  async function handleAdminLogout() {
    await fullLogout();
    setAuthState("none");
    router.push("/login");
  }

  /* translate="no": the ENG / CEB labels must never be translated */
  const langSelect = (
    <>
      <label className="sr-only" htmlFor="lang-switch">
        Language
      </label>
      <select
        id="lang-switch"
        translate="no"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-full border border-white/30 bg-transparent px-3 py-1 text-sm font-medium text-white"
      >
        <option className="text-ink-900" value="en">ENG</option>
        <option className="text-ink-900" value="ceb">CEB</option>
      </select>
    </>
  );

  return (
    <header className="sticky top-0 z-50">
      {/* Brand bar
          Cellphone: [☰]  MyCalinan  [account]
          Desktop:   [ENG] MyCalinan [account] */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-canopy-800 px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-10">
        <div className="justify-self-start">
          {/* Hamburger (cellphone lang) */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 text-white md:hidden"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          {/* Language (desktop lang) */}
          <div className="hidden md:block">{langSelect}</div>
        </div>

        <Link href="/" className="flex items-center justify-center justify-self-center gap-3">
          <span
            translate="no"
            className="font-display text-xl font-semibold tracking-wide text-white sm:text-2xl md:text-3xl"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
          >
            MyCalinan
          </span>
        </Link>

        <div className="justify-self-end">
          {authState === "none" && (
            <Link href="/login" className={`inline-block ${ACCOUNT_BTN}`}>
              Login
            </Link>
          )}

          {authState === "guest" && (
            <button onClick={handleGuestLogout} className={ACCOUNT_BTN}>
              Exit Guest Mode
            </button>
          )}

          {authState === "user" && (
            <AccountDropdown
              label="My Account"
              links={[
                { label: "Business Profile", href: "/profile" },
                { label: "Submit Business Form", href: "/business-registration" },
              ]}
              onLogout={handleUserLogout}
            />
          )}

          {authState === "admin" && (
            <AccountDropdown
              label="Admin"
              links={[{ label: "Admin Dashboard", href: ADMIN_DASHBOARD_HREF }]}
              onLogout={handleAdminLogout}
            />
          )}
        </div>
      </div>

      {/* Desktop menu bar */}
      <nav className="hidden border-b-2 border-canopy-600 bg-canopy-100 px-10 py-3 md:block">
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center text-[15px]">
          <li>
            <NavDropdown label="Explore" links={EXPLORE_LINKS} isAvailable={isAvailable} />
          </li>
          <li>
            <NavDropdown label="Documents" links={DOCUMENT_LINKS} isAvailable={isAvailable} />
          </li>
          {DIRECT_LINKS.map((link) => (
            <li key={link.href}>
              {isAvailable(link.href) ? (
                <Link
                  href={link.href}
                  className="inline-block py-1 font-semibold text-ink-900 transition hover:text-canopy-700"
                >
                  {link.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title={NOT_SAVED_TITLE}
                  className="inline-block cursor-not-allowed py-1 font-semibold text-ink-900/40"
                >
                  {link.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-b-2 border-canopy-600 bg-canopy-100 px-4 pb-4 pt-2 md:hidden"
        >
          <div className="flex items-center justify-between border-b border-canopy-600/15 py-3">
            <span className="text-sm font-semibold text-ink-900">Language</span>
            <div className="rounded-full bg-canopy-800">{langSelect}</div>
          </div>

          <ul>
            <MobileGroup label="Explore" links={EXPLORE_LINKS} isAvailable={isAvailable} />
            <MobileGroup label="Documents" links={DOCUMENT_LINKS} isAvailable={isAvailable} />
            {DIRECT_LINKS.map((link) => (
              <li key={link.href} className="border-b border-canopy-600/15 last:border-b-0">
                {isAvailable(link.href) ? (
                  <Link
                    href={link.href}
                    className="block py-3 text-[15px] font-semibold text-ink-900 transition hover:text-canopy-700"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    title={NOT_SAVED_TITLE}
                    className="block cursor-not-allowed py-3 text-[15px] font-semibold text-ink-900/40"
                  >
                    {link.label} <span className="text-[10px] font-normal">(not saved)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}