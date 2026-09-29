// scripts/clean-history.js
//
// Deletes ALL documents in the "history" Firestore collection.
// Use this before re-running link-history.js, to remove duplicates
// caused by running link-history.js more than once (it uses .add(),
// which always creates a new document instead of updating existing ones).
//
// SAFE: only touches the "history" collection — no other collection
// (community, food, healthcare, etc.) is read or modified.
//
// Run with:
//   node scripts/clean-history.js
// Then re-run:
//   node scripts/link-history.js
// (only ONCE after cleaning, to avoid creating duplicates again)


const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../serviceAccountKey.json");


const app = initializeApp({
  credential: cert(serviceAccount),
});


const db = getFirestore(app);


async function cleanCollection() {
  const snapshot = await db.collection("history").get();


  if (snapshot.empty) {
    console.log("Walay makit-an nga documents sa 'history' collection. Wala nay i-delete.");
    return;
  }


  console.log(`Nakit-an ${snapshot.size} documents sa 'history' collection. Deleting...`);


  const batchSize = 400; // Firestore batch limit is 500, stay safely under it
  const docs = snapshot.docs;


  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✓ Deleted ${chunk.length} documents (batch ${Math.floor(i / batchSize) + 1})`);
  }


  console.log(`Done. Tanan ${snapshot.size} documents na-delete na sa 'history' collection.`);
  console.log("Karon pwede na nimo i-run: node scripts/link-history.js (usa ra ka beses)");
}


cleanCollection()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Naay error:", err);
    process.exit(1);
  });

