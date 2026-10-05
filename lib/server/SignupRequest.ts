/* ============================================================
   FILE: lib/server/SignupRequest.ts

   TECHNIQUE: DTO (DATA TRANSFER OBJECT) + FACTORY METHOD + IMMUTABILITY
   - DTO: one object that carries the sign-up data from the browser into our code.
   - Factory method: SignupRequest.from(body) is the ONLY way to build one
     (the constructor is private). If any field is bad, from() throws and
     no half-valid object can ever exist.
   - Immutable: every property is `readonly`, so nobody can change the data after it
     was validated.

   SECURITY BENEFIT — "mass assignment" protection
   We read ONLY the fields we expect. If an attacker adds  "role": "admin"  to the
   JSON body, it is simply ignored — the role is chosen by the server, never copied
   from the request.
   ============================================================ */

import { ValidationError } from "./errors";
import { EmailAddress, PasswordPolicy, TextSanitizer } from "./validation";

export type Sex = "Male" | "Female";

export class SignupRequest {
  private constructor(
    readonly fullName: string,
    readonly phoneNumber: string,
    readonly address: string,
    readonly sex: Sex,
    readonly email: EmailAddress,
    readonly password: string,
    readonly verificationToken: string
  ) {}

  static from(body: Record<string, unknown>, policy: PasswordPolicy): SignupRequest {
    const fullName = TextSanitizer.clean(body.fullName);
    if (fullName.length < 2) throw new ValidationError("Full name must be at least 2 characters", "fullName");
    if (fullName.length > 80) throw new ValidationError("Full name must be at most 80 characters", "fullName");

    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.replace(/\s+/g, "") : "";
    if (!/^(09|\+639)\d{9}$/.test(phoneNumber)) {
      throw new ValidationError("Invalid phone number. Format: 09XXXXXXXXX or +639XXXXXXXXX", "phoneNumber");
    }

    const address = TextSanitizer.clean(body.address);
    if (!address) throw new ValidationError("Address is required", "address");
    if (address.length > 200) throw new ValidationError("Address must be at most 200 characters", "address");

    if (body.sex !== "Male" && body.sex !== "Female") {
      throw new ValidationError("Please select your sex", "sex");
    }

    const email = EmailAddress.parse(body.email);
    const password = policy.validate(body.password, email);

    const token = typeof body.verificationToken === "string" ? body.verificationToken.trim() : "";
    if (token.length > 200) throw new ValidationError("Invalid verification.", "email");

    return new SignupRequest(fullName, phoneNumber, address, body.sex, email, password, token);
  }
}