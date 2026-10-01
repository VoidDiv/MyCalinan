import type { Metadata } from "next";
import OfflineCachedPages from "@/components/OfflineCachedPages";
import BarangayOfficials from "@/components/BarangayOfficials";
import RulesAndRegulations from "@/components/RulesAndRegulations";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-10 text-center">
        <h1 className="font-display text-3xl font-semibold text-canopy-950">
          You&rsquo;re offline
        </h1>
        <p className="max-w-sm text-ink-500">
          No internet right now, but the pages you&rsquo;ve already opened are saved on your phone.
          Pick one below, or check your connection and try again.
        </p>
        <OfflineCachedPages />
      </div>

      {/* Saved on the device, so these still work with no internet */}
      <BarangayOfficials />
      <RulesAndRegulations />
    </main>
  );
}