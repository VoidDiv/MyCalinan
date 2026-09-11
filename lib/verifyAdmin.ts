import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebaseAdmin";

/**
 * Verifies the Firebase ID token from the Authorization header,
 * and confirms the user has the "admin" role in Firestore.
 * Returns the decoded token if valid, or null if not.
 */
export async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    // Confirm this user has the "admin" role in Firestore
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      return null;
    }

    return decoded;
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}