/* ============================================================
   FILE: lib/calibotKnowledge.ts   (NEW)
   Static, code-defined facts Calibot can answer WITHOUT touching
   Firestore (zero reads). Only included in the prompt when the
   question looks related, so it costs no tokens otherwise.
   ============================================================ */

import {
  BARANGAY_NAME,
  CAPTAIN,
  KAGAWADS,
  STAFF,
  SECTORAL,
  type Official,
} from "./barangayOfficials";
import {
  TRICYCLE_FARE,
  TRICYCLE_FARE_NOTE,
} from "./tricycleFare";

const OFFICIAL_KEYWORDS = [
  "official", "officials", "captain", "punong barangay", "kagawad",
  "councilor", "councilors", "sangguniang barangay", "sb member",
  "barangay secretary", "barangay treasurer", "treasurer", "secretary",
  "sk", "sk chairman", "chairman", "ipmr", "committee", "committees",
  "bac", "bids and awards", "who is the", "head of the barangay",
];

const FARE_KEYWORDS = [
  "tricycle", "trike", "fare", "pamasahe", "pasahe", "minimum fare",
];

// Surnames (e.g. "angco", "lee") so "who is Kagawad Junsay" also matches.
const OFFICIAL_SURNAMES: string[] = [
  ...(CAPTAIN ? [CAPTAIN] : []),
  ...KAGAWADS,
  ...STAFF,
  ...SECTORAL,
]
  .map((o) => o.name.split(" ").filter((w) => !/^(jr|sr|ii|iii)\.?$/i.test(w)).pop()!)
  .map((s) => s.toLowerCase())
  .filter((s) => s.length >= 4); // skip "lee" -> too generic; "kagawad lee" still matches "kagawad"

function padded(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()} `;
}

function hasAny(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(` ${k} `) || q.includes(` ${k}s `));
}

function officialLine(o: Official): string {
  const committees = o.committees?.length
    ? " | Committees: " +
      o.committees
        .map((c) => `${c.name} (with ${c.members.join(", ")})`)
        .join("; ")
    : "";
  return `- ${o.name} - ${o.position}${committees}`;
}

function officialsText(): string {
  const bac = KAGAWADS.find((k) => k.bac)?.bac;
  const lines = [
    `BARANGAY OFFICIALS OF ${BARANGAY_NAME.toUpperCase()}:`,
    ...(CAPTAIN ? [officialLine(CAPTAIN)] : []),
    "Sangguniang Barangay (Kagawads):",
    ...KAGAWADS.map(officialLine),
    "Barangay staff:",
    ...STAFF.map(officialLine),
    "Sectoral representatives:",
    ...SECTORAL.map(officialLine),
  ];
  if (bac?.length) {
    lines.push(
      "Bids and Awards Committee (BAC): " +
        bac.map((m) => `${m.role}: ${m.name}`).join("; ")
    );
  }
  return lines.join("\n");
}

function fareText(): string {
  return [
    "TRICYCLE FARE (Calinan area):",
    `- Regular adult minimum fare: PHP ${TRICYCLE_FARE.regular}`,
    `- Discounted minimum fare (students, PWD, senior citizens): PHP ${TRICYCLE_FARE.discounted}`,
    `- ${TRICYCLE_FARE_NOTE}`,
  ].join("\n");
}

export type StaticKnowledge = {
  text: string;
  matched: { officials: boolean; fare: boolean };
};

export function getStaticKnowledge(query: string): StaticKnowledge {
  const q = padded(query);
  const officials =
    hasAny(q, OFFICIAL_KEYWORDS) || OFFICIAL_SURNAMES.some((s) => q.includes(` ${s} `));
  const fare = hasAny(q, FARE_KEYWORDS);

  const parts: string[] = [];
  if (officials) parts.push(officialsText());
  if (fare) parts.push(fareText());

  return { text: parts.join("\n\n"), matched: { officials, fare } };
}