/* ============================================================
   FILE: lib/serverAuth.ts
   Single source of truth for verifying requests to admin-only
   API routes. Consolidates two previously-separate files:
   - one checked decodedToken.role, which is always undefined
     because this app never sets a "role" custom claim on the
     Firebase ID token — role only ever lives in Firestore
     (users/{uid}.role, set at signup and never overwritten to
     "admin" by users themselves — see the Firestore rules).
   - the other correctly checked Firestore, and is now the only
     logic kept.
   ============================================================ */

import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "./firebaseAdmin";

/** Verifies the request carries a valid, current Firebase ID token.
 *  Throws if missing/invalid. Does NOT check role — use
 *  verifyAdminRequest for that. */
export async function verifyAuth(request: NextRequest): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    throw new Error("Missing authentication token");
  }

  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    throw new Error("Invalid or expired authentication token");
  }
}

/** Verifies the request is from a signed-in user AND that user's
 *  Firestore users/{uid} document has role "admin". Throws on
 *  either failure. Use this to guard every admin-only API route. */
export async function verifyAdminRequest(
  request: NextRequest
): Promise<DecodedIdToken> {
  const decodedToken = await verifyAuth(request);

  const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new Error("Admin access required");
  }

  return decodedToken;
}