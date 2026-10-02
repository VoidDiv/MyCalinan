/* ============================================================
   FILE: lib/server/routes/SendOtpRoute.ts   (NEW)
   POST /api/otp/send   body: { email, purpose }

   TECHNIQUE: INHERITANCE (extends the abstract ApiRoute) + TEMPLATE METHOD
   This class only writes run(). The security recipe (same-origin check, rate limit,
   safe errors) is inherited from ApiRoute.

   SECURITY NOTE (user enumeration)
   For purpose "signup" we answer 409 "already registered". That helps real users, but
   it also tells a stranger which emails have accounts. We reduce the risk with the
   per-IP limit (10 requests / 15 min) in addition to the per-email limit in OtpService.
   ============================================================ */

import type { NextRequest } from "next/server";
import { ApiRoute, type ApiResult } from "../ApiRoute";
import { ConflictError } from "../errors";
import type { Services } from "../container";
import { EmailAddress } from "../validation";

export class SendOtpRoute extends ApiRoute {
  constructor(private readonly services: Services) {
    super({ sameOrigin: true, limiter: services.limiters.otpSend });
  }

  protected async run(req: NextRequest): Promise<ApiResult> {
    const body = await this.readJsonBody(req);
    const email = EmailAddress.parse(body.email);
    const purpose = body.purpose === "verify" ? "verify" : "signup";

    if (purpose === "signup" && (await this.services.accounts.emailIsRegistered(email))) {
      throw new ConflictError("This email address is already registered.", "email");
    }

    const sent = await this.services.otp.sendCode(email);
    return { body: { ok: true, ...sent } };
  }
}