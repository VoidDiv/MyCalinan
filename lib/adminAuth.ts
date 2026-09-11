import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./firebaseAdmin";

export async function verifyAuth(
  request: NextRequest
): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    throw new Error("Missing authentication token");
  }

  try {
    return await getAdminAuth().verifyIdToken(token);
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    throw new Error("Invalid or expired authentication token");
  }
}

export async function verifyAdminRequest(
  request: NextRequest
): Promise<DecodedIdToken> {
  const decodedToken = await verifyAuth(request);

  if (decodedToken.role !== "admin") {
    throw new Error("Admin access required");
  }

  return decodedToken;
}