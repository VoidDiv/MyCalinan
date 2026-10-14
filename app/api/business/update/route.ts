/* ============================================================
   FILE: app/api/business/update/route.ts   (NEW FILE)
   PATCH /api/business/update
   Lets a business owner edit THEIR OWN business from the Profile page.

   Body: { businessId: string, fields: { businessName, fullName, email,
           phoneNumber, address, description, yearOperation } }
   Auth: Authorization: Bearer <Firebase ID token>

   - Pending applications: the details are simply updated.
   - Approved businesses: the public Explore listing is updated too
     (name, address, description), and the application is marked
     `needsReview: true` so the admin sees "Edited by owner" and can
     check the change in Admin > Listings.
   - Rejected applications cannot be edited here (use "Submit Again").
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { PAGE_COLLECTION, type ExplorePage } from "@/types/listing";

const LIMITS = {
  businessName: 100,
  fullName: 100,
  email: 120,
  phoneNumber: 20,
  address: 200,
  description: 600,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

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

    const f = body?.fields ?? {};
    const fields = {
      businessName: text(f.businessName, LIMITS.businessName),
      fullName: text(f.fullName, LIMITS.fullName),
      email: text(f.email, LIMITS.email),
      phoneNumber: text(f.phoneNumber, LIMITS.phoneNumber),
      address: text(f.address, LIMITS.address),
      description: text(f.description, LIMITS.description),
      yearOperation: text(String(f.yearOperation ?? ""), 4),
    };

    const currentYear = new Date().getFullYear();
    const year = Number(fields.yearOperation);
    if (!fields.businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
    if (!fields.fullName) return NextResponse.json({ error: "Your full name is required." }, { status: 400 });
    if (!EMAIL_RE.test(fields.email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (!PHONE_RE.test(fields.phoneNumber)) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
    if (!fields.address) return NextResponse.json({ error: "Business address is required." }, { status: 400 });
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
      return NextResponse.json({ error: `Year of operation must be between 1900 and ${currentYear}.` }, { status: 400 });
    }

    const businessRef = adminDb.collection("businesses").doc(businessId);
    const snap = await businessRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    if (data.ownerId !== uid) {
      return NextResponse.json({ error: "You can only edit your own business." }, { status: 403 });
    }
    if (data.overallStatus === "rejected") {
      return NextResponse.json(
        { error: "This application was rejected. Please use \"Submit Again\" instead." },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();
    const approved = data.overallStatus === "approved";

    batch.update(businessRef, {
      ...fields,
      yearOperation: String(year),
      ownerEditedAt: FieldValue.serverTimestamp(),
      // The admin sees "Edited by owner" on approved businesses until they save the listing again.
      ...(approved ? { needsReview: true } : {}),
    });

    // Already on Explore? Keep the public listing in step (same document ID).
    const listingPage = data.listing?.page;
    if (approved && typeof listingPage === "string" && listingPage in PAGE_COLLECTION) {
      const mapsQuery = `${fields.businessName} ${fields.address} Calinan Davao City`.replace(/\s+/g, " ").trim();
      const listingRef = adminDb.collection(PAGE_COLLECTION[listingPage as ExplorePage]).doc(businessId);
      const listingSnap = await listingRef.get();
      if (listingSnap.exists) {
        batch.update(listingRef, {
          name: fields.businessName,
          address: fields.address,
          description: fields.description,
          mapsQuery,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      batch.update(businessRef, {
        "listing.name": fields.businessName,
        "listing.address": fields.address,
        "listing.description": fields.description,
        "listing.mapsQuery": mapsQuery,
      });
    }

    await batch.commit();
    return NextResponse.json({ ok: true, fields: { ...fields, yearOperation: String(year) } });
  } catch (err) {
    console.error("Update business error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}