"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import WovenDivider from "./WovenDivider";

type Committee = {
  name: string;
  members: string[]; // mga kauban sa committee
};

type BacMember = {
  role: string; // Chair, Vice Chair, Secretary, Member
  name: string;
};

type Official = {
  name: string;
  position: string;
  photo?: string;
  committees?: Committee[]; // committees nga iyang gi-handle
  bac?: BacMember[]; // Bids and Awards Committee composition
  term?: string; // pananglitan "2023–2026"
  office?: string; // pananglitan "Barangay Hall, Mon–Fri 8AM–5PM"
  about?: string; // mubo nga description
};

// Lebel 1
const CAPTAIN: Official | null = {
  name: "Pedrito C. Angco",
  position: "Punong Barangay",
  photo:
    "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FPedrito%20C.%20Angco-Punong%20Barangay.jpg?alt=media&token=ffd91fb8-052f-45fc-81e8-06c3c90e2a82",
};

// Lebel 2: Sangguniang Barangay
const KAGAWADS: Official[] = [
  {
    name: "Mary Ann Theresa S. Lee",
    position: "Barangay Kagawad",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FMary%20Ann%20Theresa%20S.%20Lee-Barangay%20Kagawad.jpg?alt=media&token=b79b314e-0693-484b-9e79-7d05b590e78a",
    committees: [
      { name: "Finance, Ways and Means", members: ["Pepito", "Junsay"] },
      {
        name: "Women and Children's Welfare",
        members: ["Junsay", "Camelotes"],
      },
      { name: "Health and Sanitation", members: ["Pepito", "Fermendoza"] },
      { name: "Bids and Awards", members: ["Pepito", "Junsay"] },
    ],
    bac: [
      { role: "Chair", name: "SB Mem Mary Ann Theresa S. Lee" },
      { role: "Vice Chair", name: "SB Mem Geomarey P. Pepito" },
      { role: "Secretary", name: "SB Mem Noel P. Fermendoza" },
      { role: "Member", name: "SB Mem Leonardo G. Camelotes" },
      { role: "Member", name: "SB Mem Joel V. Junsay" },
    ],
  },
  {
    name: "Leonardo G. Camelotes",
    position: "Barangay Kagawad",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FLeonardo%20G.%20Camelotes-Barangay%20Kagawad.jpg?alt=media&token=2877d8a8-7ece-49bf-9b82-7dded5449e26",
    committees: [
      {
        name: "Infrastructure Maintenance and Improvement of Government Structures and Roads",
        members: ["Fermendoza", "Lee"],
      },
      {
        name: "Street Lights and Water Resources",
        members: ["Fermendoza", "Junsay"],
      },
    ],
  },
  {
    name: "Geomarey P. Pepito",
    position: "Barangay Kagawad",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FGeomarey%20P.%20Pepito-Barangay%20Kagawad.jpg?alt=media&token=b5746f12-0a65-45f6-a2d1-16bcc3f15b29",
    committees: [
      {
        name: "Education & Human Resource Development",
        members: ["Lee", "Junsay"],
      },
      { name: "Tourism and Beautification", members: ["Lee", "Camelotes"] },
    ],
  },
  {
    name: "Noel P. Fermendoza",
    position: "Barangay Kagawad",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FNoel%20P.%20Fermendoza-Barangay%20Kagawad.jpg?alt=media&token=35405fab-ca46-4615-ba2b-cdd13fdffe52",
    committees: [
      {
        name: "Agriculture and Irrigation Facilities",
        members: ["Camelotes", "Junsay"],
      },
      { name: "Trade and Industry", members: ["Lee", "Camelotes"] },
      {
        name: "Cooperative and Non-Government Organizations",
        members: ["Camelotes", "Pepito"],
      },
      {
        name: "Environmental Protection and Solid Waste",
        members: ["Camelotes", "Junsay"],
      },
    ],
  },
  {
    name: "Joel V. Junsay",
    position: "Barangay Kagawad",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FJoel%20V.%20Junsay-Barangay%20Kagawad.jpg?alt=media&token=a5a5854f-0bf6-4c60-ad91-9fb88006456d",
    committees: [
      { name: "Purok Affairs", members: ["Fermendoza", "Lee"] },
      {
        name: "Social Services, Elderly and PWD, and Inter-Faith",
        members: ["Fermendoza", "Lee"],
      },
      {
        name: "Rules and Ethics, Laws and Ordinances",
        members: ["Fermendoza", "Simangan", "Lee"],
      },
    ],
  },
  {
    name: "Allan John S. Simangan",
    position: "Barangay Kagawad",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FAllan%20John%20S.%20Simangan-Barangay%20Kagawad.jpg?alt=media&token=f45b9697-42e0-498a-97a6-4e5aee9efa6d",
    committees: [
      { name: "Public Order, Peace and Safety", members: ["Pepito", "Junsay"] },
      { name: "Games and Amusement", members: ["Pepito", "Junsay"] },
      { name: "LGBTQ", members: ["Lee", "Camelotes"] },
      {
        name: "Public Transport and Terminal Planning",
        members: ["Pepito", "Junsay"],
      },
    ],
  },
];

// Lebel 3: Barangay staff
const STAFF: Official[] = [
  {
    name: "Golda Mier D. Cajes",
    position: "Barangay Secretary",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FGolda%20Mier%20D.%20Cajes-Barangay%20Secretary.jpg?alt=media&token=3ea60380-f8a1-4702-b9c3-f4c2014f518b",
  },
  {
    name: "Jimmy P. Janiola",
    position: "Barangay Treasurer",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FJimmy%20P.%20Janiola-Barangay%20Treasurer.jpg?alt=media&token=85e1db44-4340-4a4b-8b78-f58c5638ee1e",
  },
];

// Lebel 4: Sectoral representatives
const SECTORAL: Official[] = [
  {
    name: "Mahali Albin G. Sicat",
    position: "SK Chairman",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FMahali%20Albin%20G.%20Sicat-SK%20Chairman.jpg?alt=media&token=d41617c7-3ae7-476f-81ef-a0c0cb22c147",
    committees: [
      {
        name: "Youth Welfare and Sports Development",
        members: ["Lee", "Junsay"],
      },
    ],
  },
  {
    name: "Mariano L. Monoy Jr.",
    position: "IPMR",
    photo:
      "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2FMariano%20L.%20Monoy%20JR-IPMR.jpg?alt=media&token=52aabab7-dfa5-4a7a-b86d-e15de1049058",
    committees: [
      {
        name: "Indigenous People's Welfare",
        members: ["Junsay", "Pepito"],
      },
      {
        name: "Disaster Risk Reduction Management",
        members: ["Fermendoza", "Sicat"],
      },
    ],
  },
];

function initials(name: string) {
  const parts = name
    .split(" ")
    .filter((w) => w && !/^(jr|sr|ii|iii)\.?$/i.test(w));
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
      {people.map((o, i) => (
        <div key={o.position + i} className="w-[44%] sm:w-[30%]">
          <Card o={o} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

export default function BarangayOfficials() {
  const [selected, setSelected] = useState<Official | null>(null);

  return (
    <section className="bg-cream px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl">
          Barangay officials
        </h2>
        <WovenDivider tone="cream" />

        {CAPTAIN && (
          <div className="mx-auto mt-8 w-[60%] sm:w-[30%]">
            <Card o={CAPTAIN} big onSelect={setSelected} />
          </div>
        )}

        <GroupTitle>Sangguniang Barangay</GroupTitle>
        <Group people={KAGAWADS} onSelect={setSelected} />

        <GroupTitle>Barangay staff</GroupTitle>
        <Group people={STAFF} onSelect={setSelected} />

        <GroupTitle>Sectoral representatives</GroupTitle>
        <Group people={SECTORAL} onSelect={setSelected} />
      </div>

      <OfficialModal o={selected} onClose={() => setSelected(null)} />
    </section>
  );
}