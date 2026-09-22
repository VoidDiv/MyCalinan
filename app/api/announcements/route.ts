import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

function formatDisplayDate(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return undefined;
}

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("announcements")
      .orderBy("createdAt", "desc")
      .get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        _id: doc.id,
        ...data,
        // Overwrite `date` with a display-ready string if it exists;
        // falls back to createdAt if there's no separate `date` field.
        date: formatDisplayDate(data.date ?? data.createdAt),
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("Fetch announcements error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}