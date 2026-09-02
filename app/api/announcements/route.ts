import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);

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
      { error: "Unauthorized or failed to fetch announcements" },
      { status: 401 }
    );
  }
}