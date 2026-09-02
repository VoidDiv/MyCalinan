/**
 * MyCalinan bulk image uploader
 * -----------------------------
 * Reads images from local category folders, uploads each to Firebase Storage,
 * then creates a matching Firestore document with the image's download URL.
 *
 * Expected local folder structure:
 *
 *   images/
 *     Healthcare/
 *       clinic1.jpg
 *       clinic2.jpg
 *     Education/
 *       school1.jpg
 *       ...
 *     Transport/
 *     Finance/
 *     Community/
 *
 * Each folder name becomes the Firestore collection name (lowercased).
 * Each image becomes one document with fields: name, imageUrl, fileName, createdAt
 *
 * SETUP:
 * 1. npm install firebase-admin
 * 2. Download a service account key:
 *    Firebase Console > Project Settings > Service Accounts > Generate new private key
 *    Save it as serviceAccountKey.json in this same folder
 * 3. Update STORAGE_BUCKET below with your actual bucket name
 *    (Firebase Console > Storage > it's shown at the top, looks like: your-project.appspot.com)
 * 4. Put your "images" folder (with category subfolders) in this same directory
 * 5. Run: node upload.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ---- CONFIG: update these two lines ----
const serviceAccount = require("./serviceAccountKey.json");
const STORAGE_BUCKET = "your-project-id.appspot.com"; // <-- change this
// -----------------------------------------

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

const IMAGES_ROOT = path.join(__dirname, "images");
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

async function uploadImage(localFilePath, destinationPath) {
  await bucket.upload(localFilePath, {
    destination: destinationPath,
    metadata: {
      contentType: getContentType(localFilePath),
    },
  });

  const file = bucket.file(destinationPath);

  // Make it publicly readable and get a permanent URL.
  // If you'd rather keep images private, skip makePublic() and use
  // file.getSignedUrl() instead, or read via your app's Storage rules.
  await file.makePublic();

  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${destinationPath}`;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function cleanName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]/g, " ")
    .trim();
}

async function processCategory(categoryFolder) {
  const categoryName = path.basename(categoryFolder); // e.g. "Healthcare"
  const collectionName = categoryName.toLowerCase(); // e.g. "healthcare"

  const files = fs
    .readdirSync(categoryFolder)
    .filter((f) => ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase()));

  console.log(`\n📂 ${categoryName}: found ${files.length} image(s)`);

  let successCount = 0;

  for (const fileName of files) {
    const localFilePath = path.join(categoryFolder, fileName);
    const destinationPath = `${collectionName}/${Date.now()}-${fileName}`;

    try {
      const imageUrl = await uploadImage(localFilePath, destinationPath);

      await db.collection(collectionName).add({
        name: cleanName(fileName),
        imageUrl: imageUrl,
        fileName: fileName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      successCount++;
      console.log(`  ✅ ${fileName}`);
    } catch (err) {
      console.error(`  ❌ ${fileName} — ${err.message}`);
    }
  }

  console.log(`   Done: ${successCount}/${files.length} uploaded for ${categoryName}`);
}

async function main() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`❌ Could not find folder: ${IMAGES_ROOT}`);
    console.error(`   Make sure your "images" folder sits next to this script.`);
    process.exit(1);
  }

  const categoryFolders = fs
    .readdirSync(IMAGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(IMAGES_ROOT, entry.name));

  if (categoryFolders.length === 0) {
    console.error("❌ No category folders found inside images/");
    process.exit(1);
  }

  console.log(`Found ${categoryFolders.length} category folder(s). Starting upload...`);

  for (const folder of categoryFolders) {
    await processCategory(folder);
  }

  console.log("\n🎉 All done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});