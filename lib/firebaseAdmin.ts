import {
  cert,
  getApps,
  getApp,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedApp: App | null = null;

/* ---------------------------------------------------------
   Create Firebase Admin App
--------------------------------------------------------- */

function createFirebaseAdminApp(): App {
  // Reuse an existing Firebase Admin app.
  if (getApps().length > 0) {
    return getApp();
  }

  const encoded =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!encoded) {
    throw new Error(
      "Missing Firebase Admin credentials. " +
        "Set FIREBASE_SERVICE_ACCOUNT_BASE64 in your environment."
    );
  }

  let serviceAccount: ServiceAccountJson;

  try {
    const json = Buffer.from(
      encoded,
      "base64"
    ).toString("utf-8");

    serviceAccount = JSON.parse(json);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 could not be decoded or parsed."
    );
  }

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error(
      "Firebase service account is missing project_id, client_email, or private_key."
    );
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey:
        serviceAccount.private_key.replace(
          /\\n/g,
          "\n"
        ),
    }),
  });
}

/* ---------------------------------------------------------
   Get Firebase Admin App
--------------------------------------------------------- */

function getFirebaseAdminApp(): App {
  if (!cachedApp) {
    cachedApp = createFirebaseAdminApp();
  }

  return cachedApp;
}

/* ---------------------------------------------------------
   Firebase Admin Auth
--------------------------------------------------------- */

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

/* ---------------------------------------------------------
   Firebase Admin Firestore
--------------------------------------------------------- */

export function getAdminDb(): Firestore {
  return getFirestore(
    getFirebaseAdminApp()
  );
}