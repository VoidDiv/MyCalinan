import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/* ============================================================
   POST /api/translate        English  →  Cebuano (ceb)

   Uses Google Cloud Translation (Basic / v2).
   The API key lives ONLY on the server (GOOGLE_TRANSLATE_API_KEY),
   so visitors can never see it.

   Cost protection (Google charges per character):
   1. Every translation is saved in Firestore (translationCache), so a
      sentence is paid for ONCE, ever — not once per visitor.
   2. Only requests coming from your own website are accepted.
   3. Small per-IP rate limit + size limits on every request.
   Also set a daily quota + budget alert in Google Cloud Console.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const CACHE_COLLECTION = "translationCache";
const TARGETS = new Set(["ceb"]);

const MAX_STRINGS = 100;
const MAX_CHARS_EACH = 2000;
const MAX_CHARS_TOTAL = 15000;
const MAX_REQUESTS_PER_MINUTE = 60;

/* ── tiny per-IP rate limit (per server instance) ── */
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [key, rec] of hits) if (rec.resetAt < now) hits.delete(key);
  }
  const rec = hits.get(ip);
  if (!rec || rec.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_REQUESTS_PER_MINUTE;
}

/* Google sometimes returns HTML entities even for plain text */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

const cacheId = (target: string, text: string) =>
  createHash("sha1").update(`${target}\n${text}`).digest("hex");

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Translation is not configured." }, { status: 503 });
  }

  // Only our own website may use this endpoint
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  try {
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Validate the request
  const body = await request.json().catch(() => null);
  const target = typeof body?.target === "string" ? body.target : "";
  const texts: unknown = body?.texts;

  if (!TARGETS.has(target) || !Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (texts.length > MAX_STRINGS) {
    return NextResponse.json({ error: "Too many strings." }, { status: 400 });
  }

  let total = 0;
  for (const t of texts) {
    if (typeof t !== "string" || !t.trim() || t.length > MAX_CHARS_EACH) {
      return NextResponse.json({ error: "Invalid text." }, { status: 400 });
    }
    total += t.length;
  }
  if (total > MAX_CHARS_TOTAL) {
    return NextResponse.json({ error: "Request too large." }, { status: 400 });
  }

  const list = texts as string[];
  const unique = [...new Set(list)];
  const found = new Map<string, string>();

  // 1) Already translated before? (free)
  try {
    const refs = unique.map((t) => adminDb.collection(CACHE_COLLECTION).doc(cacheId(target, t)));
    const snaps = await adminDb.getAll(...refs);
    snaps.forEach((snap, i) => {
      const value = snap.exists ? snap.get("t") : null;
      if (typeof value === "string" && value) found.set(unique[i], value);
    });
  } catch (err) {
    console.warn("Translation cache read failed:", err);
  }

  // 2) Translate only what is new (this is the part Google charges for)
  const misses = unique.filter((t) => !found.has(t));
  if (misses.length > 0) {
    const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY },
      body: JSON.stringify({ q: misses, source: "en", target, format: "text" }),
    });

    if (!res.ok) {
      console.error("Google Translate error:", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Translation service error." }, { status: 502 });
    }

    const data = await res.json();
    const out: { translatedText?: string }[] = data?.data?.translations ?? [];

    const batch = adminDb.batch();
    misses.forEach((source, i) => {
      const translated = decodeEntities(out[i]?.translatedText ?? "");
      if (!translated) return;
      found.set(source, translated);
      batch.set(adminDb.collection(CACHE_COLLECTION).doc(cacheId(target, source)), {
        t: translated,
        s: source,
        target,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.warn("Translation cache write failed:", err);
    }
  }

  return NextResponse.json({ translations: list.map((t) => found.get(t) ?? t) });
}