/* ============================================================
   FILE: app/api/business/delete-request/route.ts   (NEW FILE)
   Owners no longer delete businesses themselves. They ASK the admin:

   POST   /api/business/delete-request   { businessId, reason }
          -> businesses/{id}.deletionRequest = { status: "pending", reason, requestedAt }
   DELETE /api/business/delete-request   { businessId }
          -> cancels a pending request

   The admin approves (the business is deleted) or declines (with a reason)
   in Admin > Listings > Applications > "Deletion requests".
   Auth: Authorization: Bearer <Firebase ID token>
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

const MIN_REASON = 10;
const MAX_REASON = 500;

/** Verifies the token and that the business belongs to the caller. */
async function ownedBusiness(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }) };
  }

  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId.trim() : "";
  if (!businessId || businessId.includes("/")) {
    return { error: NextResponse.json({ error: "Missing or invalid business." }, { status: 400 }) };
  }

  const ref = adminDb.collection("businesses").doc(businessId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { error: NextResponse.json({ error: "Business not found." }, { status: 404 }) };
  }
  const data = snap.data() ?? {};
  if (data.ownerId !== uid) {
    return { error: NextResponse.json({ error: "This is not your business." }, { status: 403 }) };
  }
  return { ref, data, body };
}

export async function POST(request: NextRequest) {
  try {
    const found = await ownedBusiness(request);
    if ("error" in found) return found.error;
    const { ref, data, body } = found;

    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, MAX_REASON) : "";
    if (reason.length < MIN_REASON) {
      return NextResponse.json(
        { error: `Please tell the admin why (at least ${MIN_REASON} characters).` },
        { status: 400 }
      );
    }
    if (data.deletionRequest?.status === "pending") {
      return NextResponse.json({ error: "A deletion request is already waiting for the admin." }, { status: 409 });
    }

    await ref.update({
      deletionRequest: {
        status: "pending",
        reason,
        requestedAt: FieldValue.serverTimestamp(),
        adminNote: null,
      },
    });

    return NextResponse.json({ ok: true, deletionRequest: { status: "pending", reason, adminNote: null } });
  } catch (err) {
    console.error("Delete request error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const found = await ownedBusiness(request);
    if ("error" in found) return found.error;
    const { ref, data } = found;

    if (data.deletionRequest?.status !== "pending") {
      return NextResponse.json({ error: "There is no pending deletion request." }, { status: 400 });
    }
    await ref.update({ deletionRequest: FieldValue.delete() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel delete request error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}