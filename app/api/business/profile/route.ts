/* ============================================================
   FILE: app/api/business/profile/route.ts
   GET /api/business/profile — the logged-in owner's businesses.

   Related routes:
   - app/api/business/update/route.ts          PATCH  edit business details
   - app/api/business/delete-request/route.ts  POST   ask the admin to delete
                                               DELETE cancel that request
   - app/api/business/hours/route.ts           PATCH  operating hours

   NEW IN THIS VERSION: each business also returns the editable details
   (owner name, email, phone, address, description) for the Edit form, and
   `deletionRequest` (pending / declined + reasons) for the delete-request flow.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { sanitizeHours } from "@/lib/OperatingHours";

/* Friendly labels for each fixed document key stored under
   businesses/{id}.documents.* (see types/business.ts). */
const DOC_LABELS: Record<string, string> = {
  businessPermit: "Business Permit",
  dti: "DTI / SEC Registration",
  barangayClearance: "Barangay Clearance",
  barangayCertification: "Barangay Certification",
  cedula: "Cedula",
};

const toIso = (v: unknown): string | null =>
  v && typeof (v as { toDate?: () => Date }).toDate === "function"
    ? (v as { toDate: () => Date }).toDate().toISOString()
    : null;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    // An owner can register more than one business, so fetch ALL of them,
    // most recently submitted first.
    const businessQuery = await adminDb
      .collection("businesses")
      .where("ownerId", "==", decoded.uid)
      .orderBy("submittedAt", "desc")
      .get();

    const businesses = businessQuery.docs.map((docSnap) => {
      const data = docSnap.data();
      const documents = data.documents ?? {};

      const docEntries = Object.entries(DOC_LABELS)
        .filter(([key]) => documents[key]?.url)
        .map(([key, label]) => ({
          label,
          url: documents[key].url as string,
          status: (documents[key].status as string) ?? "pending",
        }));

      const del = data.deletionRequest;
      const deletionRequest =
        del && (del.status === "pending" || del.status === "declined")
          ? {
              status: del.status as "pending" | "declined",
              reason: (del.reason as string) ?? "",
              adminNote: (del.adminNote as string | null) ?? null,
              requestedAt: toIso(del.requestedAt),
              reviewedAt: toIso(del.reviewedAt),
            }
          : null;

      return {
        id: docSnap.id,
        businessName: data.businessName ?? "",
        businessType: data.businessType ?? "",
        yearOperating: data.yearOperation ?? "",
        overallStatus: data.overallStatus ?? "pending",
        pictures: documents.businessPictures?.urls ?? [],
        documents: docEntries,
        // Editable details (Edit form)
        fullName: data.fullName ?? "",
        email: data.email ?? "",
        phoneNumber: data.phoneNumber ?? "",
        address: data.address ?? "",
        description: data.description ?? "",
        // Days open + opening/closing times (null if none on file yet)
        operatingHours: sanitizeHours(data.operatingHours),
        // Set by the admin dashboard when rejecting an application.
        rejectionReason: data.rejectionReason ?? null,
        deletionRequest,
        submittedAt: toIso(data.submittedAt),
      };
    });

    return NextResponse.json({ businesses });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}