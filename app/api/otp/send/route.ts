import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import {
  OTP_TTL_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  OtpError,
  createAndStoreOtp,
  isValidEmail,
  normalizeEmail,
  releaseCooldown,
} from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let email = "";
  let codeCreated = false;

  try {
    const body = await request.json().catch(() => ({}));
    email = normalizeEmail(body?.email);
    const purpose = body?.purpose === "verify" ? "verify" : "signup";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    // For signup, refuse emails that already have an account
    if (purpose === "signup") {
      try {
        await adminAuth.getUserByEmail(email);
        return NextResponse.json(
          { error: "This email address is already registered." },
          { status: 409 }
        );
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== "auth/user-not-found") throw err;
      }
    }

    const code = await createAndStoreOtp(email);
    codeCreated = true;

    try {
      await sendOtpEmail(email, code, OTP_TTL_MINUTES);
    } catch (err) {
      console.error("sendOtpEmail failed:", err);
      await releaseCooldown(email);
      return NextResponse.json(
        { error: "We couldn't send the email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      expiresInMinutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    if (err instanceof OtpError) {
      return NextResponse.json(
        { error: err.message, retryAfter: err.retryAfter },
        {
          status: err.status,
          headers: err.retryAfter
            ? { "Retry-After": String(err.retryAfter) }
            : undefined,
        }
      );
    }
    console.error("POST /api/otp/send error:", err);
    if (codeCreated) await releaseCooldown(email);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}