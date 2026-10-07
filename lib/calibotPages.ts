/* ============================================================
   FILE: lib/calibotPages.ts
   What CaliBot knows about the pages whose content is written in the code
   (not in Firestore): the five document guides, the emergency hotlines, and
   the history of Calinan.

   Keep this file in step with those pages:
     app/documents/*            (Police Clearance, Barangay Clearance,
                                 Barangay Certification, Cedula, Postal ID)
     app/others/Hotlines/page.tsx
     app/others/History/page.tsx
   If you change a phone number or a requirement there, change it here too.

   getPageKnowledge(question) only returns the parts the question is about,
   so the prompt stays short (fewer tokens = lower cost).
   ============================================================ */

type DocumentGuide = {
  name: string;
  keywords: string[];
  about: string;
  requirements: string[];
  steps: string[];
  online?: string;
  reminder?: string;
};

const DOCUMENT_GUIDES: DocumentGuide[] = [
  {
    name: "Police Clearance",
    keywords: ["police clearance", "pnp clearance"],
    about: "Issued through the PNP. Can be applied for online.",
    requirements: ["Valid ID", "Barangay Clearance", "Recent 2x2 picture", "Processing fee"],
    steps: [
      "Register online or prepare the requirements",
      "Visit the police station",
      "Submit the documents and biometrics",
      "Pay the fee",
      "Wait for the release",
    ],
    online: "https://pnpclearance.ph",
    reminder: "Bring original IDs. Schedule online to avoid long lines.",
  },
  {
    name: "Barangay Clearance",
    keywords: ["barangay clearance", "brgy clearance"],
    about: "Certifies that you are a resident and have no pending issues in the community.",
    requirements: ["Valid ID", "Proof of Residency", "Community Tax Certificate (Cedula)", "Processing fee"],
    steps: [
      "Go to the Barangay Hall",
      "Fill out the request form",
      "Submit the required documents",
      "Pay the processing fee",
      "Wait for the release of the clearance",
    ],
    reminder: "Bring original IDs. Processing depends on barangay office hours.",
  },
  {
    name: "Barangay Certification",
    keywords: [
      "barangay certification", "barangay certificate", "brgy certificate", "brgy certification",
      "certificate of residency", "residency", "good moral",
    ],
    about:
      "Confirms specific information such as residency or good moral character. Common uses: proof of residency, good moral character, business requirements, school or job applications.",
    requirements: ["Valid ID", "Proof of Residency", "Community Tax Certificate (Cedula)", "Processing fee"],
    steps: [
      "Go to the Barangay Hall",
      "Request a Barangay Certification",
      "State your purpose clearly",
      "Submit the required documents",
      "Pay the processing fee",
      "Wait for the release",
    ],
    reminder: "State the purpose clearly; the content depends on what you need it for.",
  },
  {
    name: "Cedula (Community Tax Certificate)",
    keywords: ["cedula", "community tax certificate", "community tax", "ctc"],
    about: "A basic identification document from the local government, often needed for permits, notarization and government transactions.",
    requirements: [
      "Valid ID",
      "Personal information (name, address, birthdate)",
      "Income details (if applicable)",
      "Processing fee",
    ],
    steps: [
      "Apply online or visit the Barangay/Municipal Hall",
      "Provide your personal information",
      "Declare your income (if required)",
      "Pay the fee",
      "Receive your Cedula",
    ],
    online: "https://cedula.davaocity.gov.ph/Home/",
  },
  {
    name: "Postal ID",
    keywords: ["postal id", "postal", "phlpost", "post office"],
    about: "A government-issued ID from the Philippine Postal Corporation (PHLPost), widely accepted as a valid ID.",
    requirements: [
      "Properly filled-out application form",
      "Proof of identity (birth certificate, passport, etc.)",
      "Proof of address (barangay certificate, utility bill, etc.)",
      "Two copies of a valid ID (if available)",
      "Processing fee",
    ],
    steps: [
      "Get the application form online or at the Post Office in Calinan",
      "Fill out the form completely",
      "Prepare all the required documents",
      "Submit at the nearest Post Office",
      "Pay the processing fee",
      "Wait for delivery or claim the ID at the Davao Post Office",
    ],
    online: "https://www.postalidph.com/",
  },
];

/* Words that mean "a document question" but do not say which document */
const GENERIC_DOCUMENT_WORDS = [
  "document", "requirement", "clearance", "certificate", "certification", "papers", "paperwork",
  "requirements",
];

const HOTLINE_KEYWORDS = [
  "hotline", "emergency", "contact number", "phone number", "number", "contact", "call", "911",
  "police station", "police number", "fire", "fire station", "bfp", "barangay hall", "ambulance",
  "rescue", "accident", "tawag",
];

const HISTORY_KEYWORDS = [
  "history", "historical", "heritage", "origin", "founded", "founder", "bagobo", "datu", "abeng",
  "kolina", "villafuerte", "naraval", "called", "meaning", "war", "japanese", "kasaysayan",
];

const HOTLINES_TEXT = [
  "EMERGENCY HOTLINES (Calinan District, Davao City):",
  "- National Emergency Hotline: 911",
  "- Calinan Police Station No-10: (082) 295-0119 / 0982-295-0119. Location: H Quiambao St, Calinan District",
  "- Calinan Fire Station: (082) 295 0475 / 0946-925-5888. Location: H Quiambao St, Calinan District",
  "- Calinan Proper Barangay Hall: (082) 295 0191. Location: 34 Aurora, Calinan District",
  "- Safety note: stay calm and give the exact location and situation when calling.",
  "(No ambulance or hospital hotline is listed in MyCalinan; for medical emergencies say to call 911.)",
].join("\n");

const HISTORY_TEXT = [
  "HISTORY OF CALINAN (from the MyCalinan History page):",
  "- Before colonial times the area was forest, rivers and farmland, home to the Bagobo people led by tribal leaders such as Datu Abeng.",
  '- The name Calinan is believed to come from the Bagobo word "Kolina", meaning a stream with clear running water, connected to the Talomo River.',
  "- 1916: Paulino Naraval, a public school teacher from Luzon, became one of the first Christian settlers and helped introduce formal education.",
  "- 1920: Lt. Cipriano Villafuerte Sr. arrived and encouraged roads, bridges, schools and better farming, uniting indigenous communities and settlers.",
  "- 1927: the first sari-sari store opened. 1930: the Davao-Malagos Provincial Road was completed, bringing more families, traders and investors.",
  "- Agriculture (abaca, then bananas, durian, rice, corn and fruits) became the heart of the economy; Filipino, Chinese and Japanese settlers expanded trade.",
  "- World War II brought hardship; after the war the community rebuilt with schools, churches, businesses and plantations.",
  "- Mid-20th century: schools such as Holy Cross College of Calinan and the Most Sacred Heart of Jesus Parish became community centers.",
  "- Today Calinan Poblacion is a center for commerce, education, tourism and public services, known for fruit production (cacao and durian) and its heritage.",
].join("\n");

/* ---------- helpers ---------- */

function padded(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()} `;
}

function hasAny(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(` ${k} `) || q.includes(` ${k}s `));
}

function guideText(g: DocumentGuide): string {
  const lines = [
    `${g.name}: ${g.about}`,
    `  Requirements: ${g.requirements.join("; ")}`,
    `  Steps: ${g.steps.map((s, i) => `${i + 1}) ${s}`).join(" ")}`,
  ];
  if (g.online) lines.push(`  Apply online: ${g.online}`);
  if (g.reminder) lines.push(`  Reminder: ${g.reminder}`);
  return lines.join("\n");
}

/* ---------- public ---------- */

export type PageKnowledge = {
  text: string;
  matched: { documents: boolean; hotlines: boolean; history: boolean };
};

export function getPageKnowledge(question: string): PageKnowledge {
  const q = padded(question);

  const specific = DOCUMENT_GUIDES.filter((g) => hasAny(q, g.keywords));
  const generic = hasAny(q, GENERIC_DOCUMENT_WORDS);
  const guides = specific.length > 0 ? specific : generic ? DOCUMENT_GUIDES : [];

  // "police clearance" is a document question, not a hotline question
  const hotlines = hasAny(q, HOTLINE_KEYWORDS) && !(specific.length > 0 && !hasAny(q, ["hotline", "number", "call", "contact", "emergency"]));
  const history = hasAny(q, HISTORY_KEYWORDS);

  const parts: string[] = [];
  if (guides.length > 0) {
    parts.push(
      [
        "DOCUMENT GUIDES (MyCalinan gives guides only; it does not process applications. Fee amounts are not listed):",
        ...guides.map(guideText),
      ].join("\n")
    );
  }
  if (hotlines) parts.push(HOTLINES_TEXT);
  if (history) parts.push(HISTORY_TEXT);

  return {
    text: parts.join("\n\n"),
    matched: { documents: guides.length > 0, hotlines, history },
  };
}