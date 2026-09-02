import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

type ListingStatus = "pending" | "approved" | "denied";

const VALID_STATUSES: ListingStatus[] = [
  "pending",
  "approved",
  "denied",
];

// PATCH /api/admin/listings/:id/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminRequest(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const adminDb = getAdminDb();

  try {
    const { status, denyReason } = (await req.json()) as {
      status?: ListingStatus;
      denyReason?: string;
    };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("listings").doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    await docRef.update({
      status,
      denyReason: status === "denied" ? denyReason || "" : "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "PATCH /api/admin/listings/[id]/status error:",
      err
    );

    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}