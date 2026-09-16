import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

const base64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64ServiceAccount) {
  throw new Error(
    "Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable."
  );
}

const serviceAccount = JSON.parse(
  Buffer.from(base64ServiceAccount, "base64").toString("utf-8")
);

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount),
      storageBucket: "mycalinan.firebasestorage.app",
    });

export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
export const adminAuth = getAuth(app);