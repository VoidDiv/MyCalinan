/* ============================================================
   FILE: app/api/otp/verify/route.ts   (NEW)
   POST /api/otp/verify   body: { email, code }
   Returns { verified: true, verificationToken } on success. The token
   is what /api/auth/signup requires before it creates the account.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import {
  OtpError,
  isValidEmail,
  normalizeEmail,
  verifyOtp,
} from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit code from the email." },
        { status: 400 }
      );
    }

    const verificationToken = await verifyOtp(email, code);
    return NextResponse.json({ verified: true, verificationToken });
  } catch (err) {
    if (err instanceof OtpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/otp/verify error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}