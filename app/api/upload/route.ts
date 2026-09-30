import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to about 4.5 MB
const FOLDERS = ["announcements", "events"];
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  try {
    // 1. Must be a logged-in admin
    const header = request.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    let uid: string;
    try {
      uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: "Session expired. Log in again." }, { status: 401 });
    }

    const profile = await adminDb.collection("users").doc(uid).get();
    if (profile.data()?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    // 2. Validate the file
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }
    if (!FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder." }, { status: 400 });
    }
    const ext = TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF images are allowed." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large. Max 4 MB." }, { status: 400 });
    }

    // 3. Upload
    const bucket = adminStorage.bucket();
    const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const token = crypto.randomUUID();

    await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      path
    )}?alt=media&token=${token}`;

    return NextResponse.json({ url });
  } catch (err) {
    console.error("POST /api/upload error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}