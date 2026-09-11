"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

/* Which kind of account button the top-right corner should show. */
type AuthState = "none" | "guest" | "user" | "admin";

function NavDropdown({
  label,
  links,
}: {
  label: string;
  links: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 py-2 font-semibold text-ink-900 transition hover:text-canopy-700"
      >
        {label}
        <span aria-hidden="true" className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full min-w-[190px] overflow-hidden rounded-[var(--radius-stall)] border border-canopy-100 bg-white shadow-lg">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-canopy-100 hover:text-canopy-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/*
  Dropdown shown for a logged-in business owner ("user" role).
  Opens on click (not hover) and closes on click-outside.
*/
function AccountDropdown({
  label,
  onLogout,
}: {
  label: string;
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
        className="flex items-center gap-1 rounded-full bg-durian-500 px-4 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-durian-400"
      >
        {label}
        <span aria-hidden="true" className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[210px] overflow-hidden rounded-[var(--radius-stall)] border border-canopy-100 bg-white shadow-lg">
          <Link
            href="/profile"
            className="block px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-canopy-100 hover:text-canopy-800"
            onClick={() => setOpen(false)}
          >
            Business Profile
          </Link>
          <Link
            href="/business-registration"
            className="block px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-canopy-100 hover:text-canopy-800"
            onClick={() => setOpen(false)}
          >
            Submit Business Form
          </Link>
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

  const [lang, setLang] = useState<"en" | "ceb">("en");
  const [authState, setAuthState] = useState<AuthState>("none");

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

  function handleGuestLogout() {
    sessionStorage.removeItem("mycalinan_guest");
    sessionStorage.removeItem("mycalinan_guest_name");
    setAuthState("none");
    router.push("/");
  }

  function handleUserLogout() {
    localStorage.removeItem("mycalinan_uid");
    localStorage.removeItem("mycalinan_token");
    localStorage.removeItem("mycalinan_username");
    localStorage.removeItem("mycalinan_role");
    sessionStorage.removeItem("mycalinan_uid");
    sessionStorage.removeItem("mycalinan_token");
    sessionStorage.removeItem("mycalinan_username");
    sessionStorage.removeItem("mycalinan_role");

    setAuthState("none");
    router.push("/login");
  }

  function handleAdminLogout() {
    localStorage.removeItem("mycalinan_uid");
    localStorage.removeItem("mycalinan_token");
    localStorage.removeItem("mycalinan_username");
    localStorage.removeItem("mycalinan_role");
    sessionStorage.removeItem("mycalinan_uid");
    sessionStorage.removeItem("mycalinan_token");
    sessionStorage.removeItem("mycalinan_username");
    sessionStorage.removeItem("mycalinan_role");

    setAuthState("none");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50">
      {/* Brand bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-canopy-800 px-6 py-3 sm:px-10">
        <div className="justify-self-start">
          <label className="sr-only" htmlFor="lang-switch">
            Language
          </label>
          <select
            id="lang-switch"
            value={lang}
            onChange={(e) => setLang(e.target.value as "en" | "ceb")}
            className="rounded-full border border-white/30 bg-transparent px-3 py-1 text-sm font-medium text-white"
          >
            <option className="text-ink-900" value="en">ENG</option>
            <option className="text-ink-900" value="ceb">CEB</option>
          </select>
        </div>

        <Link href="/" className="justify-self-center flex items-center gap-3">
          <span
            className="font-display text-2xl font-semibold tracking-wide text-white sm:text-3xl"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
          >
            MyCalinan
          </span>
        </Link>

        {/*
          Only ONE of these renders at a time, based on authState:
          - "none"  -> plain Login link
          - "guest" -> plain "Exit Guest Mode" button (no dropdown, no account)
          - "user"  -> account dropdown (Business Profile / Submit Business Form / Log out)
          - "admin" -> plain Logout button, no dropdown
        */}
        <div className="justify-self-end">
          {authState === "none" && (
            <Link
              href="/login"
              className="rounded-full bg-durian-500 px-4 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-durian-400"
            >
              Login
            </Link>
          )}

          {authState === "guest" && (
            <button
              onClick={handleGuestLogout}
              className="rounded-full bg-durian-500 px-4 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-durian-400"
            >
              Exit Guest Mode
            </button>
          )}

          {authState === "user" && (
            <AccountDropdown label="My Account" onLogout={handleUserLogout} />
          )}

          {authState === "admin" && (
            <button
              onClick={handleAdminLogout}
              className="rounded-full bg-durian-500 px-4 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-durian-400"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Menu bar */}
      <nav className="border-b-2 border-canopy-600 bg-canopy-100 px-6 py-3 sm:px-10">
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-[15px]">
          <li>
            <NavDropdown label="Explore" links={EXPLORE_LINKS} />
          </li>
          <li>
            <NavDropdown label="Documents" links={DOCUMENT_LINKS} />
          </li>
          {DIRECT_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="py-2 font-semibold text-ink-900 transition hover:text-canopy-700"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}