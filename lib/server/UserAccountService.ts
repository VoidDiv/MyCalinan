/* ============================================================
   FILE: lib/server/UserAccountService.ts   (NEW)

   TECHNIQUE: SERVICE CLASS + ENCAPSULATION + DEPENDENCY INJECTION
   - Service class: all "user account" work (does this email exist? create the
     account) lives in ONE place, not spread over route files.
   - Encapsulation: how an account is built (Auth user + Firestore profile +
     rollback) is hidden behind two public methods.

   SECURITY BENEFITS
   - Privilege escalation is impossible here: the role is ALWAYS written as "user".
     An admin account can only be made by editing the database yourself.
   - Account is created as emailVerified:true only because the route already
     checked the one-time verification token.
   - Atomic-ish creation: if saving the profile fails, the half-created login is
     DELETED (rollback), so no "ghost" account without a profile is left behind.
   - The password goes straight to Firebase Auth (hashed there). It is never
     logged and never stored in Firestore.
   ============================================================ */

import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { ConflictError, ValidationError } from "./errors";
import type { EmailAddress } from "./validation";
import type { SignupRequest } from "./SignupRequest";

export class UserAccountService {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore
  ) {}

  async emailIsRegistered(email: EmailAddress): Promise<boolean> {
    try {
      await this.auth.getUserByEmail(email.value);
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === "auth/user-not-found") return false;
      throw err;
    }
  }

  /** Creates the login + the profile. Returns the new user's uid. */
  async register(request: SignupRequest): Promise<string> {
    let uid: string;
    try {
      const user = await this.auth.createUser({
        email: request.email.value,
        password: request.password,
        displayName: request.fullName,
        emailVerified: true,
      });
      uid = user.uid;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        throw new ConflictError("This email address is already registered.", "email");
      }
      if (code === "auth/invalid-password") throw new ValidationError("Password is too weak.", "password");
      throw err;
    }

    try {
      await this.db.collection("users").doc(uid).set({
        fullName: request.fullName,
        phoneNumber: request.phoneNumber,
        address: request.address,
        sex: request.sex,
        email: request.email.value,
        role: "user", // fixed on purpose — see the security note above
        emailVerified: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      await this.auth.deleteUser(uid).catch(() => undefined); // rollback
      throw err;
    }
    return uid;
  }
}