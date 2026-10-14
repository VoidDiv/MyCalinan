/* ============================================================
   FILE: app/adminpage/AdminReports/page.tsx   (REPLACE whole file)
   PAGE: Reports — Admin dashboard (ADMIN ONLY)

   What the barangay sees here (all read live from Firestore):
   1. CaliBot insights   — questions over time, most asked topics,
                           questions CaliBot could not answer, fallback use
   2. Business applications — status counts, new registrations over time,
                           average days to approval, deletion requests,
                           "Edited by owner" items waiting for review
   3. Explore directory health — listings per page, live / hidden,
                           missing operating hours, missing photos
   4. Ratings & reviews  — top rated, most reviewed, recent low ratings
   5. Announcements & events — posts over time, upcoming events,
                           category summary
   A date range at the top (Last 30 days / 3 months / This year / All time)
   applies to every time-based number. "Print / Export" prints a clean
   monthly report.

   Needs Firestore rules that let the admin READ: calibot_logs, businesses,
   the 9 Explore collections, announcements, events, and (optional) the
   "reviews" collection group. Sections that can't be read show a note
   instead of breaking the page.
   ============================================================ */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  CalendarDays,
  Clock,
  HelpCircle,
  ImageOff,
  Layers,
  LineChart,
  Loader2,
  MapPin,
  Megaphone,
  Printer,
  RefreshCw,
  Star,
  Store,
} from "lucide-react";
import { collection, collectionGroup, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import useAdminGuard from "@/hooks/useAdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import { EXPLORE_PAGES, EXPLORE_SOURCES, PAGE_COLLECTION, type ExplorePage } from "@/types/listing";
import { sanitizeHours } from "@/lib/OperatingHours";

/* ═════════════════════════════════════════════════════════
   CONFIG
   ═════════════════════════════════════════════════════════ */

const GREEN = "#1a5c38";
const GOLD = "#d99b34";
const BLUE = "#1a56a0";

const LOG_LIMIT = 3000; // newest CaliBot logs read per visit
const REVIEW_LIMIT = 2000;

type RangeKey = "30d" | "90d" | "year" | "all";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 3 months" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

const POST_CATEGORIES = ["General", "Event", "Program", "Advisory", "Festival"] as const;
type PostCategory = (typeof POST_CATEGORIES)[number];

const TOPIC_LABELS: Record<string, string> = {
  healthcare: "Healthcare",
  education: "Education",
  food: "Food & Dining",
  transport: "Transport",
  community: "Community",
  hotspots: "Hotspots",
  finance: "Finance",
  shopping: "Shopping",
  lifestyle: "Lifestyle",
  officials: "Officials",
  rules: "Rules",
  fare: "Tricycle fare",
  documents: "Documents",
  hotlines: "Hotlines",
  history: "History",
  weather: "Weather",
};

/* Replies that mean CaliBot did not have the answer (English + Cebuano) */
const UNANSWERED_RE =
  /(couldn'?t find|could not find|no directly relevant|not (?:yet )?listed|isn'?t listed|is not listed|don'?t have (?:that|any|information)|do not have (?:that|any|information)|no information|not available in|wala koy|walay impormasyon|dili nako makita|wala sa listahan)/i;

/* ═════════════════════════════════════════════════════════
   DATA SHAPES
   ═════════════════════════════════════════════════════════ */

interface ChatLog {
  question: string;
  reply: string;
  topics: string[];
  sourcesCount: number;
  fallback: boolean;
  at: Date | null;
}

interface Biz {
  name: string;
  status: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  deletionPending: boolean;
  needsReview: boolean;
}

interface Listing {
  key: string; // "<collection>/<id>"
  page: ExplorePage;
  name: string;
  published: boolean;
  hasImage: boolean;
  hasHours: boolean;
  ratingAvg: number;
  ratingCount: number;
}

interface Review {
  rating: number;
  at: Date | null;
  comment: string;
  listingKey: string;
}

interface Posting {
  kind: "announcement" | "event";
  title: string;
  category: PostCategory;
  postedAt: Date | null;
  eventDate: Date | null;
}

interface ReportData {
  logs: ChatLog[] | null;
  businesses: Biz[] | null;
  listings: Listing[] | null;
  reviews: Review[] | null;
  postings: Posting[] | null;
}

/* ═════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════ */

type AnyDoc = Record<string, unknown>;

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const maybe = v as { toDate?: () => Date; seconds?: number };
  if (typeof maybe.toDate === "function") return maybe.toDate();
  if (typeof maybe.seconds === "number") return new Date(maybe.seconds * 1000);
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function firstDate(d: AnyDoc, keys: string[]): Date | null {
  for (const k of keys) {
    const x = toDate(d[k]);
    if (x) return x;
  }
  return null;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function classifyPost(category: unknown): PostCategory {
  const c = (str(category) || "General").toLowerCase();
  return POST_CATEGORIES.find((cat) => c.includes(cat.toLowerCase())) ?? "General";
}

function rangeStart(key: RangeKey, now: Date): Date | null {
  if (key === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (key === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (key === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

const inRange = (d: Date | null, start: Date | null) => !!d && (!start || d >= start);

interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

/* Days for 30 days, weeks for 3 months, months for a year / all time */
function buildBuckets(key: RangeKey, now: Date): Bucket[] {
  const out: Bucket[] = [];
  const fmtDay = (d: Date) => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const fmtMonth = (d: Date) => d.toLocaleDateString("en-PH", { month: "short" });

  if (key === "30d") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 29; i >= 0; i--) {
      const start = new Date(today.getTime() - i * 86400000);
      out.push({ label: fmtDay(start), start, end: new Date(start.getTime() + 86400000) });
    }
  } else if (key === "90d") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    for (let i = 12; i >= 0; i--) {
      const end = new Date(today.getTime() - i * 7 * 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      out.push({ label: fmtDay(start), start, end });
    }
  } else {
    const months = key === "year" ? now.getMonth() + 1 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      out.push({ label: fmtMonth(start), start, end });
    }
  }
  return out;
}

function countPerBucket(dates: (Date | null)[], buckets: Bucket[]): number[] {
  const counts = buckets.map(() => 0);
  for (const d of dates) {
    if (!d) continue;
    const i = buckets.findIndex((b) => d >= b.start && d < b.end);
    if (i >= 0) counts[i]++;
  }
  return counts;
}

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/* ═════════════════════════════════════════════════════════
   LOADERS (each one fails on its own; the page keeps going)
   ═════════════════════════════════════════════════════════ */

async function loadLogs(): Promise<ChatLog[]> {
  const snap = await getDocs(
    query(collection(db, "calibot_logs"), orderBy("timestamp", "desc"), limit(LOG_LIMIT))
  );
  return snap.docs.map((doc) => {
    const d = doc.data() as AnyDoc;
    return {
      question: str(d.user_question),
      reply: str(d.bot_response),
      topics: Array.isArray(d.topics) ? d.topics.filter((t): t is string => typeof t === "string") : [],
      sourcesCount: Array.isArray(d.sources) ? d.sources.length : 0,
      fallback: d.model === "fallback",
      at: toDate(d.timestamp),
    };
  });
}

async function loadBusinesses(): Promise<Biz[]> {
  const snap = await getDocs(collection(db, "businesses"));
  return snap.docs.map((doc) => {
    const d = doc.data() as AnyDoc;
    const del = d.deletionRequest as AnyDoc | undefined;
    return {
      name: str(d.businessName),
      status: str(d.overallStatus) || "pending",
      submittedAt: toDate(d.submittedAt),
      reviewedAt: toDate(d.reviewedAt),
      deletionPending: del?.status === "pending",
      needsReview: d.needsReview === true,
    };
  });
}

async function loadListings(): Promise<Listing[]> {
  const pages = Object.keys(EXPLORE_PAGES) as ExplorePage[];
  const sources = EXPLORE_SOURCES as readonly string[];
  const perPage = await Promise.all(
    pages.map(async (page) => {
      const col = PAGE_COLLECTION[page];
      const snap = await getDocs(collection(db, col));
      return snap.docs
        .map((doc) => ({ id: doc.id, d: doc.data() as AnyDoc }))
        // Same rule as the Explore pages: only listings with a known source count
        .filter(({ d }) => sources.includes(str(d.source)))
        .map(({ id, d }): Listing => ({
          key: `${col}/${id}`,
          page,
          name: str(d.name) || "(untitled)",
          published: d.published !== false,
          hasImage: !!(str(d.image) || str(d.imageSrc)),
          hasHours: sanitizeHours(d.operatingHours) !== null,
          ratingAvg: num(d.ratingAvg),
          ratingCount: num(d.ratingCount),
        }));
    })
  );
  return perPage.flat();
}

async function loadReviews(): Promise<Review[]> {
  const snap = await getDocs(query(collectionGroup(db, "reviews"), limit(REVIEW_LIMIT)));
  return snap.docs
    .map((doc) => {
      const d = doc.data() as AnyDoc;
      const listingRef = doc.ref.parent.parent; // <collection>/<listingId>/reviews/<reviewId>
      return {
        rating: num(d.rating ?? d.stars ?? d.score),
        at: firstDate(d, ["createdAt", "timestamp", "updatedAt"]),
        comment: str(d.comment) || str(d.text) || str(d.body),
        listingKey: listingRef ? `${listingRef.parent.id}/${listingRef.id}` : "",
      };
    })
    .filter((r) => r.rating > 0);
}

async function loadPostings(): Promise<Posting[]> {
  const read = async (col: string, kind: Posting["kind"]) => {
    const snap = await getDocs(collection(db, col));
    return snap.docs.map((doc): Posting => {
      const d = doc.data() as AnyDoc;
      return {
        kind,
        title: str(d.title) || str(d.name) || "(untitled)",
        category: classifyPost(d.category),
        postedAt: firstDate(d, ["createdAt", "timestamp", "datePosted", "postedAt", "date"]),
        eventDate: kind === "event" ? firstDate(d, ["eventDate", "startDate", "start", "date"]) : null,
      };
    });
  };
  const [ann, evt] = await Promise.all([read("announcements", "announcement"), read("events", "event")]);
  return [...ann, ...evt];
}

async function settle<T>(p: Promise<T>, label: string): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    console.error(`Reports: could not load ${label}:`, err);
    return null;
  }
}

/* ═════════════════════════════════════════════════════════
   SMALL UI PIECES
   ═════════════════════════════════════════════════════════ */

function StatCard({
  icon: Icon,
  value,
  label,
  warn,
}: {
  icon: React.ComponentType<{ size?: number }>;
  value: React.ReactNode;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className={`stat-card${warn ? " warn" : ""}`}>
      <Icon size={22} />
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  wide,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`panel${wide ? " wide" : ""}`}>
      <h2>
        <Icon size={16} className="panel-heading-icon" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => <div className="panel-state">{children}</div>;

/* Vertical bars over time (labels thinned so they never overlap) */
function ColumnChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const every = Math.ceil(labels.length / 10);
  return (
    <div className="col-chart" role="img" aria-label="Chart over time">
      <div className="col-bars">
        {values.map((v, i) => (
          <div className="col" key={i} title={`${labels[i]}: ${v}`}>
            {v > 0 && <span className="col-val">{v}</span>}
            <div className="col-fill" style={{ height: `${(v / max) * 100}%`, background: color }} />
          </div>
        ))}
      </div>
      <div className="col-labels">
        {labels.map((l, i) => (
          <span key={i}>{i % every === 0 ? l : ""}</span>
        ))}
      </div>
    </div>
  );
}

/* Horizontal bars for a ranked list */
function HBars({ rows, color }: { rows: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <>
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <div className="bar-label">
            <span>{r.label}</span>
            <b>{r.value}</b>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </>
  );
}

/* ═════════════════════════════════════════════════════════
   MAIN
   ═════════════════════════════════════════════════════════ */

export default function AdminReports() {
  const { ready } = useAdminGuard();

  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const [logs, businesses, listings, reviews, postings] = await Promise.all([
      settle(loadLogs(), "CaliBot logs"),
      settle(loadBusinesses(), "businesses"),
      settle(loadListings(), "Explore listings"),
      settle(loadReviews(), "reviews"),
      settle(loadPostings(), "announcements and events"),
    ]);
    setData({ logs, businesses, listings, reviews, postings });
    setGeneratedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (ready) loadReport();
  }, [ready, loadReport]);

  /* ── Everything the page shows, worked out once per data/range change ── */
  const r = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const start = rangeStart(range, now);
    const buckets = buildBuckets(range, now);
    const labels = buckets.map((b) => b.label);

    /* 1. CaliBot */
    const logs = (data.logs ?? []).filter((l) => inRange(l.at, start));
    const unanswered = logs.filter((l) => UNANSWERED_RE.test(l.reply));
    const fallbackCount = logs.filter((l) => l.fallback).length;
    const topicCounts = new Map<string, number>();
    for (const l of logs) {
      const topics = l.topics.length ? Array.from(new Set(l.topics)) : ["other"];
      for (const t of topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
    }
    const topTopics = Array.from(topicCounts.entries())
      .map(([t, n]) => ({ label: t === "other" ? "General / other" : TOPIC_LABELS[t] ?? t, value: n }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    /* 2. Businesses */
    const biz = data.businesses ?? [];
    const bizPending = biz.filter((b) => b.status === "pending").length;
    const bizApproved = biz.filter((b) => b.status === "approved").length;
    const bizRejected = biz.filter((b) => b.status === "rejected").length;
    const bizNew = biz.filter((b) => inRange(b.submittedAt, start));
    const approvalDays = biz
      .filter((b) => b.status === "approved" && b.submittedAt && b.reviewedAt && inRange(b.reviewedAt, start))
      .map((b) => (b.reviewedAt!.getTime() - b.submittedAt!.getTime()) / 86400000)
      .filter((d) => d >= 0);
    const avgApprovalDays = approvalDays.length
      ? approvalDays.reduce((s, d) => s + d, 0) / approvalDays.length
      : null;

    /* 3. Explore directory */
    const listings = data.listings ?? [];
    const pages = Object.keys(EXPLORE_PAGES) as ExplorePage[];
    const perPage = pages.map((p) => {
      const rows = listings.filter((l) => l.page === p);
      const live = rows.filter((l) => l.published);
      return {
        page: p,
        label: EXPLORE_PAGES[p].label,
        total: rows.length,
        live: live.length,
        hidden: rows.length - live.length,
        noHours: live.filter((l) => !l.hasHours).length,
        noPhoto: live.filter((l) => !l.hasImage).length,
      };
    });
    const liveListings = listings.filter((l) => l.published);
    const missingHours = liveListings.filter((l) => !l.hasHours).length;
    const missingPhoto = liveListings.filter((l) => !l.hasImage).length;
    const complete = liveListings.filter((l) => l.hasHours && l.hasImage).length;

    /* 4. Ratings */
    const byKey = new Map(listings.map((l) => [l.key, l]));
    const rated = liveListings.filter((l) => l.ratingCount > 0);
    const topRated = [...rated]
      .filter((l) => l.ratingCount >= 2)
      .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
      .slice(0, 5);
    const mostReviewed = [...rated].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 5);
    const reviewsInRange = (data.reviews ?? []).filter((rv) => inRange(rv.at, start));
    const lowRatings = reviewsInRange
      .filter((rv) => rv.rating <= 2)
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
      .slice(0, 8)
      .map((rv) => ({ ...rv, listingName: byKey.get(rv.listingKey)?.name ?? "Unknown listing" }));

    /* 5. Postings */
    const postings = data.postings ?? [];
    const postsInRange = postings.filter((p) => inRange(p.postedAt, start));
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const upcoming = postings
      .filter((p) => p.kind === "event" && p.eventDate && p.eventDate >= now && p.eventDate <= in30)
      .sort((a, b) => a.eventDate!.getTime() - b.eventDate!.getTime())
      .slice(0, 8);
    const catRows = POST_CATEGORIES.map((cat) => {
      const a = postings.filter((p) => p.kind === "announcement" && p.category === cat).length;
      const e = postings.filter((p) => p.kind === "event" && p.category === cat).length;
      return { cat, a, e };
    });

    return {
      labels,
      chat: {
        total: logs.length,
        perBucket: countPerBucket(logs.map((l) => l.at), buckets),
        unanswered: unanswered.slice(0, 15),
        unansweredCount: unanswered.length,
        fallbackCount,
        topTopics,
      },
      biz: {
        pending: bizPending,
        approved: bizApproved,
        rejected: bizRejected,
        newCount: bizNew.length,
        perBucket: countPerBucket(bizNew.map((b) => b.submittedAt), buckets),
        avgApprovalDays,
        deletion: biz.filter((b) => b.deletionPending).length,
        edited: biz.filter((b) => b.needsReview).length,
      },
      explore: { perPage, live: liveListings.length, total: listings.length, missingHours, missingPhoto, complete },
      ratings: { topRated, mostReviewed, newReviews: reviewsInRange.length, lowRatings },
      posts: {
        count: postsInRange.length,
        perBucket: countPerBucket(postsInRange.map((p) => p.postedAt), buckets),
        upcoming,
        catRows,
      },
    };
  }, [data, range]);

  if (!ready) return null;

  const rangeLabel = RANGES.find((x) => x.key === range)?.label ?? "";
  const show = (v: number | string) => (loading || !r ? "—" : v);

  return (
    <div className="admin-reports-root">
      <style>{`
        .admin-reports-root, .admin-reports-root *, .admin-reports-root *::before, .admin-reports-root *::after { box-sizing: border-box; }
        .admin-reports-root { font-family: 'Segoe UI', sans-serif; background: #f0f4f8; display: flex; min-height: 100vh; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .content { margin-left: 240px; padding: 32px 36px; flex: 1; min-width: 0; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 12px; }
        .header h1 { font-size: 1.4rem; color: #1a3d28; font-weight: 700; display: flex; align-items: center; gap: 8px; margin: 0; }
        .subtitle { font-size: .85rem; color: #778; margin-bottom: 20px; }
        .print-only { display: none; }

        .toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .range-select { border: 1px solid #d8e2da; border-radius: 8px; padding: 9px 10px; font-size: .86rem; background: #fff; font-family: inherit; }
        .btn { border: none; padding: 10px 18px; border-radius: 8px; font-size: .86rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-primary { background: ${GREEN}; color: #fff; }
        .btn-primary:hover { background: #145029; }
        .btn-light { background: #fff; color: ${GREEN}; border: 1.5px solid ${GREEN}; }
        .btn:disabled { opacity: .6; cursor: default; }

        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 26px; }
        .stat-card { background: #fff; border-radius: 12px; padding: 18px 14px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,.07); }
        .stat-card svg { color: ${GREEN}; margin-bottom: 6px; }
        .stat-card.warn svg, .stat-card.warn h2 { color: #b9770e; }
        .stat-card h2 { font-size: 1.6rem; font-weight: 700; color: #1a3d28; margin: 0; }
        .stat-card p { font-size: .76rem; color: #777; margin-top: 2px; }

        .section-title { font-size: 1.05rem; font-weight: 700; color: #1a3d28; margin: 30px 0 14px; display: flex; align-items: center; gap: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .panel { background: #fff; border-radius: 12px; padding: 22px 24px; box-shadow: 0 2px 10px rgba(0,0,0,.07); min-width: 0; }
        .panel.wide { grid-column: 1 / -1; }
        .panel h2 { font-size: .95rem; font-weight: 700; color: #1a3d28; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 2px solid #e8f5ee; display: flex; align-items: center; gap: 6px; }
        .panel-heading-icon { color: ${GREEN}; }
        .panel-state { text-align: center; padding: 26px 10px; color: #888; font-size: .85rem; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .mini-stats { display: flex; gap: 22px; flex-wrap: wrap; margin-bottom: 14px; }
        .mini-stats div { font-size: .78rem; color: #667; }
        .mini-stats b { display: block; font-size: 1.25rem; color: #1a3d28; }

        .bar-row { margin-bottom: 13px; }
        .bar-row:last-child { margin-bottom: 0; }
        .bar-label { display: flex; justify-content: space-between; font-size: .82rem; color: #333; margin-bottom: 5px; }
        .bar-label b { color: #1a3d28; }
        .bar-track { background: #eef4f0; border-radius: 6px; height: 9px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 6px; transition: width .4s ease; }

        .col-chart { width: 100%; }
        .col-bars { display: flex; align-items: flex-end; gap: 3px; height: 170px; border-bottom: 1px solid #dfe8e2; }
        .col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; min-width: 0; }
        .col-fill { width: 100%; max-width: 34px; border-radius: 4px 4px 0 0; min-height: 0; }
        .col-val { font-size: .62rem; color: #556; margin-bottom: 2px; }
        .col-labels { display: flex; gap: 3px; margin-top: 6px; }
        .col-labels span { flex: 1; font-size: .62rem; color: #889; text-align: center; white-space: nowrap; overflow: visible; min-width: 0; }

        table { width: 100%; border-collapse: collapse; font-size: .84rem; }
        thead { background: #f4faf6; }
        th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #e8f0ec; vertical-align: top; }
        th { font-weight: 700; color: #1a3d28; font-size: .74rem; text-transform: uppercase; letter-spacing: .4px; }
        td.num, th.num { text-align: right; }
        td.num { font-weight: 600; color: #1a3d28; }
        td.warn { color: #b9770e; }
        .total-row { background: #f4faf6; font-weight: 700; }
        .muted { color: #889; font-size: .78rem; }
        .q-text { color: #1a3d28; }
        .table-wrap { overflow-x: auto; }

        @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .content { margin-left: 200px; padding: 18px; } }
        @media (max-width: 540px) { .content { margin-left: 0; } }
        @media print {
          .adm-sidebar, .toolbar { display: none !important; }
          .print-only { display: block; }
          .content { margin-left: 0; padding: 0; }
          .admin-reports-root { background: #fff; }
          .panel, .stat-card { box-shadow: none; border: 1px solid #ddd; break-inside: avoid; }
        }
      `}</style>

      <AdminSidebar />

      <main className="content">
        <div className="header">
          <h1>
            <LineChart size={20} color={GREEN} />
            Reports
          </h1>
          <div className="toolbar">
            <select
              className="range-select"
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              aria-label="Report period"
            >
              {RANGES.map((x) => (
                <option key={x.key} value={x.key}>{x.label}</option>
              ))}
            </select>
            <button className="btn btn-light" onClick={loadReport} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Print / Export
            </button>
          </div>
        </div>
        <p className="subtitle">
          How MyCalinan is serving Calinan — {rangeLabel.toLowerCase()}.
          {generatedAt && ` Generated ${generatedAt.toLocaleString("en-PH")}.`}
        </p>
        <p className="print-only subtitle">MyCalinan Monthly Report · Barangay Calinan Poblacion</p>

        {/* ── Summary ── */}
        <div className="stats">
          <StatCard icon={Bot} value={show(r?.chat.total ?? 0)} label="CaliBot questions" />
          <StatCard icon={HelpCircle} value={show(r?.chat.unansweredCount ?? 0)} label="Unanswered questions" warn={!!r?.chat.unansweredCount} />
          <StatCard icon={Store} value={show(r?.biz.pending ?? 0)} label="Pending applications" warn={!!r?.biz.pending} />
          <StatCard icon={MapPin} value={show(r?.explore.live ?? 0)} label="Live listings" />
          <StatCard icon={Clock} value={show(r?.explore.missingHours ?? 0)} label="Listings missing hours" warn={!!r?.explore.missingHours} />
          <StatCard icon={Star} value={show(data?.reviews ? r?.ratings.newReviews ?? 0 : "n/a")} label="New reviews" />
        </div>

        {loading || !r || !data ? (
          <Note>
            <Loader2 size={16} className="spin" /> Loading report…
          </Note>
        ) : (
          <>
            {/* ═══ 1. CALIBOT ═══ */}
            <div className="section-title"><Bot size={18} color={GREEN} /> CaliBot insights</div>
            {data.logs === null ? (
              <Note>⚠️ Could not read the CaliBot logs. Check that admins may read “calibot_logs” in the Firestore rules.</Note>
            ) : (
              <div className="grid">
                <Panel title="Questions asked" icon={LineChart} wide>
                  <div className="mini-stats">
                    <div><b>{r.chat.total}</b>questions</div>
                    <div><b>{pct(r.chat.unansweredCount, r.chat.total)}%</b>not answered</div>
                    <div><b>{r.chat.fallbackCount}</b>answered without AI (fallback)</div>
                  </div>
                  {r.chat.total === 0 ? <Note>No questions in this period.</Note> : (
                    <ColumnChart labels={r.labels} values={r.chat.perBucket} color={GREEN} />
                  )}
                </Panel>

                <Panel title="Most asked topics" icon={Layers}>
                  {r.chat.topTopics.length === 0 ? <Note>No questions in this period.</Note> : (
                    <HBars rows={r.chat.topTopics} color={GREEN} />
                  )}
                </Panel>

                <Panel title="Questions CaliBot couldn't answer" icon={HelpCircle}>
                  {r.chat.unanswered.length === 0 ? (
                    <Note>None in this period. 🎉</Note>
                  ) : (
                    <>
                      <p className="muted" style={{ marginTop: 0 }}>
                        Add this information to MyCalinan so CaliBot can answer next time.
                      </p>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Question</th><th>Date</th></tr></thead>
                          <tbody>
                            {r.chat.unanswered.map((l, i) => (
                              <tr key={i}>
                                <td className="q-text">{l.question}</td>
                                <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(l.at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </Panel>
              </div>
            )}

            {/* ═══ 2. BUSINESSES ═══ */}
            <div className="section-title"><Store size={18} color={GREEN} /> Business applications</div>
            {data.businesses === null ? (
              <Note>⚠️ Could not read business applications.</Note>
            ) : (
              <div className="grid">
                <Panel title="Status" icon={Store}>
                  <div className="mini-stats">
                    <div><b>{r.biz.pending}</b>pending</div>
                    <div><b>{r.biz.approved}</b>approved</div>
                    <div><b>{r.biz.rejected}</b>rejected</div>
                  </div>
                  <div className="mini-stats">
                    <div>
                      <b>{r.biz.avgApprovalDays === null ? "—" : r.biz.avgApprovalDays.toFixed(1)}</b>
                      average days to approval
                    </div>
                    <div><b>{r.biz.deletion}</b>deletion requests</div>
                    <div><b>{r.biz.edited}</b>edited by owner, to review</div>
                  </div>
                </Panel>
                <Panel title={`New registrations (${r.biz.newCount})`} icon={LineChart}>
                  {r.biz.newCount === 0 ? <Note>No new registrations in this period.</Note> : (
                    <ColumnChart labels={r.labels} values={r.biz.perBucket} color={GOLD} />
                  )}
                </Panel>
              </div>
            )}

            {/* ═══ 3. EXPLORE DIRECTORY ═══ */}
            <div className="section-title"><MapPin size={18} color={GREEN} /> Explore directory health</div>
            {data.listings === null ? (
              <Note>⚠️ Could not read the Explore listings.</Note>
            ) : (
              <div className="grid">
                <Panel title="Listings per page" icon={MapPin} wide>
                  <div className="mini-stats">
                    <div><b>{r.explore.live}</b>live listings</div>
                    <div><b>{pct(r.explore.complete, r.explore.live)}%</b>complete (hours + photo)</div>
                    <div><b>{r.explore.missingHours}</b>missing hours</div>
                    <div><b>{r.explore.missingPhoto}</b>missing a photo</div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th className="num">Live</th>
                          <th className="num">Hidden</th>
                          <th className="num">Missing hours</th>
                          <th className="num">Missing photo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.explore.perPage.map((p) => (
                          <tr key={p.page}>
                            <td>{p.label}</td>
                            <td className="num">{p.live}</td>
                            <td className="num">{p.hidden}</td>
                            <td className={`num${p.noHours ? " warn" : ""}`}>{p.noHours}</td>
                            <td className={`num${p.noPhoto ? " warn" : ""}`}>{p.noPhoto}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td>Total</td>
                          <td className="num">{r.explore.live}</td>
                          <td className="num">{r.explore.total - r.explore.live}</td>
                          <td className="num">{r.explore.missingHours}</td>
                          <td className="num">{r.explore.missingPhoto}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="muted">Fix these in Admin › Listings › Explore Listings (use the “Missing hours” and “Photo problems” filters).</p>
                </Panel>
              </div>
            )}

            {/* ═══ 4. RATINGS ═══ */}
            <div className="section-title"><Star size={18} color={GREEN} /> Ratings &amp; reviews</div>
            {data.listings === null ? (
              <Note>⚠️ Could not read the Explore listings.</Note>
            ) : (
              <div className="grid">
                <Panel title="Top rated (2+ reviews)" icon={Star}>
                  {r.ratings.topRated.length === 0 ? <Note>Not enough reviews yet.</Note> : (
                    <table>
                      <tbody>
                        {r.ratings.topRated.map((l) => (
                          <tr key={l.key}>
                            <td>{l.name}<div className="muted">{EXPLORE_PAGES[l.page].label}</div></td>
                            <td className="num">★ {l.ratingAvg.toFixed(1)}<div className="muted">{l.ratingCount} reviews</div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
                <Panel title="Most reviewed" icon={Layers}>
                  {r.ratings.mostReviewed.length === 0 ? <Note>No reviews yet.</Note> : (
                    <HBars rows={r.ratings.mostReviewed.map((l) => ({ label: l.name, value: l.ratingCount }))} color={GOLD} />
                  )}
                </Panel>
                <Panel title="Recent low ratings (1–2 stars)" icon={AlertCircle} wide>
                  {data.reviews === null ? (
                    <Note>Individual reviews could not be read. Allow admins to read the “reviews” collection group in the Firestore rules to see this.</Note>
                  ) : r.ratings.lowRatings.length === 0 ? (
                    <Note>No low ratings in this period. 🎉</Note>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Place</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead>
                        <tbody>
                          {r.ratings.lowRatings.map((rv, i) => (
                            <tr key={i}>
                              <td>{rv.listingName}</td>
                              <td style={{ whiteSpace: "nowrap" }}>{"★".repeat(Math.round(rv.rating))}</td>
                              <td className="q-text">{rv.comment || <span className="muted">(no comment)</span>}</td>
                              <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(rv.at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              </div>
            )}

            {/* ═══ 5. ANNOUNCEMENTS & EVENTS ═══ */}
            <div className="section-title"><Megaphone size={18} color={GREEN} /> Announcements &amp; events</div>
            {data.postings === null ? (
              <Note>⚠️ Could not read announcements and events.</Note>
            ) : (
              <div className="grid">
                <Panel title={`Posts in this period (${r.posts.count})`} icon={LineChart}>
                  {r.posts.count === 0 ? <Note>No posts in this period.</Note> : (
                    <ColumnChart labels={r.labels} values={r.posts.perBucket} color={BLUE} />
                  )}
                </Panel>
                <Panel title="Upcoming events (next 30 days)" icon={CalendarDays}>
                  {r.posts.upcoming.length === 0 ? <Note>No events in the next 30 days.</Note> : (
                    <table>
                      <tbody>
                        {r.posts.upcoming.map((p, i) => (
                          <tr key={i}>
                            <td>{p.title}<div className="muted">{p.category}</div></td>
                            <td className="num" style={{ whiteSpace: "nowrap" }}>{fmtDate(p.eventDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
                <Panel title="Category summary — all postings" icon={Layers} wide>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th className="num">Announcements</th>
                          <th className="num">Events &amp; Festivals</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.posts.catRows.map((c) => (
                          <tr key={c.cat}>
                            <td>{c.cat}</td>
                            <td className="num">{c.a}</td>
                            <td className="num">{c.e}</td>
                            <td className="num">{c.a + c.e}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td>Total</td>
                          <td className="num">{r.posts.catRows.reduce((s, c) => s + c.a, 0)}</td>
                          <td className="num">{r.posts.catRows.reduce((s, c) => s + c.e, 0)}</td>
                          <td className="num">{r.posts.catRows.reduce((s, c) => s + c.a + c.e, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}