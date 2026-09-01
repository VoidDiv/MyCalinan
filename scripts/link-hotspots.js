// scripts/link-hotspots.js
//
// Same pattern as link-food.js / link-shopping.js / link-lifestyle.js /
// link-community.js / link-finance.js / link-transport.js — links each
// Hotspot photo in Firebase Storage (making it public) and writes a
// matching document into a new "hotspots" Firestore collection.
// Run with:
//   node scripts/link-hotspots.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran the
//    earlier link-*.js scripts)
// 2. serviceAccountKey.json in project root (already there from
//    earlier runs)
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (e.g. "Malagos Garden Resort.jpg"),
// inside a "Hotspots/" folder. If your actual Storage filenames or
// folder differ, adjust STORAGE_FOLDER and/or the "photo" field per
// entry below to match exactly. NOTE: the first entry's photo is a
// .webp file, not .jpg/.png like the rest — check it uploaded with
// that same extension in Storage.

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
const STORAGE_FOLDER = "Hotspots/";

const ENTRIES = [
  {
    name: "Bamboo Sanctuary",
    category: "Nature Spot",
    tag: "Nature Spot",
    lat: 7.1673,
    lng: 125.4483,
    mapsQuery: "Bamboo+Sanctuary+Tamayong+Davao+City",
    location: "Sitio Sto. Niño, Barangay Tamayong, Calinan District, Davao City",
    description:
      "A peaceful eco-tourism spot in Calinan, Davao City, known for its relaxing bamboo scenery, fresh air, and calm natural surroundings. Popular for nature walks, scenic photos, and quiet relaxation away from the busy city.",
    photo: "bamboo-sanctuary-and-ecological-park.webp",
  },
  {
    name: "Philippine Eagle Center (PEC)",
    category: "Wildlife & Conservation",
    tag: "Wildlife & Conservation",
    lat: 7.2242,
    lng: 125.4159,
    mapsQuery: "Philippine+Eagle+Center+Malagos+Davao+City",
    location: "Purok 5, Malagos-Baguio District, Davao City",
    description:
      "A conservation and education facility in Malagos, Davao City, dedicated to protecting the critically endangered Philippine Eagle. Home to the country's national bird and other wildlife — great for families, nature lovers, and visitors.",
    photo: "PhpEagleCenter.png",
  },
  {
    name: "Malagos Garden Resort",
    category: "Eco Tourism",
    tag: "Eco Tourism",
    lat: 7.2255,
    lng: 125.417,
    mapsQuery: "Malagos+Garden+Resort+Davao+City",
    location: "Malagos-Baguio District, Davao City",
    description:
      "A 12-hectare eco-tourism destination in Malagos, Davao City, known for its lush gardens, nature attractions, and award-winning Malagos Chocolate. Offers a relaxing and educational experience promoting sustainable tourism.",
    photo: "Malagos Garden Resort.jpg",
  },
  {
    name: "Malagos Chocolate Museum",
    category: "Cultural Attraction",
    tag: "Cultural Attraction",
    lat: 7.2257,
    lng: 125.4173,
    mapsQuery: "Malagos+Chocolate+Museum+Davao+City",
    location: "Malagos-Baguio District, Davao City",
    description:
      "The first chocolate museum in the Philippines, inside Malagos Garden Resort in Davao City. An interactive attraction showcasing the country's growing cacao industry and the award-winning chocolates of Malagos.",
    photo: "Malagos Chocolate Museum.jpg",
  },
  {
    name: "Tamayong Prayer Mountain",
    category: "Spiritual Retreat",
    tag: "Spiritual Retreat",
    lat: 7.169,
    lng: 125.451,
    mapsQuery: "Tamayong+Prayer+Mountain+Calinan+Davao+City",
    location: "Tamayong, Calinan District, Davao City",
    description:
      "Also known as the Garden of Eden Restored, this private spiritual retreat in Tamayong, Calinan serves as a place for prayer, meditation, worship, and spiritual reflection in a serene highland setting.",
    photo: "Tamayong Prayer Mountain.jpg",
  },
  {
    name: "Lantaw Bukid Resort",
    category: "Resort / Leisure",
    tag: "Resort / Leisure",
    lat: 7.1419,
    lng: 125.4844,
    mapsQuery: "Lantaw+Bukid+Resort+Davao+City",
    location: "Campo Cienco Road, Barangay Los Amigos, Tugbok District, Davao City",
    description:
      "A family-friendly inland resort known for its peaceful countryside atmosphere, open green spaces, pools, cottages, and relaxing nature views. A popular budget-friendly getaway for outings, reunions, and weekend swimming.",
    photo: "Lantaw Bukid Resort.jpg",
  },
  {
    name: "Calinan Public Market",
    category: "Local Market",
    tag: "Local Market",
    lat: 7.1875,
    lng: 125.4562,
    mapsQuery: "Calinan+Public+Market+Calinan+Davao+City",
    location: "Calinan District, Davao City",
    description:
      "The main marketplace in Calinan where locals and farmers trade fresh produce and daily goods. Known for experiencing local life and buying fresh fruits, vegetables, durian, souvenirs, and local snacks.",
    photo: "Calinan Public Market.jpg",
  },
  {
    name: "Calinan Park",
    category: "Community Park",
    tag: "Community Park",
    lat: 7.1878,
    lng: 125.4558,
    mapsQuery: "Calinan+Park+Calinan+Davao+City",
    location: "H Quiambao St, Calinan District, Davao City",
    description:
      "A small community park in the heart of Calinan offering a quiet green space where locals can relax, socialize, or take a break. A common meeting spot for commuters, students, and families in the poblacion area.",
    photo: "Calinan Park.png",
  },
  {
    name: "Calinan Commercial Center",
    category: "Commercial Hub",
    tag: "Commercial Hub",
    lat: 7.1876,
    lng: 125.456,
    mapsQuery: "Calinan+Commercial+Center+Calinan+Davao+City",
    location: "H Quiambao St, Calinan District, Davao City",
    description:
      "A local hub in Calinan where people gather for daily needs, small businesses, and community activities. Reflects the active local life in the district and serves nearby residents and visitors passing through the area.",
    photo: "Brows1.png",
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
  console.log(`Linking ${ENTRIES.length} hotspot places...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("hotspots").add({
        name: entry.name,
        category: entry.category,
        lat: entry.lat,
        lng: entry.lng,
        tag: entry.tag,
        mapsQuery: entry.mapsQuery,
        location: entry.location,
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