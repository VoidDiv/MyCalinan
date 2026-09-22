// scripts/backfill-source.js  (run once, then delete)
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();

const COLLECTIONS = ["food","shopping","healthcare","transport","lifestyle",
                     "finance","education","hotspots","community"];

(async () => {
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    const missing = snap.docs.filter((d) => !d.data().source);
    console.log(`${name}: ${missing.length} docs missing 'source'`);
    for (let i = 0; i < missing.length; i += 400) {
      const batch = db.batch();
      missing.slice(i, i + 400).forEach((d) =>
        batch.update(d.ref, { source: "admin" })
      );
      await batch.commit();
    }
  }
  console.log("Done.");
  process.exit(0);
})();