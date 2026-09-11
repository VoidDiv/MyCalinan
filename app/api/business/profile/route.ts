import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/* Friendly labels for each fixed document key stored under
   businesses/{id}.documents.* (see types/business.ts). */
const DOC_LABELS: Record<string, string> = {
  businessPermit: "Business Permit",
  dti: "DTI / SEC Registration",
  barangayClearance: "Barangay Clearance",
  barangayCertification: "Barangay Certification",
  cedula: "Cedula",
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    console.log("🔍 LOGGED IN UID:", decoded.uid);

    // Business documents use an auto-generated ID; the owner's UID is
    // stored in the "ownerId" field. An owner can register more than one
    // business, so we fetch ALL of them (not just the first) and sort by
    // most recently submitted first — this is what powers the "history"
    // list on the profile page.
    const businessQuery = await adminDb
      .collection("businesses")
      .where("ownerId", "==", decoded.uid)
      .orderBy("submittedAt", "desc")
      .get();

    console.log("🔍 MATCHED DOCS COUNT:", businessQuery.docs.length);
    businessQuery.docs.forEach((d) => {
      console.log("🔍 MATCHED DOC ownerId:", d.data().ownerId, "| id:", d.id);
    });

    const businesses = businessQuery.docs.map((docSnap) => {
      const data = docSnap.data();
      const documents = data.documents ?? {};

      // Build a flat, friendly list of the fixed single-file documents
      // (business permit, DTI, etc.) — excludes businessPictures, which
      // is handled separately below since it's an array of photos.
      const docEntries = Object.entries(DOC_LABELS)
        .filter(([key]) => documents[key]?.url)
        .map(([key, label]) => ({
          label,
          url: documents[key].url as string,
          status: (documents[key].status as string) ?? "pending",
        }));

      return {
        id: docSnap.id,
        businessName: data.businessName ?? "",
        businessType: data.businessType ?? "",
        yearOperating: data.yearOperation ?? "",
        overallStatus: data.overallStatus ?? "pending",
        pictures: documents.businessPictures?.urls ?? [],
        documents: docEntries,
        // Set by the admin dashboard when rejecting an application.
        rejectionReason: data.rejectionReason ?? null,
        submittedAt: data.submittedAt?.toDate
          ? data.submittedAt.toDate().toISOString()
          : null,
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