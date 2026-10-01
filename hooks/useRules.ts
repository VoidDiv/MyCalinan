"use client";

import { useCachedJson } from "@/hooks/useCachedJson";

/* ============================================================
   useRules()

   The ONE place every rules section reads from: /api/rules — the
   same data the Admin Dashboard saves (Firestore: siteContent/rules).
   Both RulesAndRegulations and BarangayRules use this, so they can
   never show different rules from each other.

   - Online : the newest rules the admin saved
   - Offline: the last copy saved on the device (stale = true)
   ============================================================ */

export type Rule = { title: string; body: string };

export function useRules() {
  const { data, loading, error, stale } = useCachedJson<{ items: Rule[] }>("/api/rules");

  const rules: Rule[] = Array.isArray(data?.items)
    ? data.items.filter((r) => r && typeof r.title === "string" && r.title.trim())
    : [];

  return { rules, loading, error, stale };
}