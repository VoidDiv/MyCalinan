"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import WovenDivider from "./WovenDivider";

type Rule = {
  id: string;
  title: string;
  body: string;
  order?: number;
  public?: boolean;
};

export default function BarangayRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDocs(collection(db, "barangayRules"))
      .then((snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Rule)
          .filter((r) => r.public !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        if (!cancelled) setRules(items);
      })
      .catch((err) => {
        console.error("Failed to load barangay rules:", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-canopy-100 px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl">
          Rules and regulations
        </h2>
        <p className="mt-1 font-mono text-xs text-ink-500">
          Barangay Calinan Poblacion
        </p>
        <WovenDivider tone="cream" />

        {loading && (
          <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">
            Loading rules...
          </p>
        )}

        {!loading && error && (
          <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">
            Unable to load rules right now.
          </p>
        )}

        {!loading && !error && rules.length === 0 && (
          <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">
            No rules posted yet.
          </p>
        )}

        {!loading && !error && rules.length > 0 && (
          <ol className="mt-5 space-y-3 sm:mt-8 sm:space-y-4">
            {rules.map((rule, i) => (
              <li
                key={rule.id}
                className="flex gap-4 rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white p-4 shadow-sm sm:p-5"
              >
                <span className="font-mono text-xs text-durian-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-canopy-900">
                    {rule.title}
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-500">
                    {rule.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}