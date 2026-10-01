"use client";

import WovenDivider from "./WovenDivider";
import { useRules } from "@/hooks/useRules";

export default function RulesAndRegulations() {
  const { rules, loading, error, stale } = useRules();

  return (
    <section className="bg-canopy-100 px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl">
          Rules and regulations
        </h2>
        <WovenDivider tone="cream" />

        {loading && (
          <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">Loading rules...</p>
        )}

        {!loading && error && (
          <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">
            Unable to load the rules right now. Connect to the internet once to save them on this
            device.
          </p>
        )}

        {!loading && !error && stale && (
          <p className="mt-5 font-mono text-xs text-ink-500 sm:mt-8">
            You&rsquo;re offline — showing the last saved rules.
          </p>
        )}

        {!loading && !error && rules.length === 0 && (
          <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">No rules posted yet.</p>
        )}

        {!loading && !error && rules.length > 0 && (
          <ol className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
            {rules.map((rule, index) => (
              <li
                key={`${index}-${rule.title}`}
                className="flex gap-4 rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white p-4 shadow-sm sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canopy-700 font-mono text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-canopy-900">
                    {rule.title}
                  </h3>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-500">
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