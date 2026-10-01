import { adminDb } from "./firebaseAdmin";
import { TRICYCLE_FARE, TRICYCLE_FARE_NOTE } from "./tricycleFare";

const BARANGAY_NAME = "Barangay Calinan Poblacion";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_RULES_IN_PROMPT = 8;
const MAX_RULE_CHARS = 500;

type Committee = { name: string; members: string[] };
type BacMember = { role: string; name: string };
type Official = {
  id: string;
  name: string;
  position: string;
  group?: "captain" | "kagawad" | "staff" | "sectoral";
  order?: number;
  committees?: Committee[];
  bac?: BacMember[];
  public?: boolean;
};
type Rule = { id: string; title: string; body: string; order?: number; public?: boolean };

const OFFICIAL_KEYWORDS = [
  "official", "officials", "captain", "punong barangay", "kagawad",
  "councilor", "councilors", "sangguniang barangay", "sb member",
  "barangay secretary", "barangay treasurer", "treasurer", "secretary",
  "sk", "sk chairman", "chairman", "ipmr", "committee", "committees",
  "bac", "bids and awards", "who is the", "head of the barangay",
];

const RULE_KEYWORDS = [
  "rule", "regulation", "ordinance", "policy", "curfew", "allowed",
  "prohibited", "bawal", "balaod", "ordinansa", "violation", "penalty", "fine",
];

const FARE_KEYWORDS = ["tricycle", "trike", "fare", "pamasahe", "pasahe", "minimum fare"];

const GENERIC_WORDS = new Set([
  "barangay", "calinan", "poblacion", "rules", "rule", "regulations",
  "regulation", "what", "does", "about", "there", "tell", "mga", "ang",
]);

/* ---------- Firestore (cached) ---------- */

const cache = new Map<string, { at: number; docs: unknown[] }>();

async function loadCached<T extends { order?: number; public?: boolean }>(
  name: string
): Promise<T[]> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.docs as T[];

  try {
    const snap = await adminDb.collection(name).limit(200).get();
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as unknown as T)
      .filter((d) => d.public !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    cache.set(name, { at: Date.now(), docs });
    return docs;
  } catch (error) {
    console.error(`Firestore read failed for ${name}:`, error);
    return (hit?.docs as T[]) ?? []; // serve stale rather than nothing
  }
}

/* ---------- Helpers ---------- */

function padded(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()} `;
}

function hasAny(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(` ${k} `) || q.includes(` ${k}s `));
}

function surnameOf(name: string): string {
  const parts = name.split(" ").filter((w) => !/^(jr|sr|ii|iii)\.?$/i.test(w));
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function officialLine(o: Official): string {
  const committees = o.committees?.length
    ? " | Committees: " +
      o.committees.map((c) => `${c.name} (with ${c.members.join(", ")})`).join("; ")
    : "";
  return `- ${o.name} - ${o.position}${committees}`;
}

function officialsText(officials: Official[]): string {
  const by = (g: Official["group"]) => officials.filter((o) => o.group === g);
  const bac = officials.find((o) => o.bac?.length)?.bac;

  const lines = [
    `BARANGAY OFFICIALS OF ${BARANGAY_NAME.toUpperCase()}:`,
    ...by("captain").map(officialLine),
    "Sangguniang Barangay (Kagawads):",
    ...by("kagawad").map(officialLine),
    "Barangay staff:",
    ...by("staff").map(officialLine),
    "Sectoral representatives:",
    ...by("sectoral").map(officialLine),
  ];
  if (bac?.length) {
    lines.push("Bids and Awards Committee (BAC): " + bac.map((m) => `${m.role}: ${m.name}`).join("; "));
  }
  return lines.join("\n");
}

function rulesText(rules: Rule[], query: string): string {
  const words = padded(query)
    .trim()
    .split(" ")
    .filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w));

  const scored = rules.map((r) => {
    const hay = padded(`${r.title} ${r.body}`);
    const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    return { r, score };
  });

  // Specific question: best matches first. Generic question: show the first rules.
  const anyMatch = scored.some((s) => s.score > 0);
  const picked = (anyMatch ? scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score) : scored)
    .slice(0, MAX_RULES_IN_PROMPT)
    .map((s) => s.r);

  if (picked.length === 0) return "";

  const lines = picked.map((r) => {
    const body = r.body.length > MAX_RULE_CHARS ? r.body.slice(0, MAX_RULE_CHARS) + "..." : r.body;
    return `- ${r.title}: ${body}`;
  });
  const note =
    rules.length > picked.length
      ? `(Showing ${picked.length} of ${rules.length} rules. Tell the user more are listed in the Rules and Regulations section of MyCalinan.)`
      : "";
  return [`RULES AND REGULATIONS OF ${BARANGAY_NAME.toUpperCase()}:`, ...lines, note]
    .filter(Boolean)
    .join("\n");
}

function fareText(): string {
  return [
    "TRICYCLE FARE (Calinan area):",
    `- Regular adult minimum fare: PHP ${TRICYCLE_FARE.regular}`,
    `- Discounted minimum fare (students, PWD, senior citizens): PHP ${TRICYCLE_FARE.discounted}`,
    `- ${TRICYCLE_FARE_NOTE}`,
  ].join("\n");
}

/* ---------- Public API ---------- */

export type StaticKnowledge = {
  text: string;
  matched: { officials: boolean; rules: boolean; fare: boolean };
};

export async function getStaticKnowledge(query: string): Promise<StaticKnowledge> {
  const q = padded(query);

  // Officials are cached, so loading them to check surnames is cheap.
  const officialsData = await loadCached<Official>("barangayOfficials");
  const surnames = officialsData.map((o) => surnameOf(o.name)).filter((s) => s.length >= 4);

  const officials = hasAny(q, OFFICIAL_KEYWORDS) || surnames.some((s) => q.includes(` ${s} `));
  const rules = hasAny(q, RULE_KEYWORDS);
  const fare = hasAny(q, FARE_KEYWORDS);

  const parts: string[] = [];
  if (officials) parts.push(officialsText(officialsData));
  if (rules) {
    const rulesData = await loadCached<Rule>("barangayRules");
    const text = rulesText(rulesData, query);
    if (text) parts.push(text);
  }
  if (fare) parts.push(fareText());

  return { text: parts.join("\n\n"), matched: { officials, rules, fare } };
}