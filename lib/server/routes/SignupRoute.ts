/* ============================================================
   FILE: lib/server/routes/SignupRoute.ts   (NEW)
   POST /api/auth/signup
   Creates the Firebase account + users/{uid} profile, but ONLY when the caller holds
   a valid verification token for that email. The role is always "user".

   TECHNIQUE: INHERITANCE + COMPOSITION
   Extends ApiRoute (inherits the security recipe) and USES other objects
   (SignupRequest, OtpService, UserAccountService) instead of doing everything itself.

   Because the account is created on the server, the browser is NOT signed in
   afterwards — the person logs in normally on /login.
   ============================================================ */

import type { NextRequest } from "next/server";
import { ApiRoute, type ApiResult } from "../ApiRoute";
import { ForbiddenError } from "../errors";
import type { Services } from "../container";
import { SignupRequest } from "../SignupRequest";

export class SignupRoute extends ApiRoute {
  constructor(private readonly services: Services) {
    super({ sameOrigin: true, limiter: services.limiters.signup });
  }

  protected async run(req: NextRequest): Promise<ApiResult> {
    const body = await this.readJsonBody(req);
    const signup = SignupRequest.from(body, this.services.passwordPolicy);

    const verified = await this.services.otp.isTokenValid(signup.email, signup.verificationToken);
    if (!verified) {
      throw new ForbiddenError(
        "Your email verification is missing or expired. Verify your email again.",
        "email"
      );
    }

    await this.services.accounts.register(signup);
    await this.services.otp.clear(signup.email);

    return { body: { ok: true }, status: 201 };
  }
}