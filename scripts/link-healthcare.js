// scripts/link-healthcare.js
//
// Pre-filled with all 20 entries pulled directly from
// HealthcarePage.tsx's CLINICS array. Run with:
//   node scripts/link-healthcare.js
//
// SETUP:
// 1. npm install firebase-admin
// 2. serviceAccountKey.json in project root (Firebase console >
//    Project settings > Service accounts > Generate new private key)
//    — add it to .gitignore immediately.
//
// ASSUMPTION: your Storage uploads kept the same filenames as the
// local /public/image/ files (Hospital1.png, Clinic4.jpg, etc.),
// inside a "healthcare-photos/" folder. If your actual Storage
// filenames or folder differ, adjust STORAGE_FOLDER and/or the
// "photo" field per entry below to match exactly.

// NEW — with this:
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
const STORAGE_FOLDER = "Healthcare/";

const ENTRIES = [
  {
    name: "Isaac T. Robillo Memorial Hospital",
    category: "Hospital",
    lat: 7.1862,
    lng: 125.4512,
    tag: "Level 1 General Hospital",
    mapsQuery: "Isaac+T.+Robillo+Memorial+Hospital+Davao+City",
    address: "Km. 26 Davao–Bukidnon Highway, Calinan",
    description:
      "A healthcare institution providing essential medical services to the local community through quality, patient-centered care.",
    photo: "Hospital1.png",
  },
  {
    name: "Clinica Isaguirre",
    category: "Clinic",
    lat: 7.188,
    lng: 125.4558,
    tag: "Primary Care Infirmary Clinic",
    mapsQuery: "Clinica+Isaguirre+Calinan+Davao+City",
    address: "Villafuerte St., Calinan",
    description:
      "Accessible healthcare including medical consultations, laboratory tests, X-ray services, and minor procedures for the local community.",
    photo: "Hospital2.png",
  },
  {
    name: "Buhangin Medical Clinic & Diagnostic Center",
    category: "Clinic",
    lat: 7.189,
    lng: 125.4565,
    tag: "Medical Clinic & Diagnostic Center",
    mapsQuery: "Buhangin+Medical+Clinic+%26+Diagnostic+Center+Calinan+Davao+City",
    address: "Calinan District, Davao City",
    description:
      "Reliable diagnostic and laboratory services, accurate testing and expert consultations to help you monitor your health with ease.",
    photo: "Clinic4.jpg",
  },
  {
    name: "Calinan Adult and Child Medical Clinic",
    category: "Clinic",
    lat: 7.1885,
    lng: 125.4555,
    tag: "General Healthcare Clinic (Adults & Children)",
    mapsQuery: "Calinan+Adult+and+Child+Medical+Clinic+Davao+City",
    address: "Calinan Proper, Davao City",
    description:
      "Trusted general healthcare for adults and children with consultations, basic treatments, and medical advice for families.",
    photo: "Clinic3.jpg",
  },
  {
    name: "A Mainstreet PT Clinic",
    category: "Clinic",
    lat: 7.1895,
    lng: 125.454,
    tag: "Physical Therapy & Rehabilitation Clinic",
    mapsQuery: "A+Mainstreet+PT+Clinic+Davao+City",
    address: "McArthur Highway, Calinan, Davao City",
    description:
      "Expert physical therapy and rehabilitation services, helping patients recover from injuries, manage pain, and restore mobility.",
    photo: "Clinic2.jpg",
  },
  {
    name: "Fernandez Medical Clinic",
    category: "Clinic",
    lat: 7.1878,
    lng: 125.456,
    tag: "Comprehensive Diagnostic & Consultation Clinic",
    mapsQuery: "Fernandez+Medical+Clinic+Davao+City",
    address: "Villafuerte Street, Calinan",
    description:
      "Comprehensive diagnostic and consultation services including laboratory tests, ultrasound, X-ray, and general check-ups for all ages.",
    photo: "Clinic.jpg",
  },
  {
    name: "DENTOpro Dental Clinic",
    category: "Dental",
    lat: 7.19,
    lng: 125.455,
    tag: "Dental Clinic",
    mapsQuery: "DENTOpro+Dental+Clinic+Calinan+Davao+City",
    address: "Purok 12, Calinan, Davao City",
    description:
      "Modern dental care with cleaning, fillings, and consultations in a clean, comfortable environment you can trust.",
    photo: "Clinic1.png",
  },
  {
    name: "Smile Corner Dental Clinic",
    category: "Dental",
    lat: 7.1875,
    lng: 125.4545,
    tag: "Dental Clinic",
    mapsQuery: "Smile+Corner+Dental+Clinic+Calinan+Davao+City",
    address: "AJK Building, National Highway, Calinan",
    description:
      "Orthodontic and cosmetic dental services including braces and smile enhancement treatments for confident smiles.",
    photo: "Clinic8.png",
  },
  {
    name: "Smart Dental Clinic",
    category: "Dental",
    lat: 7.1882,
    lng: 125.4562,
    tag: "Dental Clinic",
    mapsQuery: "Smart+Dental+Clinic+Calinan+Davao+City",
    address: "Villafuerte Street, Calinan",
    description:
      "Affordable and reliable dental care including tooth extraction, cleaning, and routine check-ups for everyday oral health needs.",
    photo: "Clinic9.png",
  },
  {
    name: "Cunanan Dental Clinic",
    category: "Dental",
    lat: 7.187,
    lng: 125.453,
    tag: "Dental Clinic",
    mapsQuery: "Cunanan+Dental+Clinic+Durian+Village+Calinan+Davao+City",
    address: "Durian Village, Calinan",
    description:
      "Trusted, long-standing dental clinic offering cleaning, fillings, and extractions with quality care for the community.",
    photo: "Clinic5.png",
  },
  {
    name: "Pilapil-Enriquez Optical Center",
    category: "Optical",
    lat: 7.1888,
    lng: 125.4555,
    tag: "Optical Clinic",
    mapsQuery: "Pilapil-Enriquez+Optical+Center+Calinan+Davao+City",
    address: "Near Calinan Post Office",
    description:
      "Professional eye care including eye examinations and prescription eyeglasses, providing convenient vision solutions for the community.",
    photo: "Clinic7.png",
  },
  {
    name: "Potestas Optical Clinic",
    category: "Optical",
    lat: 7.1892,
    lng: 125.4548,
    tag: "Optical Clinic",
    mapsQuery: "Potestas+Optical+Clinic+Roman+Diaz+Street+Calinan+Davao+City",
    address: "Roman Diaz Street, Calinan",
    description:
      "Affordable eye care including eye exams, prescription eyeglasses, and stylish frame selections for students, workers, and families.",
    photo: "Clinic6.jpg",
  },
  {
    name: "BICS Eye Care Clinic",
    category: "Optical",
    lat: 7.1883,
    lng: 125.4552,
    tag: "Optical Clinic",
    mapsQuery: "BICS+Eye+Care+Clinic+Calinan+Davao+City",
    address: "Calinan District",
    description:
      "Complete and affordable eye care including comprehensive examinations and eyeglasses fitting, with budget-friendly packages and promos.",
    photo: "Clinic10.png",
  },
  {
    name: "Senense–Lozada Optical Clinic",
    category: "Optical",
    lat: 7.1886,
    lng: 125.4557,
    tag: "Optical Clinic",
    mapsQuery:
      "Senense-Lozada+Optical+Clinic+R.+Magsaysay+Street+Calinan+Davao+City",
    address: "R. Magsaysay Street, Calinan Poblacion",
    description:
      "Accessible vision care including eye examinations, prescription eyeglasses, and frame selection for walk-in patients.",
    photo: "Clinic12.jpg",
  },
  {
    name: "Ayuban–Membrado Maternity Clinic",
    category: "Maternity",
    lat: 7.191,
    lng: 125.4535,
    tag: "Maternity Clinic",
    mapsQuery:
      "Ayuban-Membrado+Maternity+Clinic+Teachers+Village+Calinan+Davao+City",
    address: "Teachers Village, Purok 25A, Calinan",
    description:
      "Trusted and affordable maternal care including prenatal check-ups, ultrasound, family planning, and delivery support.",
    photo: "Clinic11.png",
  },
  {
    name: "Well Family Midwife Clinic",
    category: "Maternity",
    lat: 7.1897,
    lng: 125.4542,
    tag: "Maternity Clinic",
    mapsQuery:
      "Well+Family+Midwife+Clinic+McArthur+Highway+Calinan+Poblacion+Davao+City",
    address: "McArthur Highway, Calinan Poblacion",
    description:
      "DOH-licensed and PhilHealth-accredited maternity clinic offering prenatal check-ups, normal delivery, postnatal care, and family planning.",
    photo: "Clinic13.png",
  },
  {
    name: "Jambo Maternity Clinic",
    category: "Maternity",
    lat: 7.1905,
    lng: 125.4538,
    tag: "Maternity Clinic",
    mapsQuery: "Jambo+Maternity+Clinic+Datu+Abing+Street+Calinan+Davao+City",
    address: "Purok 26, Datu Abing Street, Calinan",
    description:
      "Safe and affordable maternal care offering prenatal consultations, normal delivery assistance, and postnatal care.",
    photo: "Clinic14.jpg",
  },
  {
    name: "Mother and Child Clinic",
    category: "Maternity",
    lat: 7.1887,
    lng: 125.4556,
    tag: "Maternity Clinic",
    mapsQuery:
      "Mother+and+Child+Clinic+R.+Magsaysay+Street+Calinan+Davao+City",
    address: "R. Magsaysay Street, Calinan Poblacion",
    description:
      "Accessible healthcare for women, mothers, and children including prenatal check-ups, maternal consultations, and pediatric care.",
    photo: "Clinic15.png",
  },
  {
    name: "Calinan Veterinary Clinic",
    category: "Veterinary",
    lat: 7.1865,
    lng: 125.4515,
    tag: "Veterinary Clinic",
    mapsQuery:
      "Calinan+Veterinary+Clinic+Davao-Bukidnon+Highway+Calinan+Davao+City",
    address: "Davao–Bukidnon Highway, Calinan",
    description:
      "Trusted veterinary care including pet consultations, vaccinations, illness treatment, and minor procedures for routine animal healthcare.",
    photo: "Vet1.png",
  },
  {
    name: "Furry Paws Veterinary Clinic and Pet Supplies",
    category: "Veterinary",
    lat: 7.1893,
    lng: 125.456,
    tag: "Veterinary Clinic",
    mapsQuery:
      "Furry+Paws+Veterinary+Clinic+and+Pet+Supplies+Peñano+Street+Calinan+Davao+City",
    address: "Peñano Street, Calinan Poblacion",
    description:
      "One-stop pet care with consultations, vaccinations, grooming, and quality pet supplies for all your animal care needs.",
    photo: "Vet2.jpg",
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
  console.log(`Linking ${ENTRIES.length} healthcare establishments...`);

  for (const entry of ENTRIES) {
    try {
      const { url, path: imagePath } = await linkPhoto(entry.photo);

      await db.collection("healthcare").add({
        name: entry.name,
        category: entry.category,
        lat: entry.lat,
        lng: entry.lng,
        tag: entry.tag,
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