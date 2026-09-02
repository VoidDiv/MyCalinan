// scripts/link-community.js
//
// Same pattern as link-finance.js / link-transport.js / link-healthcare.js
// — links each Community (Churches, Cemeteries, Barangay Hall, District
// Hall) photo in Firebase Storage (making it public) and writes a
// matching document into a new "community" Firestore collection.
// Run with:
//   node scripts/link-community.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran the
//    earlier link-*.js scripts)
// 2. serviceAccountKey.json in project root (already there from
//    earlier runs)
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (e.g. "The Most Sacred Heart of Jesus
// Parish.png"), inside a "Community/" folder. If your actual Storage
// filenames or folder differ, adjust STORAGE_FOLDER and/or the
// "photo" field per entry below to match exactly.

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
const STORAGE_FOLDER = "Community/";

const ENTRIES = [
  {
    name: "The Most Sacred Heart of Jesus Parish",
    category: "Church",
    lat: 7.1903,
    lng: 125.4543,
    tag: "Church",
    pin: "⛪",
    mapsQuery:
      "The+Most+Sacred+Heart+of+Jesus+Parish+Datu+Abing+St+Calinan+Davao+City+Davao+del+Sur",
    description:
      "Datu Abing St., Calinan — Roman Catholic parish under the Archdiocese of Davao serving as the central place of worship for Calinan's Catholic community, offering daily Masses and full sacraments.",
    photo: "The Most Sacred Heart of Jesus Parish.png",
  },
  {
    name: "Calinan Central Adventist Church of Davao Mission",
    category: "Church",
    lat: 7.1845,
    lng: 125.4505,
    tag: "Church",
    pin: "⛪",
    mapsQuery:
      "Calinan+Central+Adventist+Church+of+Davao+Mission+Mc+Arthur+Highway+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "McArthur Highway, Calinan District — Seventh-day Adventist congregation under the Davao Mission, serving as a community worship center for members in the Davao Region.",
    photo: "Calinan Central Adventist Church of Davao Mission.png",
  },
  {
    name: "Iglesia Ni Cristo",
    category: "Church",
    lat: 7.1858,
    lng: 125.458,
    tag: "Church",
    pin: "⛪",
    mapsQuery:
      "Iglesia+Ni+Cristo+Purok+18+De+Lara+Street+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Purok 18, De Lara St., Calinan District — Local congregation of the international Christian organization headquartered in Quezon City, serving as a place of worship for INC members in the Calinan area.",
    photo: "Iglesia Ni Cristo1.png",
  },
  {
    name: "The Church of Jesus Christ of Latter-day Saints",
    category: "Church",
    lat: 7.1895,
    lng: 125.4548,
    tag: "Church",
    pin: "⛪",
    mapsQuery:
      "The+Church+of+Jesus+Christ+of+Latter-day+Saints+Lanzona+Subdivision+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    description:
      "Lanzona Subd., Calinan Poblacion — Local meetinghouse for the global Latter-day Saint community, offering weekly services and programs emphasizing faith in Jesus Christ and family values.",
    photo: "Iglesia Ni Cristo2.png",
  },
  {
    name: "International Bible Baptist Church",
    category: "Church",
    lat: 7.1883,
    lng: 125.4552,
    tag: "Church",
    pin: "⛪",
    mapsQuery:
      "International+Bible+Baptist+Church+Guiho+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    description:
      "Guiho Street, Calinan Poblacion — Baptist congregation offering worship services, Bible preaching, prayer meetings, youth fellowship, and outreach programs for the Calinan community.",
    photo: "International Bible Baptist Church.png",
  },
  {
    name: "Calinan Public Cemetery",
    category: "Cemetery",
    lat: 7.183,
    lng: 125.453,
    tag: "Public Cemetery",
    pin: "🪦",
    mapsQuery:
      "Calinan+Public+Cemetery+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Calinan Poblacion — Traditional public burial ground serving families and residents of Calinan, providing accessible burial services and long part of the district's history and heritage.",
    photo: "Calinan Public Cementery.png",
  },
  {
    name: "Calinan Private Cemetery",
    category: "Cemetery",
    lat: 7.1895,
    lng: 125.4565,
    tag: "Private Cemetery",
    pin: "🪦",
    mapsQuery:
      "Calinan+Memorial+Park+R.+Magsaysay+Street+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "R. Magsaysay Street, Calinan — Privately managed memorial park offering burial and commemorative services in a landscaped setting, part of Calinan's network of community memorial spaces.",
    photo: "Calinan Private Cementery.png",
  },
  {
    name: "Calinan Poblacion Barangay Hall",
    category: "Barangay Hall",
    lat: 7.1873,
    lng: 125.4513,
    tag: "Barangay Hall",
    pin: "🏛️",
    mapsQuery:
      "Calinan+Poblacion+Barangay+Hall+34+Aurora+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "34 Aurora, Calinan Poblacion — Primary local government office providing barangay clearances, certificates of residency, dispute mediation, peace and order coordination, and assistance programs.",
    photo: "Calinan Poblacion Barangay Hall.png",
  },
  {
    name: "Calinan District Hall",
    category: "District Hall",
    lat: 7.1878,
    lng: 125.4548,
    tag: "District Hall",
    pin: "🏛️",
    mapsQuery:
      "Calinan+District+Hall+H.+Quiambao+Street+Calinan+Poblacion+Davao+City+Davao+del+Sur",
    description:
      "H. Quiambao Street, Calinan Poblacion — District-level government office managing programs, administrative concerns, infrastructure coordination, and public services for all barangays under Calinan.",
    photo: "Calinan District Hall.png",
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
  console.log(`Linking ${ENTRIES.length} community places...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("community").add({
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