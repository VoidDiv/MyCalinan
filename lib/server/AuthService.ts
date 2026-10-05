/* ============================================================
   FILE: lib/server/AuthService.ts 

   TECHNIQUE: SINGLE RESPONSIBILITY + DEPENDENCY INJECTION
   - Single responsibility: this class does ONE job — answer "who is calling
     and are they allowed?". Nothing else.
   - Dependency injection: it does not create Firebase itself; Firebase's `auth`
     and `db` are handed in through the constructor. That makes it easy to swap
     (for example a fake one in a test) and keeps the class honest about what it needs.

   SECURITY BENEFITS
   - The role is read from the DATABASE (users/{uid}.role), never from anything
     the browser can change.
   - Admin checks use `checkRevoked`: a token of an account that was disabled or
     signed out everywhere is rejected immediately (not after the 1-hour expiry).
   - Failure messages are generic (no hint about WHY a token failed).
   ============================================================ */

import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./errors";

export class AuthService {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore
  ) {}

  /** Any signed-in user. */
  async requireUser(req: NextRequest, options: { checkRevoked?: boolean } = {}): Promise<DecodedIdToken> {
    const token = this.extractBearerToken(req);
    try {
      return await this.auth.verifyIdToken(token, options.checkRevoked === true);
    } catch {
      throw new UnauthorizedError("Invalid or expired session. Please sign in again.");
    }
  }

  /** Only an administrator. */
  async requireAdmin(req: NextRequest): Promise<DecodedIdToken> {
    const decoded = await this.requireUser(req, { checkRevoked: true });
    const profile = await this.db.collection("users").doc(decoded.uid).get();
    // NOTE: this exact message is also checked by older admin routes — keep it as is.
    if (!profile.exists || profile.data()?.role !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
    return decoded;
  }

  /** Reads "Authorization: Bearer <token>". */
  private extractBearerToken(req: NextRequest): string {
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || token.length > 4096) throw new UnauthorizedError("Not signed in.");
    return token;
  }
}