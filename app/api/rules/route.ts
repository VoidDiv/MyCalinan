import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";
import { FieldValue } from "firebase-admin/firestore";

/* ============================================================
   RULES AND REGULATIONS  —  /api/rules

   Now stored in Firestore (siteContent/rules) instead of a file
   (data/rules.json). Files can't be written on Vercel, so posting
   rules online only works with a database.

   GET  → public, anyone can read the rules
   PUT  → admin only, replaces the whole list
   ============================================================ */

export const dynamic = "force-dynamic";

type Rule = { title: string; body: string };

const MAX_RULES = 50;
const MAX_TITLE = 200;
const MAX_BODY = 2000;

const rulesDoc = () => adminDb.collection("siteContent").doc("rules");

const DEFAULT_RULES: Rule[] = [
  {
    title: "Curfew sa mga menor de edad",
    body: "Ang mga menor de edad dili gitugotan sa gawas human sa 10:00 PM gawas kung kauban ang ginikanan o tigbantay.",
  },
  {
    title: "Kahilom sa gabii",
    body: "Likayi ang kusog nga tunog, karaoke, ug pagsugod og sagol-sagol nga kasaba human sa 10:00 PM.",
  },
];

async function readRules(): Promise<Rule[]> {
  try {
    const snap = await rulesDoc().get();
    const items = snap.exists ? snap.data()?.items : null;
    if (Array.isArray(items)) return items as Rule[];
  } catch (err) {
    console.error("Read rules error:", err);
  }
  return DEFAULT_RULES; // nothing posted yet
}

export async function GET() {
  return NextResponse.json({ items: await readRules() });
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

    const items: Rule[] = data.items
      .filter(
        (r: Rule) =>
          typeof r?.title === "string" && typeof r?.body === "string" && r.title.trim()
      )
      .slice(0, MAX_RULES)
      .map((r: Rule) => ({
        title: r.title.trim().slice(0, MAX_TITLE),
        body: r.body.trim().slice(0, MAX_BODY),
      }));

    await rulesDoc().set({ items, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Save rules error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}