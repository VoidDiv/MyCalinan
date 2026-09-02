import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "../serviceAccountKey.json";

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount as any),
    });

export const adminDb = getFirestore(app);