/* ============================================================
   FILE: lib/serverAuth.ts   (REPLACE whole file)

   TECHNIQUE: ADAPTER (keeps old code working)
   Your other admin routes still call  verifyAuth(request)  and
   verifyAdminRequest(request). These two small functions now simply pass the work to
   the AuthService class, so you get the stronger checks (revoked tokens, generic
   errors) everywhere without editing every route.
   ============================================================ */

import type { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { Container } from "@/lib/server/container";

/** A valid, current Firebase ID token. Throws if missing/invalid. */
export async function verifyAuth(request: NextRequest): Promise<DecodedIdToken> {
  return Container.get().auth.requireUser(request);
}

/** A signed-in user whose users/{uid}.role is "admin". Throws otherwise. */
export async function verifyAdminRequest(request: NextRequest): Promise<DecodedIdToken> {
  return Container.get().auth.requireAdmin(request);
}