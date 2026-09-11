import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminToken } from "@/lib/verifyAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAdminToken(request);
    if (!decoded) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const { title, date, category, image, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const docRef = await adminDb.collection("events").add({
      title: title.trim(),
      date: date ?? "",
      category: category ?? "General",
      image: image ?? "",
      description: description ?? "",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ _id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("Create event error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}