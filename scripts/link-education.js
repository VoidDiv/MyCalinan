// scripts/link-education.js
//
// Same pattern as link-healthcare.js — links each Education photo
// in Firebase Storage (making it public) and writes a matching
// document into a new "education" Firestore collection. Run with:
//   node scripts/link-education.js
//
// SETUP:
// 1. npm install firebase-admin (already installed if you ran
//    link-healthcare.js)
// 2. serviceAccountKey.json in project root (Firebase console >
//    Project settings > Service accounts > Generate new private key)
//    — should already be there and gitignored from the healthcare run.
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (Calinan Central Elementary School.png,
// etc.), inside an "Education/" folder. If your actual Storage
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
const STORAGE_FOLDER = "Education/";

const ENTRIES = [
  {
    name: "Calinan Central Elementary School",
    tags: ["Elementary", "Public"],
    lat: 7.1895,
    lng: 125.4565,
    displayTag: "Public Elementary School",
    mapsQuery: "Calinan+Central+Elementary+School+Davao+City",
    address: "Purok 5, Barangay Calinan, Davao City",
    description:
      "One of the main public basic education institutions in the Calinan District, catering to learners from surrounding barangays.",
    photo: "Calinan Central Elementary School.png",
  },
  {
    name: "Lt. C. Villafuerte Sr. Elementary School",
    tags: ["Elementary", "Public"],
    lat: 7.1888,
    lng: 125.457,
    displayTag: "Public Elementary School",
    mapsQuery: "Lt.+C.+Villafuerte+Sr.+Elementary+School+Davao+City",
    address: "Duyac St., Calinan District, Davao City",
    description:
      "Provides accessible quality basic education for learners from Kindergarten to Grade 6 with active community programs.",
    photo: "Lt. C. Villafuerte Sr. Elementary School.png",
  },
  {
    name: "Calinan National High School",
    tags: ["High School", "Public"],
    lat: 7.1875,
    lng: 125.4575,
    displayTag: "Public High School",
    mapsQuery: "Calinan+National+High+School+Davao+City",
    address: "Duyac St., Calinan District, Davao City",
    description:
      "A major public secondary school under DepEd Davao City Division, offering junior and senior high school programs.",
    photo: "Calinan National High School.jpg",
  },
  {
    name: "Amigo School of Calinan",
    tags: ["Elementary", "High School", "Private"],
    lat: 7.186,
    lng: 125.452,
    displayTag: "Private Elementary & High School",
    mapsQuery: "Amigo+School+of+Calinan+Davao+City",
    address: "De Lara St., Calinan District, Davao City",
    description:
      "Private basic education school serving learners from surrounding barangays and upland communities with co-curricular programs.",
    photo: "Amigo School of Calinan.png",
  },
  {
    name: "St. Francis College of Davao Calinan",
    tags: ["High School", "Private"],
    lat: 7.184,
    lng: 125.459,
    displayTag: "Private High School",
    mapsQuery: "St.+Francis+College+of+Davao+Calinan+Davao+City",
    address: "Sunrise Village, Penano Street, Calinan",
    description:
      "Catholic secondary school recognized by DepEd as a Senior High School provider offering ABM, HUMSS, GAS, and TVL strands.",
    photo: "St. Francis College of Davao Calinan.jpg",
  },
  {
    name: "Philippine Nikkei Jin Kai School of Calinan",
    tags: ["Elementary", "High School", "Private"],
    lat: 7.175,
    lng: 125.448,
    displayTag: "Private Elementary & High School",
    mapsQuery:
      "Philippine+Nikkei+Jin+Kai+International+School+Calinan+Davao+City",
    address: "Durian Village, Calinan District",
    description:
      "Japanese-Filipino cultural and language education campus under the Philippine Nikkei Jin Kai international network.",
    photo: "Philippine Nikkei Jin Kai School of Calinan.jpg",
  },
  {
    name: "Philippine College of Technology Calinan Branch",
    tags: ["College", "High School", "Private"],
    lat: 7.182,
    lng: 125.449,
    displayTag: "Private College & High School",
    mapsQuery: "Philippine+College+of+Technology+Calinan+Branch+Davao+City",
    address: "Bayanihan, Calinan-Wangan Road",
    description:
      "Technical-vocational and higher education campus offering skills-based programs designed for industry readiness.",
    photo: "Philippine College of Technology Calinan Branch.jpg",
  },
  {
    name: "Holy Cross College of Calinan",
    tags: ["College", "High School", "Elementary", "Private"],
    lat: 7.19,
    lng: 125.4548,
    displayTag: "Private College, High School & Elementary",
    mapsQuery: "Holy+Cross+College+of+Calinan+Davao+City",
    address: "McArthur Highway, Datu Abing St., Calinan",
    description:
      "Catholic institution under the Archdiocese of Davao offering basic, tertiary, and graduate education with Christian values.",
    photo: "Holy Cross College of Calinan, Inc..png",
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
  console.log(`Linking ${ENTRIES.length} education establishments...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("education").add({
        name: entry.name,
        tags: entry.tags,
        lat: entry.lat,
        lng: entry.lng,
        displayTag: entry.displayTag,
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