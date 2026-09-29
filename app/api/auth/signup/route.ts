/* ============================================================
   FILE: app/api/auth/signup/route.ts   (NEW)
   POST /api/auth/signup
   Creates the Firebase Auth account + users/{uid} profile, but ONLY
   if the caller holds a valid verificationToken for that email
   (issued by /api/otp/verify). The role is always "user".

   Because the account is created on the server, the browser is NOT
   signed in afterwards — the person logs in normally on /login.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  clearOtp,
  hasValidVerificationToken,
  isValidEmail,
  normalizeEmail,
} from "@/lib/otp";

export const runtime = "nodejs";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function validate(input: {
  fullName: string;
  phoneNumber: string;
  address: string;
  sex: string;
  email: string;
  password: string;
}): { error: string; field: string } | null {
  if (input.fullName.length < 2) {
    return { field: "fullName", error: "Full name must be at least 2 characters" };
  }

  if (!/^(09|\+639)\d{9}$/.test(input.phoneNumber.replace(/\s+/g, ""))) {
    return {
      field: "phoneNumber",
      error: "Invalid phone number. Format: 09XXXXXXXXX or +639XXXXXXXXX",
    };
  }

  if (!input.address) return { field: "address", error: "Address is required" };

  if (input.sex !== "Male" && input.sex !== "Female") {
    return { field: "sex", error: "Please select your sex" };
  }

  if (!isValidEmail(input.email)) {
    return { field: "email", error: "Please enter a valid email address" };
  }

  const pw = input.password;
  if (pw.length < 8) return { field: "password", error: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(pw)) return { field: "password", error: "Password must contain at least one uppercase letter" };
  if (!/[a-z]/.test(pw)) return { field: "password", error: "Password must contain at least one lowercase letter" };
  if (!/\d/.test(pw)) return { field: "password", error: "Password must contain at least one number" };
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) {
    return { field: "password", error: "Password must contain at least one special character" };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const input = {
      fullName: str(body?.fullName),
      phoneNumber: str(body?.phoneNumber),
      address: str(body?.address),
      sex: str(body?.sex),
      email: normalizeEmail(body?.email),
      // passwords are never trimmed
      password: typeof body?.password === "string" ? body.password : "",
    };
    const verificationToken = str(body?.verificationToken);

    const problem = validate(input);
    if (problem) return NextResponse.json(problem, { status: 400 });

    if (!(await hasValidVerificationToken(input.email, verificationToken))) {
      return NextResponse.json(
        {
          field: "email",
          error: "Your email verification is missing or expired. Verify your email again.",
        },
        { status: 403 }
      );
    }

    let uid: string;
    try {
      const user = await adminAuth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.fullName,
        emailVerified: true,
      });
      uid = user.uid;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          { field: "email", error: "This email address is already registered." },
          { status: 409 }
        );
      }
      if (code === "auth/invalid-password") {
        return NextResponse.json(
          { field: "password", error: "Password is too weak." },
          { status: 400 }
        );
      }
      throw err;
    }

    try {
      await adminDb.collection("users").doc(uid).set({
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        address: input.address,
        sex: input.sex,
        email: input.email,
        role: "user",
        emailVerified: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // Don't leave an account without a profile behind
      await adminAuth.deleteUser(uid).catch(() => {});
      throw err;
    }

    await clearOtp(input.email);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/auth/signup error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}