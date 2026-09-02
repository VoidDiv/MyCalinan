import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

interface EventInput {
  title: string;
  description: string;
  date: string;
  category?: string;
  image?: string;
}

// GET /api/events — public, returns every event/festival posting.
// Used by CommunityFeed, AdminDashboard, and AdminReports.
export async function GET(request: NextRequest) {
  try {
    await verifyAdminRequest(request);

    const adminDb = getAdminDb();

    const snapshot = await adminDb
      .collection("events")
      .orderBy("createdAt", "desc")
      .get();

    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Events GET error:", error);

    return NextResponse.json(
      { error: "Unauthorized or failed to fetch events" },
      { status: 401 }
    );
  }
}

// POST /api/events — admin only, creates a new event/festival posting.
// Expects an Authorization: Bearer <Firebase ID token> header.
export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as EventInput;

    if (!body.title || !body.description || !body.date) {
      return NextResponse.json(
        { error: "title, description, and date are required" },
        { status: 400 }
      );
    }
    const adminDb = getAdminDb();
    const docRef = await adminDb.collection("events").add({
      title: body.title,
      description: body.description,
      date: body.date,
      category: body.category || "Event",
      image: body.image || "",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ _id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/events error:", err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}