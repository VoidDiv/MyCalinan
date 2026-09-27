import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminRequest(request);

    const { id } = await params;
    const body = await request.json();
    const { title, date, category, image, description } = body;

    await adminDb.collection("announcements").doc(id).update({
      title: title ?? "",
      date: date ?? "",
      category: category ?? "General",
      image: image ?? "",
      description: description ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update announcement error:", err);
    if (err instanceof Error && err.message === "Admin access required") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminRequest(request);

    const { id } = await params;
    await adminDb.collection("announcements").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete announcement error:", err);
    if (err instanceof Error && err.message === "Admin access required") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}