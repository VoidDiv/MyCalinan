/* ============================================================
   FILE: lib/otp.ts   (NEW — server only)
   All Email OTP logic lives here. Codes are stored in Firestore
   collection "emailOtps" (doc id = SHA-256 of the email). Firestore
   rules already deny every client read/write on unknown collections,
   and the Admin SDK bypasses rules, so only these API routes can
   touch that data.

   Security choices:
   - 6-digit code from crypto.randomInt (not Math.random)
   - the code is stored only as an HMAC hash (needs OTP_SECRET)
   - expires in 10 minutes, max 5 wrong attempts, 60 s resend
     cooldown, max 5 codes per email per hour
   - a correct code is swapped for a one-time "verification token"
     (also stored hashed, valid 15 minutes) which the signup route
     must present before it creates the account

   Required env var:  OTP_SECRET  (any long random string)
   ============================================================ */

import crypto from "crypto";
import { adminDb } from "./firebaseAdmin";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;

const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const COLLECTION = "emailOtps";

/** An error that is safe to show to the user, with an HTTP status. */
export class OtpError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status = 400, retryAfter?: number) {
    super(message);
    this.name = "OtpError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function secret(): string {
  const s = process.env.OTP_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Missing or too-short OTP_SECRET environment variable.");
  }
  return s;
}

function hmac(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function otpRef(email: string) {
  const id = crypto.createHash("sha256").update(email).digest("hex");
  return adminDb.collection(COLLECTION).doc(id);
}

/* ── SEND ─────────────────────────────────────────────── */

/** Creates a fresh code for this email, enforcing cooldown + hourly cap.
 *  Returns the plain code so the caller can email it. Any earlier code
 *  or verification for this email is invalidated. */
export async function createAndStoreOtp(email: string): Promise<string> {
  const ref = otpRef(email);
  const code = crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.data();
    const now = Date.now();

    let windowStart = now;
    let sendCount = 1;

    if (prev) {
      const wait = Number(prev.lastSentAt ?? 0) + RESEND_COOLDOWN_MS - now;
      if (wait > 0) {
        const seconds = Math.ceil(wait / 1000);
        throw new OtpError(
          `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before requesting another code.`,
          429,
          seconds
        );
      }

      const prevWindowStart = Number(prev.windowStart ?? 0);
      if (now - prevWindowStart < SEND_WINDOW_MS) {
        const prevCount = Number(prev.sendCount ?? 0);
        if (prevCount >= MAX_SENDS_PER_WINDOW) {
          throw new OtpError(
            "Too many codes requested for this email. Try again in about an hour.",
            429,
            Math.ceil((prevWindowStart + SEND_WINDOW_MS - now) / 1000)
          );
        }
        windowStart = prevWindowStart;
        sendCount = prevCount + 1;
      }
    }

    tx.set(ref, {
      email,
      codeHash: hmac(`code:${email}:${code}`),
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      windowStart,
      sendCount,
      tokenHash: null,
      tokenExpiresAt: null,
      verifiedAt: null,
    });
  });

  return code;
}

/** If the email could not be delivered, let the user retry right away. */
export async function releaseCooldown(email: string): Promise<void> {
  try {
    await otpRef(email).update({ lastSentAt: 0 });
  } catch {
    /* nothing to release */
  }
}

/* ── VERIFY ───────────────────────────────────────────── */

type VerifyResult =
  | { ok: true; token: string }
  | { ok: false; error: string; status: number };

/** Checks the code. On success returns a one-time verification token.
 *  (The attempt counter is updated inside a transaction, so parallel
 *  guesses can't get around the limit.) */
export async function verifyOtp(email: string, code: string): Promise<string> {
  const ref = otpRef(email);

  const result = await adminDb.runTransaction<VerifyResult>(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const now = Date.now();

    if (!data || !data.codeHash) {
      return {
        ok: false,
        error: "No active code for this email. Request a new one.",
        status: 400,
      };
    }
    if (now > Number(data.expiresAt ?? 0)) {
      return { ok: false, error: "That code has expired. Request a new one.", status: 400 };
    }

    const attempts = Number(data.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      return {
        ok: false,
        error: "Too many incorrect attempts. Request a new code.",
        status: 429,
      };
    }

    if (!safeEqual(hmac(`code:${email}:${code}`), String(data.codeHash))) {
      tx.update(ref, { attempts: attempts + 1 });
      const left = MAX_ATTEMPTS - attempts - 1;
      return {
        ok: false,
        error:
          left > 0
            ? `That code is incorrect. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
            : "That code is incorrect. Request a new code.",
        status: 400,
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    tx.update(ref, {
      codeHash: null,
      attempts: 0,
      verifiedAt: now,
      tokenHash: hmac(`token:${email}:${token}`),
      tokenExpiresAt: now + TOKEN_TTL_MS,
    });
    return { ok: true, token };
  });

  if (!result.ok) throw new OtpError(result.error, result.status);
  return result.token;
}

/* ── TOKEN (used by the signup route) ─────────────────── */

export async function hasValidVerificationToken(
  email: string,
  token: string
): Promise<boolean> {
  if (!token) return false;

  const data = (await otpRef(email).get()).data();
  if (!data || !data.tokenHash) return false;
  if (Date.now() > Number(data.tokenExpiresAt ?? 0)) return false;

  return safeEqual(hmac(`token:${email}:${token}`), String(data.tokenHash));
}

/** Removes the OTP record once it has been used. */
export async function clearOtp(email: string): Promise<void> {
  try {
    await otpRef(email).delete();
  } catch {
    /* already gone */
  }
}