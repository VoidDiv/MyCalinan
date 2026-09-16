import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

// Fields an admin is allowed to edit directly. Anything else in the request
// body is ignored, so an admin request can never accidentally (or
// maliciously) overwrite fields like submittedAt, ownerId, or status —
// status changes go through the dedicated /status route instead.
const EDITABLE_FIELDS = [
  "name",
  "category",
  "description",
  "address",
  "phone",
  "email",
  "hours",
  "imageUrl",
  "imagePath",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

// GET /api/admin/listings/:id — admin only, fetch one listing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminRequest(req);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const doc = await adminDb.collection("listings").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ _id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET /api/admin/listings/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load listing" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/listings/:id — admin only, edit listing details
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminRequest(req);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const updates: Partial<Record<EditableField, unknown>> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided." },
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
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await docRef.get();
    return NextResponse.json({ _id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error("PATCH /api/admin/listings/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/listings/:id — admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminRequest(req);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const docRef = adminDb.collection("listings").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
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