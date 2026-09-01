// scripts/link-shopping.js
//
// Same pattern as link-lifestyle.js / link-community.js / link-finance.js
// / link-transport.js — links each Shopping & Store photo in Firebase
// Storage (making it public) and writes a matching document into a new
// "shopping" Firestore collection.
// Run with:
//   node scripts/link-shopping.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran the
//    earlier link-*.js scripts)
// 2. serviceAccountKey.json in project root (already there from
//    earlier runs)
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (e.g. "Gaisano Grand Calinan.jpg"),
// inside a "Shopping/" folder. If your actual Storage filenames or
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
const STORAGE_FOLDER = "Shopping/";

const ENTRIES = [
  {
    name: "Gaisano Grand Calinan",
    category: "Mall & Grocery",
    lat: 7.1905,
    lng: 125.4558,
    tag: "Mall",
    pin: "🛍️",
    mapsQuery: "Gaisano+Grand+Calinan+Davao+City",
    address: "Davao–Bukidnon Highway, Calinan Poblacion, Davao City",
    description:
      "Main shopping mall in Calinan District featuring a supermarket, department store, food stalls, and retail services.",
    photo: "Gaisano Grand Calinan.jpg",
  },
  {
    name: "NCCC Calinan",
    category: "Mall & Grocery",
    lat: 7.1897,
    lng: 125.4548,
    tag: "Department Store",
    pin: "🏬",
    mapsQuery: "NCCC+Calinan+Davao+City",
    address: "Davao–Bukidnon Highway, Calinan Poblacion, Davao City",
    description: "Small community shopping center providing basic shopping, groceries, and everyday services.",
    photo: "NCCC Calinan.jpg",
  },
  {
    name: "Lots For Less",
    category: "Mall & Grocery",
    lat: 7.189,
    lng: 125.453,
    tag: "Supermarket",
    pin: "🛒",
    mapsQuery: "Lots+For+Less+Calinan+Davao+City",
    address: "De Lara St, Calinan District, Davao City",
    description: "Budget-friendly grocery store known for affordable products, discounted prices, and value-for-money essentials.",
    photo: "Lots For Less.jpg",
  },
  {
    name: "Felcris Supermarket Inc.",
    category: "Mall & Grocery",
    lat: 7.1885,
    lng: 125.4525,
    tag: "Supermarket",
    pin: "🛒",
    mapsQuery: "Felcris+Supermarket+Calinan+Davao+City",
    address: "De Lara St, Calinan District, Davao City",
    description: "Offers groceries, snacks, household items, and clothing at organized, budget-friendly prices.",
    photo: "Felcris Supermarket Inc..jpg",
  },
  {
    name: "Multiple-Eight Merchandise",
    category: "General Merchandise",
    lat: 7.191,
    lng: 125.456,
    tag: "General Merchandise",
    pin: "🏪",
    mapsQuery: "Multiple+Eight+Merchandise+Davao-Bukidnon+Hwy+Calinan+Davao+City",
    address: "Bukidnon Hwy, Calinan Poblacion, Davao City",
    description: "Budget-friendly general grocery store selling low-priced food items, snacks, and household goods.",
    photo: "Multiple-Eight Merchandise.png",
  },
  {
    name: "Four Star Merchandise",
    category: "General Merchandise",
    lat: 7.1902,
    lng: 125.4542,
    tag: "General Merchandise",
    pin: "🏪",
    mapsQuery: "Four+Star+Merchandise+Purok+30+Calinan+Poblacion+Davao+City",
    address: "Purok 30, Calinan Poblacion, Davao City",
    description: "General merchandise and school supply store offering retail goods and everyday essentials.",
    photo: "Four Star Merchandise.png",
  },
  {
    name: "Rillan Trading",
    category: "General Merchandise",
    lat: 7.1895,
    lng: 125.4535,
    tag: "Trading Store",
    pin: "🏪",
    mapsQuery: "Rillan+Trading+Villafuerte+St+Calinan+Davao+City",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Local trading store selling school supplies, general merchandise, and small business items.",
    photo: "Rillan Trading.png",
  },
  {
    name: "Ploya Marketing",
    category: "General Merchandise",
    lat: 7.1893,
    lng: 125.4533,
    tag: "School & Office Supplies",
    pin: "📚",
    mapsQuery: "Ploya+Marketing+Villafuerte+St+Calinan+Davao+City",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Specializes in school supplies, office materials, and general retail goods.",
    photo: "Ploya Marketing.png",
  },
  {
    name: "KSC Calinan",
    category: "Mall & Grocery",
    lat: 7.1891,
    lng: 125.4531,
    tag: "Department Store",
    pin: "🏬",
    mapsQuery: "KSC+Calinan+Villafuerte+St+Calinan+Davao+City",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Department-style store offering clothing, footwear, school supplies, and household goods.",
    photo: "KSC Calinan.jpg",
  },
  {
    name: "BCG Trading",
    category: "General Merchandise",
    lat: 7.1912,
    lng: 125.4562,
    tag: "Utility Supply Store",
    pin: "📦",
    mapsQuery: "BCG+Trading+Purok+13+Davao-Bukidnon+Road+Calinan+Davao+City",
    address: "Purok 13, Davao–Bukidnon Road, Calinan, Davao City",
    description: "Focuses on store equipment, containers, ice chests, fish boxes, and utility hardware.",
    photo: "BCG Trading.jpg",
  },
  {
    name: "D & D Calinan Plasticware",
    category: "General Merchandise",
    lat: 7.1913,
    lng: 125.4563,
    tag: "Plasticware Store",
    pin: "🧴",
    mapsQuery: "D+%26+D+Calinan+Plasticware+Purok+13+Davao-Bukidnon+Road+Calinan+Davao+City",
    address: "Purok 13, Davao–Bukidnon Road, Calinan, Davao City",
    description: "Specializes in household plasticware, kitchen containers, and storage supplies.",
    photo: "D & D Calinan Plasticware.png",
  },
  {
    name: "A.L. Calinan Trading",
    category: "Mall & Grocery",
    lat: 7.1894,
    lng: 125.4534,
    tag: "Department Store",
    pin: "🏬",
    mapsQuery: "A.L.+Calinan+Trading+Villafuerte+St+Calinan+Davao+City",
    address: "Villafuerte Street, Calinan Poblacion, Davao City",
    description: "Popular general merchandise store for toys, party decorations, and back-to-school items.",
    photo: "A.L. Calinan Trading.jpg",
  },
  {
    name: "JW KIMHIM Trading",
    category: "General Merchandise",
    lat: 7.1915,
    lng: 125.4565,
    tag: "Wholesale Trading",
    pin: "📦",
    mapsQuery: "JW+KIMHIM+Trading+Davao-Bukidnon+Hwy+Calinan+Davao+City",
    address: "Davao - Bukidnon Hwy, Calinan District, Davao City",
    description: "Wholesale distributor of plastic containers, storage products, and retail merchandise.",
    photo: "JW KIMHIM Trading.png",
  },
  {
    name: "Calinan Skylight Hardware",
    category: "Hardware & Construction",
    lat: 7.1888,
    lng: 125.4528,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Calinan+Skylight+Hardware+R.+Magsaysay+St+Calinan+Davao+City",
    address: "R. Magsaysay St, Calinan District, Davao City",
    description: "Provides comprehensive construction, electrical, and plumbing supplies.",
    photo: "Calinan Skylight Hardware.jpg",
  },
  {
    name: "Calinan Blue Star Hardware",
    category: "Hardware & Construction",
    lat: 7.1886,
    lng: 125.4526,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Calinan+Blue+Star+Hardware+R.+Magsaysay+St+Calinan+Davao+City",
    address: "R. Magsaysay St, Calinan District, Davao City",
    description: "Supplies construction and maintenance materials for contractors and households.",
    photo: "Calinan Blue Star Hardware.jpg",
  },
  {
    name: "Edaka Hardware",
    category: "Hardware & Construction",
    lat: 7.1892,
    lng: 125.4532,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Edaka+Hardware+Villafuerte+St+Calinan+Davao+City",
    address: "Villafuerte St, Calinan District, Davao City",
    description: "Neighborhood hardware store supplying wholesale and retail building materials and tools.",
    photo: "Edaka Hardware.jpg",
  },
  {
    name: "Polycrop Marketing",
    category: "Hardware & Construction",
    lat: 7.189,
    lng: 125.453,
    tag: "Hardware Store",
    pin: "🔧",
    mapsQuery: "Polycrop+Marketing+Villafuerte+St+Calinan+Davao+City",
    address: "Villafuerte St, Calinan District, Davao City",
    description: "Key supplier of construction tools and building supplies for local development.",
    photo: "POLYCROP MARKETING.jpg",
  },
  {
    name: "KCT Motor Vehicle Parts & Accessories",
    category: "Motor Parts",
    lat: 7.1878,
    lng: 125.4518,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "KCT+Motor+Vehicle+Parts+%26+Accessories+Shop+Roman+Diaz+St+Calinan+Davao+City",
    address: "Roman Diaz St, Calinan District, Davao City",
    description: "Motorcycle parts retailer and repair shop offering spare parts and basic servicing.",
    photo: "KCT Motor Vehicle Parts & Accessories Shop.jpg",
  },
  {
    name: "LYR Motorparts Calinan",
    category: "Motor Parts",
    lat: 7.188,
    lng: 125.452,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "LYR+Motorparts+Calinan+32+Malanos+St+Calinan+Davao+City",
    address: "32 Malanos St, Calinan District, Davao City",
    description: "Authorized motorparts retailer and distributor of motorcycle accessories.",
    photo: "LYR Motorparts Calinan.jpg",
  },
  {
    name: "Motohub Davao Calinan Branch",
    category: "Motor Parts",
    lat: 7.1908,
    lng: 125.4555,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "Motohub+Davao+Calinan+Branch+Davao-Bukidnon+Rd+Calinan+Davao+City",
    address: "Davao-Bukidnon Rd, Calinan District, Davao City",
    description: "Offers motorcycle riding gear, protective equipment, and custom parts.",
    photo: "Motohub Davao Calinan Branch.png",
  },
  {
    name: "Roan Parts And Accessories (Branch)",
    category: "Motor Parts",
    lat: 7.1876,
    lng: 125.4516,
    tag: "Motorshop Branch",
    pin: "🏍️",
    mapsQuery: "Roan+Parts+And+Accessories+Purok+32+Roman+Diaz+St+Calinan+Davao+City",
    address: "Purok 32, Roman Diaz St, Calinan, Davao City",
    description: "Motorcycle parts branch supplying maintenance supplies and aftermarket accessories.",
    photo: "Roan Parts And Accessories.png",
  },
  {
    name: "Roan Parts And Accessories (Main)",
    category: "Motor Parts",
    lat: 7.1874,
    lng: 125.4514,
    tag: "Motorshop Main Branch",
    pin: "🏍️",
    mapsQuery: "Roan+Parts+And+Accessories+H.+Quiambao+St+Roman+Diaz+St+Calinan+Davao+City",
    address: "H. Quiambao St cor. Roman Diaz St, Calinan, Davao City",
    description: "Main motorcycle parts store stocking replacement components and maintenance items.",
    photo: "Roan Parts And Accessories.jpg",
  },
  {
    name: "Pagaran Motor Parts",
    category: "Motor Parts",
    lat: 7.1872,
    lng: 125.4512,
    tag: "Motorshop",
    pin: "🏍️",
    mapsQuery: "Pagaran+Motor+Parts+Datu+Abing+St+Calinan+Davao+City",
    address: "Datu Abing St, Calinan District, Davao City",
    description: "Automotive and motorcycle spare parts retailer serving mechanics and vehicle owners.",
    photo: "Pagaran Motor Parts.jpg",
  },
  {
    name: "OEM Auto Parts Supply",
    category: "Motor Parts",
    lat: 7.1906,
    lng: 125.4553,
    tag: "Motorshop",
    pin: "🔩",
    mapsQuery: "OEM+AUTO+PARTS+SUPPLY+Davao-Bukidnon+Rd+Calinan+Davao+City",
    address: "Davao-Bukidnon Rd, Calinan District, Davao City",
    description: "Automotive replacement parts supply offering car and motorcycle maintenance goods.",
    photo: "OEM AUTO PARTS SUPPLY.jpg",
  },
  {
    name: "LSAC Enterprises",
    category: "General Merchandise",
    lat: 7.1898,
    lng: 125.454,
    tag: "General Store",
    pin: "🏪",
    mapsQuery: "LSAC+Enterprises+Calinan+Davao+City",
    address: "Calinan Poblacion, Davao City",
    description: "Local retail store providing general household products, goods, and daily essentials.",
    photo: "LSAC ENTERPRISES.png",
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
  console.log(`Linking ${ENTRIES.length} shopping & store places...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("shopping").add({
        name: entry.name,
        category: entry.category,
        lat: entry.lat,
        lng: entry.lng,
        tag: entry.tag,
        pin: entry.pin,
        mapsQuery: entry.mapsQuery,
        address: entry.address,
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