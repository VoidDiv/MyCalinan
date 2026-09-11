// scripts/link-history.js
//
// Same pattern as link-hotspots.js and the other link-*.js scripts —
// links each History page photo in Firebase Storage (making it public)
// and writes a matching document into a new "history" Firestore
// collection.
// Run with:
//   node scripts/link-history.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran the
//    earlier link-*.js scripts)
// 2. serviceAccountKey.json in project root (already there)
//
// ASSUMPTION: your images are uploaded to Storage inside a "History/"
// folder, with the exact same filenames used in the page component
// (including spaces, periods, and parentheses). Note entry 12 has a
// DOUBLE space in "Old  Calinan Building (1990s).jpg" — that's
// intentional, matching the original code exactly.

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
const STORAGE_FOLDER = "History/";

const ENTRIES = [
  { name: "Before Colonial Period", photo: "Before Colonial Period1.jpg", order: 1 },
  { name: "Before Colonial Period", photo: "Before Colonial Period2.png", order: 2 },
  { name: "Lt. Cipriano Villafuerte Sr.", photo: "Lt. Cipriano Villafuerte Sr..png", order: 3 },
  { name: "Paulino Naraval", photo: "Paulino Naraval.png", order: 4 },
  { name: "Growth of Calinan", photo: "Growth-1.png", order: 5 },
  { name: "Growth of Calinan", photo: "Growth-2.png", order: 6 },
  { name: "Challenges and Rebuilding", photo: "Challenges-1.png", order: 7 },
  { name: "Challenges and Rebuilding", photo: "Challenges-2.png", order: 8 },
  { name: "Calinan Today", photo: "Calinan Today1.png", order: 9 },
  { name: "Calinan Today", photo: "Calinan Today2.png", order: 10 },
  { name: "Holy Cross Students (1953)", photo: "Holy Cross Students (1953).jpg", order: 11 },
  { name: "Old Calinan Building (1990s)", photo: "Old  Calinan Building (1990s).jpg", order: 12 },
  { name: "Calinan Police Station (1970)", photo: "Calinan Police Station (1970).jpg", order: 13 },
  { name: "Calinan Central Elementary (1970)", photo: "Calinan Central Elemetary (1970).jpg", order: 14 },
  { name: "Employees of Calinan District Hall (1954)", photo: "Employees of Calinan District Hall (1954).jpg", order: 15 },
  { name: "Botica Carina (2010)", photo: "Botica Carina (2010).jpg", order: 16 },
  { name: "Sacred Heart Parish of Calinan (2012)", photo: "Sacred Heart Parish of Calinan (2012).jpg", order: 17 },
  { name: "Calinan Police Station Inauguration (2013)", photo: "Calinan Police Station Inauguration (2013).jpg", order: 18 },
  { name: "Calinan Poblacion Signage (2019)", photo: "Calinan Poblacion Signage (2019).jpg", order: 19 },
];

async function linkPhoto(filename) {
  const storagePath = `${STORAGE_FOLDER}${filename}`;
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found in Storage at path: ${storagePath}`);
  }

  await file.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(
    storagePath
  ).replace(/%2F/g, "/")}`;

  return { url, path: storagePath };
}

async function seed() {
  console.log(`Linking ${ENTRIES.length} history images...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("history").add({
        name: entry.name,
        order: entry.order,
        imageUrl: url,
        imagePath,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`✓ Linked: ${entry.photo}`);
    } catch (err) {
      console.error(`✗ Failed on "${entry.photo}":`, err.message);
    }
  }

  console.log("Done.");
  process.exit(0);
}

seed();