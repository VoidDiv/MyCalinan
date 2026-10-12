/* ============================================================
   FILE: app/api/business/hours/route.ts
   PATCH /api/business/hours
   Lets a business owner change the operating hours of THEIR OWN
   business from the Profile page.

   Body: { businessId: string, operatingHours: OperatingHours }
   Auth: Authorization: Bearer <Firebase ID token>

   NEW IN THIS VERSION: if the business is already published on Explore,
   its Explore listing is updated in the same write, so the new hours show
   on the Explore card right away (no admin step needed).

   The hours are checked on the server too (lib/operatingHours.ts),
   so a hand-crafted request can't save broken data.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { sanitizeHours, validateHours } from "@/lib/OperatingHours";
import { PAGE_COLLECTION, type ExplorePage } from "@/types/listing";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let uid: string;
    try {
      uid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const businessId = typeof body?.businessId === "string" ? body.businessId.trim() : "";
    if (!businessId || businessId.includes("/")) {
      return NextResponse.json({ error: "Missing or invalid business." }, { status: 400 });
    }

    const hours = sanitizeHours(body?.operatingHours);
    if (!hours) {
      return NextResponse.json(
        { error: "Please tick at least one day your business is open." },
        { status: 400 }
      );
    }
    const problem = validateHours(hours);
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    const businessRef = adminDb.collection("businesses").doc(businessId);
    const snap = await businessRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    if (data.ownerId !== uid) {
      return NextResponse.json(
        { error: "You can only change the hours of your own business." },
        { status: 403 }
      );
    }

    const batch = adminDb.batch();
    batch.update(businessRef, {
      operatingHours: hours,
      operatingHoursUpdatedAt: FieldValue.serverTimestamp(),
    });

    // Already on Explore? Update the public listing too (it uses the same document ID).
    const listingPage = data.listing?.page;
    if (typeof listingPage === "string" && listingPage in PAGE_COLLECTION) {
      const listingRef = adminDb
        .collection(PAGE_COLLECTION[listingPage as ExplorePage])
        .doc(businessId);
      const listingSnap = await listingRef.get();
      if (listingSnap.exists) {
        batch.update(listingRef, {
          operatingHours: hours,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ operatingHours: hours });
  } catch (err) {
    console.error("Update hours error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}