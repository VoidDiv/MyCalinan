import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/announcements — PUBLIC
export async function GET() {
  try {
    const adminDb = getAdminDb();

    const snapshot = await adminDb
      .collection("announcements")
      .orderBy("createdAt", "desc")
      .get();

    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Announcements GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}