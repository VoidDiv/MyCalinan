/* ============================================================
   FILE: lib/server/OtpService.ts

   TECHNIQUES IN THIS FILE
   1) REPOSITORY PATTERN — OtpRepository (interface) + FirestoreOtpRepository.
      All database talk lives in the repository. The service never mentions
      Firestore, so you could change the database without touching the rules.
   2) ENCAPSULATION — HmacHasher keeps the secret in a private field.
      OtpService keeps its config and helpers private; only 4 public methods.
   3) DEPENDENCY INJECTION — OtpService receives the repository, hasher, mailer
      and clock from outside (constructor). Tests can pass fakes.
   4) SINGLE RESPONSIBILITY — hashing, storing, and the OTP rules are 3 classes.

   SECURITY BENEFITS (same strong rules as before, now easier to audit)
   - Codes come from crypto.randomInt (not Math.random).
   - Only an HMAC HASH of the code/token is stored — never the code itself.
   - Hashes are compared with timingSafeEqual (no timing leaks).
   - Expiry (10 min), max 5 wrong tries, 60 s resend cooldown, max 5 codes/hour.
   - A correct code is swapped for a one-time token (valid 15 min) that the
     sign-up route must present. The token is bound to that exact email.
   - Wrong-attempt counting happens inside a database transaction, so many
     parallel guesses cannot beat the limit.
   ============================================================ */

import crypto from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { AppError, TooManyRequestsError, UpstreamError, ValidationError } from "./errors";
import type { EmailAddress } from "./validation";
import { OtpEmailTemplate, type EmailSender } from "./Mailer";

/* ───────────── data shape ───────────── */
export interface OtpRecord {
  email: string;
  codeHash: string | null;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  windowStart: number;
  sendCount: number;
  tokenHash: string | null;
  tokenExpiresAt: number | null;
  verifiedAt: number | null;
}

/** What a rule function decides: the result to hand back + what to write (if anything). */
export interface Mutation<T> {
  result: T;
  set?: OtpRecord;
  patch?: Partial<OtpRecord>;
}

/* ───────────── 1) Repository: the contract ───────────── */
export interface OtpRepository {
  /**
   * Reads the record, lets `decide` choose what to write, and saves it — all in ONE
   * atomic step. `decide` must be a plain function without side effects (the database
   * may run it more than once).
   */
  mutate<T>(email: string, decide: (current: OtpRecord | null) => Mutation<T>): Promise<T>;
  find(email: string): Promise<OtpRecord | null>;
  patch(email: string, patch: Partial<OtpRecord>): Promise<void>;
  remove(email: string): Promise<void>;
}

/* ───────────── 1) Repository: the Firestore version ───────────── */
export class FirestoreOtpRepository implements OtpRepository {
  constructor(
    private readonly db: Firestore,
    private readonly collectionName = "emailOtps"
  ) {}

  /** The document id is a hash of the email, so emails never appear in document paths. */
  private ref(email: string) {
    const id = crypto.createHash("sha256").update(email).digest("hex");
    return this.db.collection(this.collectionName).doc(id);
  }

  async mutate<T>(email: string, decide: (current: OtpRecord | null) => Mutation<T>): Promise<T> {
    const ref = this.ref(email);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? (snap.data() as OtpRecord) : null;
      const change = decide(current);
      if (change.set) tx.set(ref, change.set);
      else if (change.patch) tx.update(ref, change.patch);
      return change.result;
    });
  }

  async find(email: string): Promise<OtpRecord | null> {
    const snap = await this.ref(email).get();
    return snap.exists ? (snap.data() as OtpRecord) : null;
  }

  async patch(email: string, patch: Partial<OtpRecord>): Promise<void> {
    await this.ref(email).update(patch);
  }

  async remove(email: string): Promise<void> {
    await this.ref(email).delete();
  }
}

/* ───────────── 2) Hasher (secret is private) ───────────── */
export type HashScope = "code" | "token";

export class HmacHasher {
  constructor(private readonly secret: string) {
    if (secret.length < 16) throw new Error("OTP_SECRET must be at least 16 characters long.");
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): HmacHasher {
    return new HmacHasher(env.OTP_SECRET ?? "");
  }

  hash(scope: HashScope, email: string, value: string): string {
    return crypto.createHmac("sha256", this.secret).update(`${scope}:${email}:${value}`).digest("hex");
  }

  /** Compares in constant time, so the time taken reveals nothing. */
  matches(scope: HashScope, email: string, value: string, expectedHash: string): boolean {
    const a = Buffer.from(this.hash(scope, email, value));
    const b = Buffer.from(expectedHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

/* ───────────── settings ───────────── */
export interface OtpConfig {
  codeLength: number;
  ttlMinutes: number;
  resendCooldownSeconds: number;
  sendWindowMs: number;
  maxSendsPerWindow: number;
  maxAttempts: number;
  tokenTtlMinutes: number;
}

export const DEFAULT_OTP_CONFIG: OtpConfig = {
  codeLength: 6,
  ttlMinutes: 10,
  resendCooldownSeconds: 60,
  sendWindowMs: 60 * 60 * 1000,
  maxSendsPerWindow: 5,
  maxAttempts: 5,
  tokenTtlMinutes: 15,
};

type VerifyOutcome = { ok: true; token: string } | { ok: false; error: AppError };

/* ───────────── 3) The service (the OTP rules) ───────────── */
export class OtpService {
  constructor(
    private readonly repo: OtpRepository,
    private readonly hasher: HmacHasher,
    private readonly mailer: EmailSender,
    private readonly config: OtpConfig = DEFAULT_OTP_CONFIG,
    /** Injected clock + code source so tests can control time and codes. */
    private readonly clock: () => number = Date.now,
    private readonly makeCode: (length: number) => string = (length) =>
      crypto.randomInt(0, 10 ** length).toString().padStart(length, "0")
  ) {}

  get expiresInMinutes(): number {
    return this.config.ttlMinutes;
  }

  /** Creates a code, stores its hash and emails it. */
  async sendCode(email: EmailAddress): Promise<{ cooldownSeconds: number; expiresInMinutes: number }> {
    const address = email.value;
    const code = this.makeCode(this.config.codeLength);

    await this.repo.mutate<void>(address, (prev) => {
      const now = this.clock();
      let windowStart = now;
      let sendCount = 1;

      if (prev) {
        const wait = prev.lastSentAt + this.config.resendCooldownSeconds * 1000 - now;
        if (wait > 0) {
          const seconds = Math.ceil(wait / 1000);
          throw new TooManyRequestsError(
            `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before requesting another code.`,
            seconds
          );
        }
        if (now - prev.windowStart < this.config.sendWindowMs) {
          if (prev.sendCount >= this.config.maxSendsPerWindow) {
            throw new TooManyRequestsError(
              "Too many codes requested for this email. Try again in about an hour.",
              Math.ceil((prev.windowStart + this.config.sendWindowMs - now) / 1000)
            );
          }
          windowStart = prev.windowStart;
          sendCount = prev.sendCount + 1;
        }
      }

      return {
        result: undefined,
        // Writing a whole new record also cancels any earlier code or verification.
        set: {
          email: address,
          codeHash: this.hasher.hash("code", address, code),
          expiresAt: now + this.config.ttlMinutes * 60_000,
          attempts: 0,
          lastSentAt: now,
          windowStart,
          sendCount,
          tokenHash: null,
          tokenExpiresAt: null,
          verifiedAt: null,
        },
      };
    });

    try {
      await this.mailer.send({
        to: address,
        ...OtpEmailTemplate.render(code, this.config.ttlMinutes),
      });
    } catch (err) {
      console.error("Sending the verification email failed:", err);
      // The visitor never got a code, so let them try again right away.
      await this.repo.patch(address, { lastSentAt: 0 }).catch(() => undefined);
      throw new UpstreamError("We couldn't send the email. Please try again.");
    }

    return { cooldownSeconds: this.config.resendCooldownSeconds, expiresInMinutes: this.config.ttlMinutes };
  }

  /** Checks the 6 digits. On success returns a one-time verification token. */
  async verifyCode(email: EmailAddress, code: string): Promise<string> {
    const address = email.value;

    // IMPORTANT: a failed guess must be SAVED (attempt counter +1). If we threw an error
    // inside the transaction, the database would undo that save. So the rule only
    // RETURNS the outcome; the error is thrown after the transaction is committed.
    const outcome = await this.repo.mutate<VerifyOutcome>(address, (record): Mutation<VerifyOutcome> => {
      const now = this.clock();
      const fail = (message: string, status: number): { ok: false; error: AppError } => ({
        ok: false,
        error: status === 429 ? new TooManyRequestsError(message) : new ValidationError(message),
      });

      if (!record || !record.codeHash) {
        return { result: fail("No active code for this email. Request a new one.", 400) };
      }
      if (now > record.expiresAt) {
        return { result: fail("That code has expired. Request a new one.", 400) };
      }
      if (record.attempts >= this.config.maxAttempts) {
        return { result: fail("Too many incorrect attempts. Request a new code.", 429) };
      }

      if (!this.hasher.matches("code", address, code, record.codeHash)) {
        const left = this.config.maxAttempts - record.attempts - 1;
        return {
          patch: { attempts: record.attempts + 1 },
          result: fail(
            left > 0
              ? `That code is incorrect. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
              : "That code is incorrect. Request a new code.",
            400
          ),
        };
      }

      const token = crypto.randomBytes(32).toString("hex");
      return {
        patch: {
          codeHash: null,
          attempts: 0,
          verifiedAt: now,
          tokenHash: this.hasher.hash("token", address, token),
          tokenExpiresAt: now + this.config.tokenTtlMinutes * 60_000,
        },
        result: { ok: true, token },
      };
    });

    if (!outcome.ok) throw outcome.error;
    return outcome.token;
  }

  /** Does this email hold a valid, unexpired verification token? */
  async isTokenValid(email: EmailAddress, token: string): Promise<boolean> {
    if (!token) return false;
    const record = await this.repo.find(email.value);
    if (!record || !record.tokenHash || !record.tokenExpiresAt) return false;
    if (this.clock() > record.tokenExpiresAt) return false;
    return this.hasher.matches("token", email.value, token, record.tokenHash);
  }

  /** Deletes the record once it has been used. */
  async clear(email: EmailAddress): Promise<void> {
    await this.repo.remove(email.value).catch(() => undefined);
  }
}