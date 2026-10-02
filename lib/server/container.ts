/* ============================================================
   FILE: lib/server/container.ts   (NEW)

   TECHNIQUE: SINGLETON + COMPOSITION ROOT (dependency injection "wiring")
   - Composition root: this is the ONE place where the objects are created and
     connected to each other. Every other class just receives what it needs.
   - Singleton: only ONE container exists per server (`Container.get()`), so the rate
     limiters keep their counters between requests.
   - Lazy: each service is built the first time it is used (the getters), so the
     build never fails because an environment variable is missing.

   SECURITY BENEFIT
   Secrets (OTP_SECRET, SMTP_PASS) are read in this one place only and handed to the
   classes that need them — they are not scattered around the code.
   ============================================================ */

import { adminAuth, adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { AuthService } from "./AuthService";
import { ConsoleEmailSender, SmtpEmailSender, type EmailSender } from "./Mailer";
import { FirestoreOtpRepository, HmacHasher, OtpService } from "./OtpService";
import { PasswordPolicy } from "./validation";
import { RateLimiter } from "./RateLimiter";
import { UserAccountService } from "./UserAccountService";
import { FirebaseFileStorage, ImageUploadService } from "./ImageUploadService";

const MINUTE = 60_000;

/** What the route classes need. Tests can build their own object with this shape. */
export interface Services {
  auth: AuthService;
  otp: OtpService;
  accounts: UserAccountService;
  uploads: ImageUploadService;
  passwordPolicy: PasswordPolicy;
  limiters: {
    otpSend: RateLimiter;
    otpVerify: RateLimiter;
    signup: RateLimiter;
  };
}

export class Container implements Services {
  private static instance: Container | null = null;

  static get(): Container {
    if (!Container.instance) Container.instance = new Container();
    return Container.instance;
  }

  private constructor() {}

  /* ---- rate limiters (one set for the whole server) ---- */
  readonly limiters = {
    otpSend: new RateLimiter(10, 15 * MINUTE),
    otpVerify: new RateLimiter(30, 15 * MINUTE),
    signup: new RateLimiter(10, 60 * MINUTE),
  };

  readonly passwordPolicy = new PasswordPolicy();

  /* ---- lazily created services ---- */
  private _auth?: AuthService;
  private _otp?: OtpService;
  private _accounts?: UserAccountService;
  private _uploads?: ImageUploadService;

  get auth(): AuthService {
    return (this._auth ??= new AuthService(adminAuth, adminDb));
  }

  get otp(): OtpService {
    return (this._otp ??= new OtpService(
      new FirestoreOtpRepository(adminDb),
      HmacHasher.fromEnv(),
      Container.createEmailSender()
    ));
  }

  get accounts(): UserAccountService {
    return (this._accounts ??= new UserAccountService(adminAuth, adminDb));
  }

  get uploads(): ImageUploadService {
    return (this._uploads ??= new ImageUploadService(
      new FirebaseFileStorage(adminStorage.bucket()),
      ["announcements", "events"]
    ));
  }

  /** Real email in production; prints codes to the terminal ONLY while developing without SMTP. */
  private static createEmailSender(): EmailSender {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) return SmtpEmailSender.fromEnv();
    if (process.env.NODE_ENV === "development") return new ConsoleEmailSender();
    return SmtpEmailSender.fromEnv(); // throws a clear error: SMTP is not configured
  }
}