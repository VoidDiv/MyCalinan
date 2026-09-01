// scripts/link-finance.js
//
// Same pattern as link-transport.js / link-healthcare.js — links each
// Finance (Banks & Remittance) photo in Firebase Storage (making it
// public) and writes a matching document into a new "finance"
// Firestore collection.
// Run with:
//   node scripts/link-finance.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran
//    link-healthcare.js / link-education.js / link-transport.js)
// 2. serviceAccountKey.json in project root (already there from
//    earlier runs)
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (BDO.png, "BDO Network Bank.jpg", etc.),
// inside a "Finance/" folder. If your actual Storage filenames or
// folder differ, adjust STORAGE_FOLDER and/or the "photo" field per
// entry below to match exactly.

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const serviceAccount = require("../serviceAccountKey.json");

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "mycalinan.firebasestorage.app",
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

// CHANGE THIS if your uploaded files live in a different folder
// (check the Storage console file browser to confirm).
const STORAGE_FOLDER = "Finance/";

const ENTRIES = [
  {
    name: "BDO Calinan",
    category: "Bank",
    lat: 7.1876,
    lng: 125.4524,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "BDO+Calinan+WTKC+Realty+Bldg+Davao+Bukidnon+National+Highway+Calinan+Davao+City+Davao+del+Sur",
    description:
      "WTKC Realty Bldg., Davao–Bukidnon National Highway, Calinan — Branch of Banco de Oro Unibank, one of the largest banks in the Philippines, serving retail and commercial banking needs in the Calinan district.",
    photo: "BDO.png",
  },
  {
    name: "BDO Network Bank",
    category: "Bank",
    lat: 7.185,
    lng: 125.4498,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "BDO+Network+Bank+ONB+Calinan+Building+Davao+Buda+National+Hwy+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "ONB Calinan Building, Davao–Buda National Hwy — Formerly One Network Bank (ONB), serving farmers, employees, small businesses, and residents with savings, loans, ATM access, and money transfers.",
    photo: "BDO Network Bank.jpg",
  },
  {
    name: "PNB",
    category: "Bank",
    lat: 7.1882,
    lng: 125.4548,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "PNB+Davao+Calinan+LTH+Building+Davao+Bukidnon+Hwy+Calinan+Davao+City+Davao+del+Sur",
    description:
      "LTH Building, Davao–Bukidnon Hwy, Calinan — Full-service branch of the Philippine National Bank providing a range of banking and financial services to residents and businesses along the highway corridor.",
    photo: "PNB.png",
  },
  {
    name: "ChinaBank",
    category: "Bank",
    lat: 7.1888,
    lng: 125.4552,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "China+Bank+Honesto+Garcia+St+Calinan+Davao+Buda+National+Hwy+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Honesto Garcia St., Calinan District — Branch of China Banking Corporation, one of the Philippines' oldest private universal banks, serving individuals, businesses, and agricultural clients in the area.",
    photo: "ChinaBank1.png",
  },
  {
    name: "Landbank",
    category: "Bank",
    lat: 7.1878,
    lng: 125.4546,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "Landbank+Calinan+Purok+13+Palarca+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    description:
      "Purok 13, Palarca Street, Calinan Poblacion — Government bank branch offering savings accounts, ATM, loans, fund transfers, and government-related transactions for residents, farmers, and pensioners.",
    photo: "Landbank1.png",
  },
  {
    name: "Landbank",
    category: "Bank",
    lat: 7.1879,
    lng: 125.4547,
    tag: "Bank",
    pin: "🏦",
    mapsQuery:
      "Landbank+Calinan+Purok+13+Palarca+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    description:
      "Purok 13, Palarca Street, Calinan Poblacion — Convenient financial access for the Calinan community without traveling to downtown Davao, with full banking services and government transaction support.",
    photo: "Landbank2.jpg",
  },
  {
    name: "M Lhuillier",
    category: "Remittance",
    lat: 7.187,
    lng: 125.4512,
    tag: "Remittance Center",
    pin: "💸",
    mapsQuery:
      "M+Lhuillier+Calinan+Davao+Bukidnon+Hwy+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Davao–Bukidnon Highway, Calinan — Branch of M Lhuillier Financial Services providing quick-access pawning, money remittance, and financial solutions for the local community.",
    photo: "M Lhuillier.jpg",
  },
  {
    name: "Palawan Pawnshop",
    category: "Remittance",
    lat: 7.1886,
    lng: 125.456,
    tag: "Remittance Center",
    pin: "💸",
    mapsQuery:
      "Palawan+Pawnshop+Villafuerte+St+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Villafuerte St., Calinan — Palawan Express branch providing pawnbroking, money remittance, and payment solutions for residents and businesses in the Calinan Poblacion area.",
    photo: "Palawan Pawnshop.png",
  },
  {
    name: "Palawan Pawnshop",
    category: "Remittance",
    lat: 7.1865,
    lng: 125.4518,
    tag: "Remittance Center",
    pin: "💸",
    mapsQuery:
      "Palawan+Pawnshop+Davao+Bukidnon+Hwy+Calinan+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Davao–Bukidnon Highway, Calinan — Accessible pawnbroking, money remittance, and payment services for residents and businesses along the main highway in Calinan District.",
    photo: "Palawan Pawnshop1.png",
  },
];

async function linkPhoto(filename) {
  const storagePath = `${STORAGE_FOLDER}${filename}`;
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found in Storage at path: ${storagePath}`);
  }

  await file.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  return { url, path: storagePath };
}

async function seed() {
  console.log(`Linking ${ENTRIES.length} finance places...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("finance").add({
        name: entry.name,
        category: entry.category,
        lat: entry.lat,
        lng: entry.lng,
        tag: entry.tag,
        pin: entry.pin,
        mapsQuery: entry.mapsQuery,
        description: entry.description,
        imageUrl: url,
        imagePath,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`✓ Linked: ${entry.name}`);
    } catch (err) {
      console.error(`✗ Failed on "${entry.name}":`, err.message);
    }
  }

  console.log("Done.");
  process.exit(0);
}

seed();