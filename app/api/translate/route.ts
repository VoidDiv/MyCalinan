/* ============================================================
   FILE: app/api/translate/route.ts
   POST /api/translate        English  →  Cebuano (ceb)

   Uses Google Cloud Translation (Basic / v2). The API key lives ONLY on
   the server (GOOGLE_TRANSLATE_API_KEY), so visitors can never see it.

   ACCURACY (new in this version)
   1. Fixed phrases first: common UI text ("View on Map", "Get Directions",
      "Closed", ...) comes from lib/cebuanoGlossary.ts, hand-checked Cebuano,
      instead of Google. Free and always consistent.
   2. Names are never translated: every Explore listing name (read from
      Firestore, refreshed every 10 min), the KEEP_AS_IS list (Calinan,
      Barangay, PhilHealth, ...), street names ("Villafuerte St."),
      "Purok 12", prices (₱500, PHP 1,000), times (8:00 AM), phone numbers,
      emails and links are wrapped so Google leaves them exactly as written.
   3. Line breaks are kept (they used to be merged into one line).
   4. Google's neural model ("nmt") is requested explicitly.
   5. Text that is ONLY names/numbers is returned as-is, without calling Google.

   FIXING A BAD TRANSLATION BY HAND
   Open Firestore > translationCache, find the doc (field "s" = English),
   change "t" to the correct Cebuano and add  manual: true .
   Manual entries are never overwritten, even after a version bump.

   CACHE VERSION
   Old cached translations (made before these fixes) are refreshed once,
   automatically, because TRANSLATION_VERSION changed. Bump it again after
   you edit the glossary.

   Cost protection (Google charges per character):
   - Every translation is cached in Firestore, so a sentence is paid ONCE.
   - Only requests from your own website are accepted.
   - Per-IP rate limit + size limits on every request.
   Also set a daily quota + budget alert in Google Cloud Console.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { PAGE_COLLECTION } from "@/types/listing";
import { CEBUANO_PHRASES, KEEP_AS_IS } from "@/lib/cebuanoGlossary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const CACHE_COLLECTION = "translationCache";
const TARGETS = new Set(["ceb"]);

/** Bump this after changing the glossary or the protection rules. */
const TRANSLATION_VERSION = 2;

const MAX_STRINGS = 100;
const MAX_CHARS_EACH = 2000;
const MAX_CHARS_TOTAL = 15000;
const MAX_REQUESTS_PER_MINUTE = 60;
const NAMES_TTL_MS = 10 * 60 * 1000;

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

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

const cacheId = (target: string, text: string) =>
  createHash("sha1").update(`${target}\n${text}`).digest("hex");

/* ═════════════════════════════════════════════════════════
   1. FIXED PHRASES (glossary)
   ═════════════════════════════════════════════════════════ */

/** "📍 View on Map" -> prefix "📍 ", core "View on Map", suffix "" */
function splitAffixes(text: string) {
  const prefix = text.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
  const rest = text.slice(prefix.length);
  const suffix = rest.match(/[\s.!?:…,]*$/u)?.[0] ?? "";
  return { prefix, core: rest.slice(0, rest.length - suffix.length), suffix };
}

function glossaryHit(text: string): string | null {
  const { prefix, core, suffix } = splitAffixes(text);
  if (!core) return null;
  const hit = CEBUANO_PHRASES[core.toLowerCase().replace(/\s+/g, " ")];
  return hit ? `${prefix}${hit}${suffix}` : null;
}

/* ═════════════════════════════════════════════════════════
   2. PROTECTED TERMS (names, numbers, links)
   ═════════════════════════════════════════════════════════ */

let namesCache: { at: number; names: string[] } | null = null;

/** Every Explore listing name, so "Rose Bakeshop" is never translated. */
async function listingNames(): Promise<string[]> {
  if (namesCache && Date.now() - namesCache.at < NAMES_TTL_MS) return namesCache.names;
  try {
    const snaps = await Promise.all(
      Object.values(PAGE_COLLECTION).map((col) => adminDb.collection(col).select("name").get())
    );
    const names = new Set<string>();
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        const n = doc.get("name");
        if (typeof n === "string" && n.trim().length >= 3) names.add(n.trim());
      }
    }
    namesCache = { at: Date.now(), names: [...names] };
  } catch (err) {
    console.warn("Could not load listing names for translation:", err);
    namesCache = { at: Date.now(), names: namesCache?.names ?? [] };
  }
  return namesCache.names;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATTERNS = [
  String.raw`https?:\/\/[^\s<]+`, // links
  String.raw`[\w.+-]+@[\w-]+\.[\w.-]+`, // emails
  String.raw`(?:₱|PHP\s?)\s?\d[\d,]*(?:\.\d+)?`, // prices
  String.raw`\d{1,2}:\d{2}\s?(?:[AaPp]\.?[Mm]\.?)?`, // times
  String.raw`(?:\+63|0)\d[\d\s-]{7,12}\d`, // phone numbers
  String.raw`Purok\s*\d+[A-Z]?`, // "Purok 12", "Purok 25A"
  // Street names: "Villafuerte St.", "Davao–Bukidnon Highway", "R. Magsaysay Street"
  String.raw`(?:[A-Z][\w.'’–-]*\s){1,4}(?:St|Street|Ave|Avenue|Rd|Road|Hwy|Highway|Blvd)\.?`,
];

interface Matchers {
  terms: RegExp; // names + KEEP_AS_IS, any letter case
  patterns: RegExp; // prices, times, streets ... (letter case matters)
}

let matcherCache: { key: string; m: Matchers } | null = null;

function protectedMatchers(names: string[]): Matchers {
  const key = `${names.length}:${names[0] ?? ""}:${names[names.length - 1] ?? ""}`;
  if (matcherCache?.key === key) return matcherCache.m;

  // Longest first, so "Calinan Poblacion" wins over "Calinan"
  const terms = [...new Set([...KEEP_AS_IS, ...names])]
    .sort((a, b) => b.length - a.length)
    .map((t) => `(?<![\\p{L}\\p{N}])${escapeRe(t)}(?![\\p{L}\\p{N}])`);

  const m: Matchers = {
    terms: new RegExp(terms.join("|"), "giu"),
    patterns: new RegExp(PATTERNS.join("|"), "gu"),
  };
  matcherCache = { key, m };
  return m;
}

/** Protected spans in the text; overlaps resolved by keeping the longer one. */
function protectedRanges(text: string, m: Matchers): [number, number][] {
  const found: [number, number][] = [];
  for (const re of [m.terms, m.patterns]) {
    re.lastIndex = 0;
    for (const x of text.matchAll(re)) {
      if (x[0]) found.push([x.index ?? 0, (x.index ?? 0) + x[0].length]);
    }
  }
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const out: [number, number][] = [];
  for (const r of found) {
    const last = out[out.length - 1];
    if (!last || r[0] >= last[1]) out.push(r);
    else if (r[1] > last[1]) last[1] = r[1]; // overlapping: merge into one span
  }
  return out;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Turns plain text into HTML for Google, wrapping protected parts in
 * <span translate="no">. Returns null when nothing is left to translate.
 */
function toProtectedHtml(text: string, m: Matchers): string | null {
  let html = "";
  let last = 0;
  let translatable = "";
  for (const [start, end] of protectedRanges(text, m)) {
    const before = text.slice(last, start);
    translatable += before;
    html += escapeHtml(before);
    html += `<span class="notranslate" translate="no">${escapeHtml(text.slice(start, end))}</span>`;
    last = end;
  }
  const tail = text.slice(last);
  translatable += tail;
  html += escapeHtml(tail);

  if (!/\p{L}{2,}/u.test(translatable)) return null; // only names/numbers left
  return html.replace(/\r?\n/g, "<br>");
}

function fromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<span[^>]*>/gi, "")
    .replace(/<\/span>/gi, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

/* ═════════════════════════════════════════════════════════
   ROUTE
   ═════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Translation is not configured." }, { status: 503 });
  }

  // Only our own website may use this endpoint
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  if (isRateLimited(clientIp(request))) {
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

  // 1) Fixed phrases from the glossary (free, hand-checked)
  for (const t of unique) {
    const hit = glossaryHit(t);
    if (hit) found.set(t, hit);
  }

  // 2) Already translated with the current rules, or corrected by hand? (free)
  const afterGlossary = unique.filter((t) => !found.has(t));
  if (afterGlossary.length > 0) {
    try {
      const refs = afterGlossary.map((t) => adminDb.collection(CACHE_COLLECTION).doc(cacheId(target, t)));
      const snaps = await adminDb.getAll(...refs);
      snaps.forEach((snap, i) => {
        if (!snap.exists) return;
        const value = snap.get("t");
        const fresh = snap.get("manual") === true || snap.get("v") === TRANSLATION_VERSION;
        if (fresh && typeof value === "string" && value) found.set(afterGlossary[i], value);
      });
    } catch (err) {
      console.warn("Translation cache read failed:", err);
    }
  }

  // 3) Protect names/numbers; anything that is ONLY protected text stays as written
  const misses = unique.filter((t) => !found.has(t));
  const toSend: { source: string; html: string }[] = [];
  if (misses.length > 0) {
    const matchers = protectedMatchers(await listingNames());
    for (const source of misses) {
      const html = toProtectedHtml(source, matchers);
      if (html === null) found.set(source, source);
      else toSend.push({ source, html });
    }
  }

  // 4) Translate only what is new (this is the part Google charges for)
  if (toSend.length > 0) {
    const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY },
      body: JSON.stringify({
        q: toSend.map((x) => x.html),
        source: "en",
        target,
        format: "html",
        model: "nmt",
      }),
    });

    if (!res.ok) {
      console.error("Google Translate error:", res.status, await res.text().catch(() => ""));
      // Still return what we have (glossary + cache); untranslated text stays English.
      return NextResponse.json(
        { translations: list.map((t) => found.get(t) ?? t), partial: true },
        { status: 200 }
      );
    }

    const data = await res.json();
    const out: { translatedText?: string }[] = data?.data?.translations ?? [];

    const batch = adminDb.batch();
    toSend.forEach(({ source }, i) => {
      const translated = fromHtml(out[i]?.translatedText ?? "").trim();
      if (!translated) return;
      found.set(source, translated);
      batch.set(adminDb.collection(CACHE_COLLECTION).doc(cacheId(target, source)), {
        t: translated,
        s: source,
        target,
        v: TRANSLATION_VERSION,
        manual: false,
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