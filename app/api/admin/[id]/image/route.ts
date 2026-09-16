import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const BUCKET_NAME = "mycalinan.firebasestorage.app";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/admin/listings/:id/image — admin only, upload/replace a
// listing's photo. Send as multipart/form-data with a single field
// named "file".
export async function POST(
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

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Send it as form field 'file'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, or WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const storagePath = `listings/${id}/photo.${extension}`;

    const bucket = adminStorage.bucket(BUCKET_NAME);
    const storageFile = bucket.file(storagePath);

    // Remove any previously uploaded photo for this listing first, in case
    // it had a different extension (e.g. replacing a .png with a .jpg).
    const existingImagePath = doc.data()?.imagePath as string | undefined;
    if (existingImagePath && existingImagePath !== storagePath) {
      await bucket.file(existingImagePath).delete({ ignoreNotFound: true });
    }

    await storageFile.save(buffer, {
      contentType: file.type,
      public: true,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    const imageUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;

    await docRef.update({
      imageUrl,
      imagePath: storagePath,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ imageUrl, imagePath: storagePath });
  } catch (err) {
    console.error("POST /api/admin/listings/[id]/image error:", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/listings/:id/image — admin only, remove a listing's photo
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

    const imagePath = doc.data()?.imagePath as string | undefined;

    if (imagePath) {
      const bucket = adminStorage.bucket(BUCKET_NAME);
      await bucket.file(imagePath).delete({ ignoreNotFound: true });
    }

    await docRef.update({
      imageUrl: null,
      imagePath: null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/listings/[id]/image error:", err);
    return NextResponse.json(
      { error: "Failed to remove image" },
      { status: 500 }
    );
  }
}