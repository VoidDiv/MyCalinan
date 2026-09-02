import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

// DELETE /api/admin/listings/:id — admin only, permanently removes a
// business listing. Matches the "Remove" button in AdminListings.tsx.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const docRef = adminDb.collection("listings").doc(params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/listings/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    );
  }
}