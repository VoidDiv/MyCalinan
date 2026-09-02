// scripts/link-food.js
//
// Same pattern as link-shopping.js / link-lifestyle.js / link-community.js
// / link-finance.js / link-transport.js — links each Food & Dining photo
// in Firebase Storage (making it public) and writes a matching document
// into a new "food" Firestore collection.
// Run with:
//   node scripts/link-food.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran the
//    earlier link-*.js scripts)
// 2. serviceAccountKey.json in project root (already there from
//    earlier runs)
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (e.g. "Penong_s Calinan.jpg"), inside a
// "Food/" folder. If your actual Storage filenames or folder differ,
// adjust STORAGE_FOLDER and/or the "photo" field per entry below to
// match exactly. NOTE: a couple of filenames use a curly apostrophe
// (’) and an ellipsis character (…) rather than plain ASCII — these
// are preserved exactly as in the source data below.

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
const STORAGE_FOLDER = "FoodAndDining/";

const ENTRIES = [
  {
    name: "Penong's Calinan",
    category: "Restaurant",
    lat: 7.1882,
    lng: 125.4542,
    tag: "Restaurant",
    pin: "🍗",
    mapsQuery: "Penong's Calinan District Davao City",
    description:
      "Calinan District — Founded in 2003, Penong's is known for its Chicken Inato and grilled chicken meals.",
    photo: "Penong_s Calinan.jpg",
  },
  {
    name: "TAPOK Grill and Seafood Restaurant",
    category: "Eatery",
    lat: 7.193,
    lng: 125.451,
    tag: "Eatery",
    pin: "🦐",
    mapsQuery: "Tapok Grill and Seafood Restaurant Acacia Calinan Davao City",
    description:
      "Bukidnon Highway, Acacia — Casual dining spot known for grilled seafood and a lively atmosphere.",
    photo: "TAPOK Grill and Seafood Restaurant.jpg",
  },
  {
    name: "Station Grill",
    category: "Restaurant",
    lat: 7.1875,
    lng: 125.453,
    tag: "Restaurant",
    pin: "🍖",
    mapsQuery: "Station Grill National Highway Calinan Davao City",
    description:
      "National Highway, Calinan District — Casual Filipino restaurant offering grilled specialties and comfort food.",
    photo: "Station Grill.png",
  },
  {
    name: "Dowens Food & Drinks",
    category: "Eatery",
    lat: 7.1878,
    lng: 125.4545,
    tag: "Eatery",
    pin: "🍽️",
    mapsQuery: "Dowens Food & Drinks Calinan District Davao City",
    description: "Calinan District — Small local eatery serving affordable meals and refreshments.",
    photo: "DOWENS FOOD & DRINKS.png",
  },
  {
    name: "Kabawan Sa Calinan",
    category: "Eatery",
    lat: 7.1885,
    lng: 125.4522,
    tag: "Eatery",
    pin: "🍲",
    mapsQuery: "Kabawan Sa Calinan Davao-Bukidnon Highway Calinan Davao City",
    description: "Davao–Bukidnon Highway, Calinan Poblacion — Well-known eatery serving hearty local dishes.",
    photo: "Kabawan Sa Calinan.png",
  },
  {
    name: "Laher's Lechon Haus",
    category: "Eatery",
    lat: 7.188,
    lng: 125.4538,
    tag: "Eatery",
    pin: "🐷",
    mapsQuery: "Laher's Lechon Haus Villafuerte Street Calinan Davao City",
    description: "Villafuerte Street, Calinan Poblacion — Local lechon eatery known for roasted pork.",
    photo: "Laher_s Lechon Haus.jpg",
  },
  {
    name: "Kwekens Carenderia",
    category: "Eatery",
    lat: 7.19,
    lng: 125.4543,
    tag: "Eatery",
    pin: "🍱",
    mapsQuery: "Kwekens Carenderia Datu Abing Street Calinan Davao City",
    description: "Datu Abing Street, Calinan Poblacion — Small carinderia serving affordable lutong-bahay meals.",
    photo: "Kwekens Carenderia.png",
  },
  {
    name: "Onen's Chicken House",
    category: "Eatery",
    lat: 7.1902,
    lng: 125.4544,
    tag: "Eatery",
    pin: "🍗",
    mapsQuery: "Onen's Chicken House Datu Abing Street Calinan Davao City",
    description: "Datu Abing Street, Calinan Poblacion — Fried chicken spot offering affordable meals.",
    photo: "Onen\u2019s Chicken House.png",
  },
  {
    name: "Kunam Chicken House",
    category: "Eatery",
    lat: 7.1877,
    lng: 125.454,
    tag: "Eatery",
    pin: "🍗",
    mapsQuery: "Kunam Chicken House Calinan Poblacion Davao City",
    description: "Calinan Poblacion — Local fried chicken eatery offering affordable chicken meals.",
    photo: "Kunam Chicken House.png",
  },
  {
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1903,
    lng: 125.4543,
    tag: "Eatery",
    pin: "🍗",
    mapsQuery: "Nam Manok Chicken House Datu Abing St Calinan Davao City",
    description: "Datu Abing St, Calinan District — Local chicken house offering fried chicken and chicken meals.",
    photo: "Nam\u2026Manok Chicken House Branch 1.png",
  },
  {
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1868,
    lng: 125.4535,
    tag: "Eatery",
    pin: "🍗",
    mapsQuery: "Nam Manok Chicken House Purok 32 Roman Diaz St Calinan Davao City",
    description: "Purok 32 Roman Diaz St, Calinan District — Local chicken house offering chicken meals.",
    photo: "Nam\u2026Manok Chicken Branch 2.png",
  },
  {
    name: "Nam…Manok Chicken House",
    category: "Eatery",
    lat: 7.1872,
    lng: 125.4548,
    tag: "Eatery",
    pin: "🍗",
    mapsQuery: "Nam Manok Chicken House Canete Building Calinan Davao City",
    description: "Canete Building, Calinan District — Local chicken house offering chicken meals.",
    photo: "Nam\u2026Manok Chicken House Branch 3.png",
  },
  {
    name: "Minute Burger",
    category: "Fast-Food",
    lat: 7.1904,
    lng: 125.4542,
    tag: "Fast-Food",
    pin: "🍔",
    mapsQuery: "Minute Burger Datu Abing St Calinan Davao City",
    description: "Datu Abing St, Calinan District — Affordable burger meals and Buy 1, Take 1 offerings.",
    photo: "Minute Burger1.png",
  },
  {
    name: "Minute Burger",
    category: "Fast-Food",
    lat: 7.1873,
    lng: 125.4514,
    tag: "Fast-Food",
    pin: "🍔",
    mapsQuery: "Minute Burger Aurora St Calinan Davao City",
    description: "Aurora St, Calinan District — Affordable burger meals and Buy 1, Take 1 offerings.",
    photo: "Minute Burger2.png",
  },
  {
    name: "Jollibee",
    category: "Fast-Food",
    lat: 7.1872,
    lng: 125.4549,
    tag: "Fast-Food",
    pin: "🍟",
    mapsQuery: "Jollibee Canete Building Calinan Davao City",
    description: "Canete Building, Calinan District — Fast-food branch serving popular Filipino fast-food meals.",
    photo: "Jollibee.png",
  },
  {
    name: "Kopikuys",
    category: "Cafe",
    lat: 7.1876,
    lng: 125.4536,
    tag: "Café",
    pin: "☕",
    mapsQuery: "Kopikuys Calinan Davao City",
    description: "Calinan District — Local café offering coffee, drinks, and light meals.",
    photo: "Kopikuys.jpg",
  },
  {
    name: "Hikaru de Cielo Cafe",
    category: "Cafe",
    lat: 7.195,
    lng: 125.45,
    tag: "Café",
    pin: "☕",
    mapsQuery: "Hikaru de Cielo Cafe Calinan Davao City",
    description: "Purok 21, San Roque, Davao–Bukidnon Hwy — Cozy café-restaurant with a scenic atmosphere.",
    photo: "Hikaru de Cielo Cafe.jpg",
  },
  {
    name: "Kapekol Calinan",
    category: "Cafe",
    lat: 7.1878,
    lng: 125.4541,
    tag: "Café",
    pin: "☕",
    mapsQuery: "Kapekol Calinan Poblacion Davao City",
    description: "Calinan Poblacion — Small budget-friendly coffee stall.",
    photo: "Kapekol.png",
  },
  {
    name: "TeaTuh Cafe",
    category: "Cafe",
    lat: 7.188,
    lng: 125.4537,
    tag: "Café",
    pin: "🧋",
    mapsQuery: "TeaTuh Cafe Villafuerte Street Calinan Poblacion Davao City",
    description: "Villafuerte Street, Calinan Poblacion — Coffee and milk tea shop.",
    photo: "TeaTuh Cafe.png",
  },
  {
    name: "Machatuals",
    category: "Cafe",
    lat: 7.1893,
    lng: 125.4562,
    tag: "Café",
    pin: "🍵",
    mapsQuery: "Machatuals Calinan Poblacion Davao City",
    description: "R. Magsaysay St, Calinan — Milk tea and matcha drink shop.",
    photo: "Machatuals.jpg",
  },
  {
    name: "Rose Bakeshop",
    category: "Bakeshop",
    lat: 7.1884,
    lng: 125.4521,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Rose Bakeshop Davao-Bukidnon Hwy Calinan Davao City",
    description: "Davao–Bukidnon Hwy, Calinan — Bakery offering breads and pastries.",
    photo: "Rose Bakeshop1.png",
  },
  {
    name: "Rose Bakeshop",
    category: "Bakeshop",
    lat: 7.1857,
    lng: 125.4578,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Rose Bakeshop De Lara St Calinan Davao City",
    description: "De Lara St, Calinan District — Bakery offering breads and pastries.",
    photo: "Rose Bakeshop2.png",
  },
  {
    name: "Panadero Bakeshop",
    category: "Bakeshop",
    lat: 7.1866,
    lng: 125.453,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Panadero Bakeshop Fausta St Calinan Davao City",
    description: "Fausta St, National Highway, Calinan — Bakery offering everyday breads and pastries.",
    photo: "Panadero Bakeshop1.png",
  },
  {
    name: "Panadero Bakeshop",
    category: "Bakeshop",
    lat: 7.187,
    lng: 125.4533,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Panadero Bakeshop Purok 30 Calinan Davao City",
    description: "Purok 30, Calinan — Bakery offering everyday breads and pastries.",
    photo: "Panadero Bakeshop2.png",
  },
  {
    name: "Manolette Bakeshop",
    category: "Bakeshop",
    lat: 7.1881,
    lng: 125.4536,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Manolette Bakeshop Villafuerte St Calinan District Davao City",
    description: "Villafuerte St, Calinan District — Local bakery offering bread, cakes, and pastries.",
    photo: "Manolette Bakeshop1.png",
  },
  {
    name: "Manolette Bakeshop",
    category: "Bakeshop",
    lat: 7.1873,
    lng: 125.4514,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Manolette Bakeshop Aurora Calinan District Davao City",
    description: "Aurora St, Calinan District — Local bakery offering bread, cakes, and pastries.",
    photo: "Manolette Bakeshop2.jpg",
  },
  {
    name: "Nikka's Breadhaus",
    category: "Bakeshop",
    lat: 7.1869,
    lng: 125.4533,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "Nikka's Breadhaus H. Garcia Street Corner Roman Diaz St Calinan Davao City",
    description: "H. Garcia St corner Roman Diaz St, Calinan Poblacion — Local bakery.",
    photo: "Nikka_s Breadhaus.jpg",
  },
  {
    name: "A&A Breadhaus",
    category: "Bakeshop",
    lat: 7.1882,
    lng: 125.4537,
    tag: "Bakeshop",
    pin: "🍞",
    mapsQuery: "A&A Breadhaus Villafuerte St Calinan Davao City",
    description: "Villafuerte St, Calinan — Local bakery offering breads, cakes, and pastries.",
    photo: "A&A Breadhaus.jpg",
  },
  {
    name: "Starlett Night Bar",
    category: "Bar",
    lat: 7.1876,
    lng: 125.454,
    tag: "KTV Bar",
    pin: "🎤",
    mapsQuery: "Starlett Night Bar Calinan Davao City",
    description: "Calinan District — Casual nightlife spot offering music and social entertainment.",
    photo: "Starlett Night Bar.png",
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
  console.log(`Linking ${ENTRIES.length} food & dining places...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("food").add({
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