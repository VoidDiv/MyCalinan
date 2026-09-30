import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-canopy-950">
        You&rsquo;re offline
      </h1>
      <p className="max-w-sm text-ink-500">
        MyCalinan needs an internet connection to load this page. Check your
        connection and try again.
      </p>
      <a
        href="/"
        className="rounded-[var(--radius-stall)] bg-canopy-700 px-6 py-3 font-semibold text-white hover:bg-canopy-800"
      >
        Try again
      </a>
    </main>
  );
}