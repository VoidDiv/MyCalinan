import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";
import { FieldValue } from "firebase-admin/firestore";

/* ============================================================
   RULES AND REGULATIONS  —  /api/rules

   The Homepage reads the rules from here.

   They are stored in Firestore at   settings / rules   — the SAME
   document the Admin Dashboard "Rules and Regulations" page saves to.
   (Before, this route read a different document, siteContent/rules,
   so nothing the admin saved ever reached the Homepage.)

   GET  → public, anyone can read the rules
   PUT  → admin only, replaces the whole list
   ============================================================ */

export const dynamic = "force-dynamic";

type Rule = { title: string; body: string };

const MAX_RULES = 50;
const MAX_TITLE = 200;
const MAX_BODY = 2000;

const rulesDoc = () => adminDb.collection("settings").doc("rules");

/* Keep only well-formed rules (a title and a body, both text) */
function cleanRules(items: unknown): Rule[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (r): r is Rule =>
        !!r &&
        typeof (r as Rule).title === "string" &&
        typeof (r as Rule).body === "string" &&
        (r as Rule).title.trim() !== ""
    )
    .slice(0, MAX_RULES)
    .map((r) => ({
      title: r.title.trim().slice(0, MAX_TITLE),
      body: r.body.trim().slice(0, MAX_BODY),
    }));
}

export async function GET() {
  try {
    const snap = await rulesDoc().get();
    const items = snap.exists ? cleanRules(snap.data()?.items) : [];
    return NextResponse.json({ items });
  } catch (err) {
    // An error (not an empty list) lets visitors keep the copy saved on their
    // device instead of replacing it with "No rules posted yet".
    console.error("Read rules error:", err);
    return NextResponse.json({ error: "Could not load the rules." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await verifyAdminRequest(request);
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const data = await request.json().catch(() => null);
    if (!data || !Array.isArray(data.items)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const items = cleanRules(data.items);
    await rulesDoc().set({ items, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Save rules error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}