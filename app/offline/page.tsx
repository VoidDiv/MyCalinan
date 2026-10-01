import type { Metadata } from "next";
import OfflineCachedPages from "@/components/OfflineCachedPages";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 py-10 text-center">
      <h1 className="font-display text-3xl font-semibold text-canopy-950">
        You&rsquo;re offline
      </h1>
      <p className="max-w-sm text-ink-500">
        No internet right now, but the pages you&rsquo;ve already opened are saved on your phone.
        Pick one below, or check your connection and try again.
      </p>
      <OfflineCachedPages />
    </main>
  );
}