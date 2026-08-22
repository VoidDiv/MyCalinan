"use client";

import Link from "next/link";
import { useState } from "react";

const EXPLORE_LINKS = [
  { label: "Health", href: "/explore/health" },
  { label: "Education", href: "/explore/education" },
  { label: "Transport & Utilities", href: "/explore/transport-utilities" },
  { label: "Finance", href: "/explore/finance" },
  { label: "Community", href: "/explore/community" },
  { label: "Lifestyle", href: "/explore/lifestyle" },
  { label: "Shopping & Stores", href: "/explore/shopping" },
  { label: "Food & Dining", href: "/explore/food-dining" },
  { label: "Hotspots", href: "/explore/hotspots" },
];

const DOCUMENT_LINKS = [
  { label: "Police Clearance", href: "/documents/police-clearance" },
  { label: "Barangay Clearance", href: "/documents/barangay-clearance" },
  { label: "Barangay Certification", href: "/documents/barangay-certification" },
  { label: "Cedula", href: "/documents/cedula" },
  { label: "Get Postal ID", href: "/documents/postal-id" },
];

const DIRECT_LINKS = [
  { label: "Barangay Map", href: "/map" },
  { label: "History", href: "/history" },
  { label: "Hotlines", href: "/hotlines" },
  { label: "Announcements", href: "/announcements" },
  { label: "Events", href: "/events" },
];

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

export default function Navbar() {
  const [lang, setLang] = useState<"en" | "ceb">("en");

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

        <div className="justify-self-end">
          <Link
            href="/admin/login"
            className="rounded-full bg-durian-500 px-4 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-durian-400"
          >
            Login
          </Link>
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
