import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";

// Verifies the Bearer token on an incoming request against Firebase Auth.
// Returns the decoded token (with uid, email, etc.) if valid, or null if
// the request has no token or the token is invalid/expired.
export async function verifyAdminRequest(
  req: NextRequest
): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  try {
    return await adminAuth.verifyIdToken(token);
  } catch (err) {
    console.error("verifyAdminRequest: token verification failed:", err);
    return null;
  }
}