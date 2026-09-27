import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminRequest(request);
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, date, category, image, description } = body;

    await adminDb.collection("events").doc(id).update({
      title: title ?? "",
      date: date ?? "",
      category: category ?? "General",
      image: image ?? "",
      description: description ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update event error:", err);
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
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { id } = await params;
    await adminDb.collection("events").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}