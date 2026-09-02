  // scripts/link-lifestyle.js
  //
  // Same pattern as link-community.js / link-finance.js / link-transport.js
  // — links each Lifestyle (Gym & Hotel) photo in Firebase Storage
  // (making it public) and writes a matching document into a new
  // "lifestyle" Firestore collection.
  // Run with:
  //   node scripts/link-lifestyle.js
  //
  // SETUP:
  // 1. npm install firebase-admin (already installed if you ran the
  //    earlier link-*.js scripts)
  // 2. serviceAccountKey.json in project root (already there from
  //    earlier runs)
  //
  // ASSUMPTION: your Storage uploads kept the same filenames as the
  // local /public/image/ files (e.g. "La_ Migs Fitness Gym.png"),
  // inside a "Lifestyle/" folder. If your actual Storage filenames or
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
  const STORAGE_FOLDER = "Lifestyle/";

  const ENTRIES = [
    {
      name: "La' Migs Fitness Gym",
      category: "Gym",
      lat: 7.186,
      lng: 125.4498,
      tag: "Gym",
      pin: "🏋️",
      mapsQuery: "La'+Migs+Fitness+Gym+Crossing+Calinan+Davao+City",
      address: "Buda National Hwy, Crossing Calinan",
      description:
        "Community-oriented fitness center offering strength training, cardio workouts, and general wellness in a supportive neighborhood setting.",
      photo: "La_ Migs Fitness Gym.png",
    },
    {
      name: "Ultradynamic Fitness Gym",
      category: "Gym",
      lat: 7.188,
      lng: 125.4535,
      tag: "Gym",
      pin: "🏋️",
      mapsQuery: "Ultradynamic+Fitness+Gym+Calinan+Davao+City",
      address: "3rd Floor Spazio Del Fierro, Villafuerte cor. Malanos St., Calinan",
      description:
        "Modern gym offering strength equipment, cardio machines, group workouts, and coaching; open early and ideal for beginners to advanced gym-goers.",
      photo: "Ultradynamic Fitness Gym - Calinan Davao.jpg",
    },
    {
      name: "Casa Imelda Inn",
      category: "Hotel",
      lat: 7.192,
      lng: 125.456,
      tag: "Hotel",
      pin: "🏨",
      mapsQuery: "Casa+Imelda+Inn+Abayon+Calinan+Davao+City",
      address: "Abayon, Calinan District",
      description:
        "Small local lodging establishment offering a convenient stay for visitors exploring Calinan, known for its proximity to nature attractions and local commerce.",
      photo: "Casa Imelda Inn.png",
    },
    {
      name: "Sonreir Apartelle and Inn",
      category: "Hotel",
      lat: 7.187,
      lng: 125.452,
      tag: "Hotel",
      pin: "🏨",
      mapsQuery: "SONREIR+APARTELLE+AND+INN+Calinan+Davao+City",
      address: "Davao–Bukidnon Rd, Calinan District",
      description:
        "Lodging establishment offering comfortable rooms for short stays and overnight accommodation for travelers along the Davao–Bukidnon route.",
      photo: "SONREIR APARTELLE AND INN.png",
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
    console.log(`Linking ${ENTRIES.length} lifestyle places...`);

    for (const entry of ENTRIES) {
      try {
        const { url, path: imagePath } = await linkPhoto(entry.photo);

        await db.collection("lifestyle").add({
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