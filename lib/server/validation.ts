/* ============================================================
   FILE: lib/server/validation.ts   (NEW)

   TECHNIQUE: VALUE OBJECT + ENCAPSULATION
   - Value object: EmailAddress is a tiny class that can ONLY exist if the text
     really is a valid, normalised email. (private constructor + parse()).
     Once you hold an EmailAddress you never have to re-check it.
   - Encapsulation: the rules (regex, limits) are hidden inside the class
     (private/static members). Other code can only call parse() / validate().

   SECURITY BENEFITS
   - "Never trust input": everything from the browser is checked on the SERVER
     (the browser checks can be bypassed).
   - Length caps stop huge inputs; control characters are stripped.
   - The email pattern rejects  , ; < > ( ) "  so a value like
     "a@b.com,victim@x.com" can never become a second email recipient.
   ============================================================ */

import { ValidationError } from "./errors";

/* ───────────── EmailAddress ───────────── */
export class EmailAddress {
  private static readonly PATTERN = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/;
  private static readonly MAX_LENGTH = 254;

  /** Private: the ONLY way to get one is parse()/tryParse(). */
  private constructor(readonly value: string) {}

  static tryParse(input: unknown): EmailAddress | null {
    if (typeof input !== "string") return null;
    const text = input.trim().toLowerCase();
    if (text.length === 0 || text.length > EmailAddress.MAX_LENGTH) return null;
    return EmailAddress.PATTERN.test(text) ? new EmailAddress(text) : null;
  }

  static parse(input: unknown, field = "email"): EmailAddress {
    const email = EmailAddress.tryParse(input);
    if (!email) throw new ValidationError("Please enter a valid email address.", field);
    return email;
  }

  /** The part before the @. */
  get localPart(): string {
    return this.value.split("@")[0];
  }

  toString(): string {
    return this.value;
  }
}

/* ───────────── PasswordPolicy ───────────── */
export class PasswordPolicy {
  private static readonly SYMBOL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
  /** A tiny blocklist of the most guessed passwords that still pass the character rules. */
  private static readonly COMMON = new Set([
    "password1!", "password123!", "qwerty123!", "welcome123!", "admin123!", "letmein123!",
    "calinan123!", "mycalinan1!", "p@ssw0rd", "p@ssword1", "passw0rd!",
  ]);

  constructor(
    private readonly minLength = 8,
    /** Upper limit so nobody can send a megabyte-long "password" to slow the server down. */
    private readonly maxLength = 128
  ) {}

  /** Throws ValidationError (field "password") if the password is not acceptable. Returns it untouched. */
  validate(password: unknown, email?: EmailAddress): string {
    const fail = (message: string): never => {
      throw new ValidationError(message, "password");
    };

    if (typeof password !== "string" || password.length === 0) fail("Password is required");
    const pw = password as string;

    if (pw.length < this.minLength) fail(`Password must be at least ${this.minLength} characters`);
    if (pw.length > this.maxLength) fail(`Password must be at most ${this.maxLength} characters`);
    if (!/[A-Z]/.test(pw)) fail("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(pw)) fail("Password must contain at least one lowercase letter");
    if (!/\d/.test(pw)) fail("Password must contain at least one number");
    if (!PasswordPolicy.SYMBOL.test(pw)) fail("Password must contain at least one special character");

    const lower = pw.toLowerCase();
    if (PasswordPolicy.COMMON.has(lower)) fail("That password is too common. Choose another one.");
    if (email && email.localPart.length >= 4 && lower.includes(email.localPart)) {
      fail("Password must not contain the name from your email address");
    }
    return pw; // passwords are never trimmed or changed
  }
}

/* ───────────── TextSanitizer ───────────── */
export class TextSanitizer {
  /** Text only: removes control characters, squeezes spaces, trims. Anything that is not text becomes "". */
  static clean(value: unknown): string {
    if (typeof value !== "string") return "";
    return value
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}