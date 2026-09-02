import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}

function createFirebaseAdminApp(): App {
  if (getApps().length) return getApp();

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encoded) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_BASE64 " +
        "in your environment (.env.local locally, Vercel → Settings → " +
        "Environment Variables in prod) to the base64-encoded contents of " +
        "your service account JSON file."
    );
  }

  let serviceAccount: ServiceAccountJson;
  try {
    const json = Buffer.from(encoded, "base64").toString("utf-8");
    serviceAccount = JSON.parse(json);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 is set but couldn't be decoded/parsed. " +
        "Re-generate it: base64-encode the raw serviceAccountKey.json file " +
        "(don't paste the JSON itself, and don't add extra quotes or line breaks)."
    );
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error(
      "Decoded service account JSON is missing project_id, client_email, or private_key."
    );
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      // JSON.parse already turns the JSON file's literal \n sequences into
      // real newlines, so no manual .replace() is needed here — that
      // manual step is exactly what tends to go wrong when the key is
      // stored as three separate plain env vars instead.
      privateKey: serviceAccount.private_key,
    }),
  });
}

const app = createFirebaseAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);