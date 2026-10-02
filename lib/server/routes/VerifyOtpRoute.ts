/* ============================================================
   FILE: lib/server/routes/VerifyOtpRoute.ts   (NEW)
   POST /api/otp/verify   body: { email, code }
   Returns { verified: true, verificationToken } on success.

   TECHNIQUE: INHERITANCE (extends ApiRoute)
   SECURITY: strict 6-digit check, per-IP limit (30 / 15 min) on top of the
   per-email "5 wrong tries" lock inside OtpService → guessing is not practical.
   ============================================================ */

import type { NextRequest } from "next/server";
import { ApiRoute, type ApiResult } from "../ApiRoute";
import { ValidationError } from "../errors";
import type { Services } from "../container";
import { EmailAddress } from "../validation";

export class VerifyOtpRoute extends ApiRoute {
  constructor(private readonly services: Services) {
    super({ sameOrigin: true, limiter: services.limiters.otpVerify });
  }

  protected async run(req: NextRequest): Promise<ApiResult> {
    const body = await this.readJsonBody(req);
    const email = EmailAddress.parse(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) throw new ValidationError("Enter the 6-digit code from the email.");

    const verificationToken = await this.services.otp.verifyCode(email, code);
    return { body: { verified: true, verificationToken } };
  }
}