// scripts/link-barangaycertification.js
//
// Same pattern as link-hotspots.js / link-food.js / link-community.js —
// links each Barangay Certification photo in Firebase Storage (making it
// public) and writes a matching document into a "documents" Firestore
// collection.
// Run with:
//   node scripts/link-barangaycertification.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran the
//    earlier link-*.js scripts)
// 2. serviceAccountKey.json in project root (already there)
//
// ASSUMPTION: your two images are uploaded to Storage inside a
// "Documents/" folder, named exactly "Baranggay-Certification1.png"
// and "Baranggay-Certification2.png". If your actual Storage filenames
// differ, adjust the "photo" field per entry below to match exactly.

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
const STORAGE_FOLDER = "Documents/";

const ENTRIES = [
  {
    name: "Barangay Certification",
    photo: "Baranggay-Certification1.png",
    order: 1,
  },
  {
    name: "Barangay Certification",
    photo: "Baranggay-Certification2.png",
    order: 2,
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
  console.log(`Linking ${ENTRIES.length} document images...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("documents").add({
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