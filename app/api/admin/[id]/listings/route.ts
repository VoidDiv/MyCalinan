import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

// GET /api/admin/listings — admin only, returns every business listing
// regardless of status (pending/approved/denied). Public users only ever
// see approved listings elsewhere — this route is for the moderation
// queue in AdminListings.tsx.
export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  const adminDb = getAdminDb();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
      .collection("listings")
      .orderBy("submittedAt", "desc")
      .get();

    const items = snapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/admin/listings error:", err);
    return NextResponse.json(
      { error: "Failed to load listings" },
      { status: 500 }
    );
  }
}