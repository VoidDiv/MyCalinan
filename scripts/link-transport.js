// scripts/link-transport.js
//
// Same pattern as link-healthcare.js — links each Transport &
// Utilities photo in Firebase Storage (making it public) and writes
// a matching document into a new "transport" Firestore collection.
// Run with:
//   node scripts/link-transport.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran
//    link-healthcare.js / link-education.js)
// 2. serviceAccountKey.json in project root (already there from
//    earlier runs)
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (Petron1.png, CALMALBA TODA.jpg, etc.),
// inside a "Transport/" folder. If your actual Storage filenames or
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
const STORAGE_FOLDER = "Transport/";

const ENTRIES = [
  {
    name: "Petron",
    category: "Gas Station",
    lat: 7.1855,
    lng: 125.45,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery: "Petron+Davao+Buda+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Davao–Buda National Highway, Calinan District — Full-service fuel station in Petron's nationwide network providing fuel, lubricants, and related vehicle services.",
    photo: "Petron1.png",
  },
  {
    name: "Petron",
    category: "Gas Station",
    lat: 7.1885,
    lng: 125.4562,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery:
      "Petron+Villafuerte+Street+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Villafuerte St., Calinan District — Part of Petron Corporation's nationwide network providing fuel, lubricants, and vehicle services for motorists in the Calinan area.",
    photo: "Petron2.png",
  },
  {
    name: "Shell",
    category: "Gas Station",
    lat: 7.1845,
    lng: 125.4495,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery:
      "Shell+Davao+Buda+National+Highway+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Davao–Buda National Highway, Purok 16, Calinan — Shell service station offering fuel, car care, and vehicle maintenance as part of Shell's nationwide retail network.",
    photo: "Shell.png",
  },
  {
    name: "Caltex",
    category: "Gas Station",
    lat: 7.1905,
    lng: 125.4545,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery: "Caltex+Datu+Abing+Street+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Datu Abing St., Calinan — Convenient fueling point strategically placed along key transport routes toward downtown Davao and nearby municipalities.",
    photo: "Caltex1.jpg",
  },
  {
    name: "Caltex",
    category: "Gas Station",
    lat: 7.187,
    lng: 125.451,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery:
      "Caltex+Davao-Bukidnon+Road+Corner+Aurora+Calinan+Davao+City+Davao+del+Sur",
    description:
      "Davao–Bukidnon Road, Corner Aurora, Calinan — Fueling point connecting major transport routes for residents and travelers within western Davao City.",
    photo: "Caltex2.jpg",
  },
  {
    name: "SEAOIL",
    category: "Gas Station",
    lat: 7.186,
    lng: 125.4575,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery: "SEAOIL+Fausta+St+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Fausta St., Calinan District — Fuel service station under SEAOIL Philippines Inc., known for locally refined and imported petroleum products across a nationwide chain.",
    photo: "SEAOIL.jpg",
  },
  {
    name: "MyGas",
    category: "Gas Station",
    lat: 7.1875,
    lng: 125.4515,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery: "MyGas+Aurora+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Aurora St., Calinan District — Part of My Gas Petroleum Corporation's growing regional network of service stations across Southern Mindanao.",
    photo: "MyGas.jpg",
  },
  {
    name: "Gazz",
    category: "Gas Station",
    lat: 7.1862,
    lng: 125.4522,
    tag: "Gas Station",
    pin: "⛽",
    mapsQuery: "Gazz+De+Lara+St+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "De Lara St., Calinan — Compact roadside station ideal for motorcycles, tricycles, and private vehicles along the busy Davao–Bukidnon Road.",
    photo: "Gazz.png",
  },
  {
    name: "CALMALBA TODA",
    category: "Transport Terminal",
    lat: 7.1887,
    lng: 125.4556,
    tag: "Transport Terminal",
    pin: "🚐",
    mapsQuery:
      "CALMALBA+TODA+R.+Magsaysay+St+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "R. Magsaysay St., Calinan — Also known as Malagos Terminal, a key transport hub connecting Malagos and neighboring barangays to the wider Davao metropolitan area.",
    photo: "CALMALBA TODA.jpg",
  },
  {
    name: "CALTRANSCO (CALODA)",
    category: "Transport Terminal",
    lat: 7.189,
    lng: 125.4558,
    tag: "Transport Terminal",
    pin: "🚐",
    mapsQuery:
      "CALTRANSCO+CALODA+R.+Magsaysay+St+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "R. Magsaysay St., Calinan — Member-driven transport service cooperative providing organized public transportation within and around Davao del Sur.",
    photo: "CALTRANSCO (CALODA).jpg",
  },
  {
    name: "Third District Transport Cooperative",
    category: "Transport Terminal",
    lat: 7.1892,
    lng: 125.456,
    tag: "Transport Terminal",
    pin: "🚐",
    mapsQuery:
      "Third+District+Transport+Cooperative+R.+Magsaysay+St+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "R. Magsaysay St., Calinan — CDA-recognized transport cooperative serving the Davao Region's third district with organized public transport services.",
    photo: "Third District Transport Cooperative.png",
  },
  {
    name: "Jeepney Terminal Mintal & Davao",
    category: "Transport Terminal",
    lat: 7.1858,
    lng: 125.4578,
    tag: "Transport Terminal",
    pin: "🚐",
    mapsQuery:
      "Jeepney+Terminal+Mintal+and+Davao+Fausta+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Fausta, Calinan District — Central loading and unloading point for jeepneys connecting Mintal, Calinan, and surrounding barangays to the city proper.",
    photo: "Jeepney Terminal Mintal & Davao.png",
  },
  {
    name: "Anatolio Taxi Terminal",
    category: "Transport Terminal",
    lat: 7.188,
    lng: 125.455,
    tag: "Transport Terminal",
    pin: "🚐",
    mapsQuery:
      "Anatolio+Taxi+Terminal+Calinan+Poblacion+Calinan+District+Davao+City+Davao+del+Sur",
    description:
      "Calinan Poblacion — Local taxi terminal offering faster point-to-point travel for residents, shoppers, workers, and visitors heading to and from Davao City.",
    photo: "Anatolio Taxi Terminal.png",
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
  console.log(`Linking ${ENTRIES.length} transport & utilities places...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("transport").add({
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