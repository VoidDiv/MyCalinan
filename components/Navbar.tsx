"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/Firebase"; // Baguhin ang path kung iba ang kinalalagyan ng Firebase.ts (e.g., "@/lib/Firebase")

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
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ceb">("en");
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Monitoring ng Auth State at Pagkuha ng Profile Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data().fullName) {
            setUserName(userDoc.data().fullName);
          } else {
            setUserName(user.displayName || user.email?.split("@")[0] || "User");
          }
        } catch (err) {
          console.error("Error fetching user name:", err);
          setUserName(user.email?.split("@")[0] || "User");
        }
      } else {
        const isGuest = sessionStorage.getItem("mycalinan_guest") === "true";
        if (isGuest) {
          setUserName("Guest");
        } else {
          setUserName(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handler para sa Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("mycalinan_token");
      localStorage.removeItem("mycalinan_username");
      localStorage.removeItem("mycalinan_role");
      sessionStorage.clear();
      setUserName(null);
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

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

        {/* User Profile & Auth Button Area */}
        <div className="justify-self-end flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-white/70">Loading...</span>
          ) : userName ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">
                Hello, <strong className="font-semibold text-durian-400">{userName}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-durian-500 px-4 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-durian-400"
            >
              Login
            </Link>
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