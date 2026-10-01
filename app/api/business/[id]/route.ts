import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/* ============================================================
   DELETE /api/business/:id

   Lets a business owner delete THEIR OWN business application
   (admins can delete any). Matches /api/business/profile:
     - collection : businesses
     - owner field: ownerId
     - files      : documents.businessPictures.urls + documents.<key>.url
   ============================================================ */

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
  // 1. Who is asking? (Firebase ID token sent by the profile page)
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
    const ref = adminDb.collection("businesses").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const data = snap.data() ?? {};

    // 2. Is it theirs? (or are they an admin?)
    if (data.ownerId !== uid) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      const isAdmin = userDoc.exists && userDoc.data()?.role === "admin";
      if (!isAdmin) {
        return NextResponse.json(
          { error: "You can only delete your own business." },
          { status: 403 }
        );
      }
    }

    // 3. Delete the record, then clean up the uploaded photos/documents
    await ref.delete();
    await deleteStorageFiles(collectFileUrls(data));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete business error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}