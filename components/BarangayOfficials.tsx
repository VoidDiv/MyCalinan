"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import WovenDivider from "./WovenDivider";

type Committee = {
  name: string;
  members: string[]; // mga kauban sa committee
};

type BacMember = {
  role: string; // Chair, Vice Chair, Secretary, Member
  name: string;
};

type OfficialGroup = "captain" | "kagawad" | "staff" | "sectoral";

type Official = {
  id: string;
  name: string;
  position: string;
  group?: OfficialGroup;
  order?: number;
  public?: boolean;
  photo?: string;
  committees?: Committee[]; // committees nga iyang gi-handle
  bac?: BacMember[]; // Bids and Awards Committee composition
  term?: string; // pananglitan "2023–2026"
  office?: string; // pananglitan "Barangay Hall, Mon–Fri 8AM–5PM"
  about?: string; // mubo nga description
};

function initials(name: string) {
  const parts = name
    .split(" ")
    .filter((w) => w && !/^(jr|sr|ii|iii)\.?$/i.test(w));
  if (parts.length === 0) return "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ["A","B"] -> "A and B"; ["A","B","C"] -> "A, B, and C"
function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function Avatar({ o, sizes }: { o: Official; sizes: string }) {
  return o.photo ? (
    <Image
      src={o.photo}
      alt={o.name}
      fill
      sizes={sizes}
      className="object-cover object-top"
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-canopy-100 font-display text-3xl font-semibold text-canopy-800">
      {initials(o.name)}
    </span>
  );
}

function Card({
  o,
  big = false,
  onSelect,
}: {
  o: Official;
  big?: boolean;
  onSelect: (o: Official) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(o)}
      className="group block w-full text-center focus:outline-none"
      aria-label={`Tan-awa ang detalye ni ${o.name}`}
    >
      <div
        className={`relative mx-auto aspect-square overflow-hidden rounded-full border-2 border-canopy-600/30 shadow-md transition group-hover:scale-105 group-hover:shadow-lg group-focus-visible:ring-4 group-focus-visible:ring-canopy-600/40 ${
          big ? "w-40 sm:w-48" : "w-28 sm:w-36"
        }`}
      >
        <Avatar o={o} sizes="(min-width: 640px) 192px, 160px" />
      </div>
      <h3 className="mt-3 font-display text-base font-semibold text-canopy-900 sm:text-lg">
        {o.name}
      </h3>
      <p className="text-sm text-ink-500 sm:text-base">{o.position}</p>
    </button>
  );
}

function OfficialModal({
  o,
  onClose,
}: {
  o: Official | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!o) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [o, onClose]);

  if (!o) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={o.name}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-full border-2 border-canopy-600/30">
          <Avatar o={o} sizes="128px" />
        </div>

        <h3 className="mt-4 font-display text-xl font-semibold text-canopy-900">
          {o.name}
        </h3>
        <p className="text-sm text-ink-500">{o.position}</p>

        {o.committees && o.committees.length > 0 && (
          <div className="mt-5 text-left">
            <h4 className="font-mono text-xs uppercase tracking-widest text-durian-500">
              Committees nga gi-handle
            </h4>
            <ul className="mt-2 space-y-3">
              {o.committees.map((c) => (
                <li key={c.name} className="text-sm">
                  <p className="font-semibold text-canopy-800">
                    Committee on {c.name}
                  </p>
                  <p className="text-ink-500">
                    Members: {joinNames(c.members)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {o.bac && o.bac.length > 0 && (
          <div className="mt-5 rounded-xl bg-canopy-100/60 p-4 text-left">
            <h4 className="font-mono text-xs uppercase tracking-widest text-durian-500">
              Bids and Awards Committee (BAC)
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm">
              {o.bac.map((m) => (
                <li key={m.role + m.name}>
                  <span className="font-semibold text-canopy-800">
                    {m.role}:
                  </span>{" "}
                  <span className="text-ink-500">{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {o.term && (
          <p className="mt-4 text-left text-sm">
            <span className="font-semibold text-canopy-800">Termino: </span>
            {o.term}
          </p>
        )}
        {o.office && (
          <p className="mt-2 text-left text-sm">
            <span className="font-semibold text-canopy-800">Opisina: </span>
            {o.office}
          </p>
        )}
        {o.about && (
          <p className="mt-3 text-left text-sm text-ink-500">{o.about}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-canopy-600 py-2 font-medium text-white hover:bg-canopy-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-12 text-center font-mono text-xs uppercase tracking-widest text-durian-500">
      {children}
    </h3>
  );
}

// Flex (dili grid) aron ma-center ang katapusang linya
function Group({
  people,
  onSelect,
}: {
  people: Official[];
  onSelect: (o: Official) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-8 sm:gap-x-6">
      {people.map((o) => (
        <div key={o.id} className="w-[44%] sm:w-[30%]">
          <Card o={o} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

export default function BarangayOfficials() {
  const [selected, setSelected] = useState<Official | null>(null);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDocs(collection(db, "barangayOfficials"))
      .then((snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Official)
          .filter((o) => o.public !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        if (!cancelled) setOfficials(items);
      })
      .catch((err) => {
        console.error("Failed to load barangay officials:", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const captain = officials.find((o) => o.group === "captain") ?? null;
  const kagawads = officials.filter((o) => o.group === "kagawad");
  const staff = officials.filter((o) => o.group === "staff");
  const sectoral = officials.filter((o) => o.group === "sectoral");

  return (
    <section className="bg-cream px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl">
          Barangay officials
        </h2>
        <WovenDivider tone="cream" />

        {loading && (
          <p className="mt-5 text-center font-mono text-sm text-ink-500 sm:mt-8">
            Loading officials...
          </p>
        )}

        {!loading && error && (
          <p className="mt-5 text-center font-mono text-sm text-ink-500 sm:mt-8">
            Unable to load officials right now.
          </p>
        )}

        {!loading && !error && officials.length === 0 && (
          <p className="mt-5 text-center font-mono text-sm text-ink-500 sm:mt-8">
            No officials posted yet.
          </p>
        )}

        {!loading && !error && officials.length > 0 && (
          <>
            {captain && (
              <div className="mx-auto mt-8 w-[60%] sm:w-[30%]">
                <Card o={captain} big onSelect={setSelected} />
              </div>
            )}

            {kagawads.length > 0 && (
              <>
                <GroupTitle>Sangguniang Barangay</GroupTitle>
                <Group people={kagawads} onSelect={setSelected} />
              </>
            )}

            {staff.length > 0 && (
              <>
                <GroupTitle>Barangay staff</GroupTitle>
                <Group people={staff} onSelect={setSelected} />
              </>
            )}

            {sectoral.length > 0 && (
              <>
                <GroupTitle>Sectoral representatives</GroupTitle>
                <Group people={sectoral} onSelect={setSelected} />
              </>
            )}
          </>
        )}
      </div>

      <OfficialModal o={selected} onClose={() => setSelected(null)} />
    </section>
  );
}