/* ============================================================
   FILE: components/AppVersion.tsx
   A small line at the very bottom of the Home page:

       MyCalinan version 3f9a1c2 · ✔ Up to date

   It shows which version of the app is running on THIS phone, and asks the
   server if it is the newest one. Useful for you (to see if the installed app
   has the latest code) and harmless for everyone else.

   - "✔ Up to date"                 -> same version as the server
   - "⚠ A newer version is ready"   -> this copy is old (the update banner shows too)
   - nothing after the number       -> offline, or the server could not be asked
   - "version dev"                  -> you are running `npm run dev` on your computer
   It never shows a banner and never reloads anything.
   ============================================================ */

"use client";

import { useEffect, useState } from "react";
import { CURRENT_VERSION, isOutdated, parseVersionInfo } from "@/lib/appVersion";

type Status = "checking" | "current" | "outdated" | "unknown";

export default function AppVersion() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (CURRENT_VERSION === "dev") {
      setStatus("unknown");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch("/api/version", { cache: "no-store", credentials: "omit", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        const info = parseVersionInfo(data);
        setStatus(!info ? "unknown" : isOutdated(CURRENT_VERSION, info.version) ? "outdated" : "current");
      })
      .catch(() => setStatus("unknown")) // offline or slow: just show the number
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <div className="bg-neutral-100 px-4 py-2 text-center text-[11px] text-neutral-600" data-testid="app-version">
      MyCalinan version <span className="font-mono font-semibold">{CURRENT_VERSION}</span>
      {status === "current" && <span className="text-green-700"> · ✔ Up to date</span>}
      {status === "outdated" && <span className="font-semibold text-amber-700"> · ⚠ A newer version is ready</span>}
    </div>
  );
}