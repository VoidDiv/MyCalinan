import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import serviceAccount from "../serviceAccountKey.json";

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount as any),
      storageBucket: "mycalinan.firebasestorage.app",
    });

export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
export const adminAuth = getAuth(app);