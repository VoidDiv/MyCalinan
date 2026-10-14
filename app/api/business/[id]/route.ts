/* ============================================================
   FILE: app/api/business/[id]/route.ts   (REPLACE whole file)
   DELETE /api/business/:id

   CHANGED IN THIS VERSION:
   - OWNERS can no longer delete directly. They get a clear message telling
     them to use "Request deletion" on their profile, which goes to the
     admin for approval (app/api/business/delete-request/route.ts).
   - ADMINS can still delete any business here (users/{uid}.role === "admin").
   - The business's public Explore listing (food, shopping, healthcare, ...)
     is now deleted too. Before, it stayed on Explore after the
     application was gone.

   Matches /api/business/profile:
     - collection : businesses
     - owner field: ownerId
     - files      : documents.businessPictures.urls + documents.<key>.url
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { PAGE_COLLECTION, type ExplorePage } from "@/types/listing";

/* Pull every uploaded file URL out of a business document */
function collectFileUrls(data: FirebaseFirestore.DocumentData): string[] {
  const urls: string[] = [];
  const documents = data.documents ?? {};

  for (const [key, value] of Object.entries(documents)) {
    if (key === "businessPictures") {
      const list = (value as { urls?: unknown })?.urls;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item === "string") urls.push(item);
          else if (item && typeof (item as { url?: unknown }).url === "string") {
            urls.push((item as { url: string }).url);
          }
        }
      }
    } else if (value && typeof (value as { url?: unknown }).url === "string") {
      urls.push((value as { url: string }).url);
    }
  }
  return urls;
}

/* Delete the files from Firebase Storage. Best effort: a missing file or a
   permission problem never blocks the business itself from being deleted. */
async function deleteStorageFiles(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media&token=...
        const match = url.match(/\/b\/([^/]+)\/o\/([^?]+)/);
        if (!match) return;
        const [, bucketName, encodedPath] = match;
        await getStorage()
          .bucket(bucketName)
          .file(decodeURIComponent(encodedPath))
          .delete({ ignoreNotFound: true });
      } catch (err) {
        console.warn("Could not delete a business file:", err);
      }
    })
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Who is asking? (Firebase ID token)
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    if (!id || id.includes("/")) {
      return NextResponse.json({ error: "Invalid business." }, { status: 400 });
    }

    const ref = adminDb.collection("businesses").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const data = snap.data() ?? {};

    // 2. Only admins may delete. Owners must send a deletion request instead.
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === "admin";

    if (!isAdmin) {
      if (data.ownerId === uid) {
        return NextResponse.json(
          {
            error:
              "Businesses can no longer be deleted directly. Please use \"Request deletion\" on your profile; the admin will review it.",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "You can only manage your own business." },
        { status: 403 }
      );
    }

    // 3. Delete the public Explore listing (same document ID), then the record
    const batch = adminDb.batch();
    const listingPage = data.listing?.page;
    if (typeof listingPage === "string" && listingPage in PAGE_COLLECTION) {
      batch.delete(adminDb.collection(PAGE_COLLECTION[listingPage as ExplorePage]).doc(id));
    }
    batch.delete(ref);
    await batch.commit();

    // 4. Clean up the uploaded photos/documents
    await deleteStorageFiles(collectFileUrls(data));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete business error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}