/* ============================================================
   FILE: components/UpdateNotifier.tsx 
   Tells people on their phones when a newer MyCalinan is live.

   - Up to date  -> draws NOTHING. No banner, no reload, no flash. (It only asks
                    the server a tiny question in the background.)
   - Out of date -> a small banner at the bottom: "Update your MyCalinan app"
                    with [Update now] and [Later]. It STAYS on the screen until the
                    person taps one of them (it never hides by itself, and a later
                    check that says "same version" does not take it away).
   - Breaking change (Vercel variable MYCALINAN_FORCE_UPDATE=1) -> a window that
                    can only be closed by updating (not on admin pages, so an
                    admin in the middle of a form is never blocked).

   WHEN IT ASKS THE SERVER (/api/version)
   - a few seconds after the app opens (so it never competes with loading)
   - every time the app comes back to the front (phones keep an installed app
     alive in the background for days: this is how they hear about new versions)
   - every 10 minutes while it is open, and when the phone gets internet again
   - at once when the page hits "a file is missing" errors (an old page talking
     to a newer deployment)
   It never asks while the phone is offline, and a failed check is silent.

   WHAT "Update now" DOES
   1. shows "Updating MyCalinan…" with a progress bar for at least 2.5 seconds
      (so it is never a flash),
   2. forgets the saved offline copy of the page you are on (so the reload cannot
      show the old page again),
   3. asks the service worker to look for a newer sw.js,
   4. reloads, and then shows "MyCalinan is now up to date" for 5 seconds.
      Other offline pages refresh the next time they are opened online.
   ============================================================ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CURRENT_VERSION,
  isForceExempt,
  isOutdated,
  looksLikeStaleDeployError,
  parseVersionInfo,
  shouldCheckNow,
  type VersionInfo,
} from "@/lib/appVersion";

const FIRST_CHECK_DELAY_MS = 4000;
const MIN_GAP_MS = 60_000;
/** Even when something urgent asks (an error, the phone coming online), never more often than this: a burst of errors must not flood the server. */
const MIN_URGENT_GAP_MS = 3000;
const INTERVAL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 8000;
const RELOAD_GIVE_UP_MS = 12000;
/** "Updating…" stays on the screen at least this long, so the person can read it (the reload itself takes a split second). */
const UPDATING_MIN_MS = 2500;
/** How long "MyCalinan is now up to date" stays after the reload. */
const UPDATED_TOAST_MS = 5000;
/** sessionStorage: the version we are reloading INTO (so the new page knows the update worked). */
const UPDATED_KEY = "mc_updated_to";
/** sessionStorage: the version the person answered "Later" to (asked again next time the app is opened). */
const DISMISS_KEY = "mc_update_dismissed";

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/** Removes the saved offline copy of the page you are on, so the reload really loads the new one. */
async function forgetSavedCopyOfThisPage(): Promise<void> {
  if (typeof caches === "undefined") return;
  const here = location.pathname.length > 1 ? location.pathname.replace(/\/+$/, "") : location.pathname;
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((n) => n.startsWith("mc-pages"))
      .map(async (n) => {
        const cache = await caches.open(n);
        const keys = await cache.keys();
        await Promise.all(
          keys
            .filter((req) => {
              const p = new URL(req.url).pathname;
              return (p.length > 1 ? p.replace(/\/+$/, "") : p) === here;
            })
            .map((req) => cache.delete(req))
        );
      })
  );
}

export default function UpdateNotifier() {
  const pathname = usePathname() || "/";

  const [latest, setLatest] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const [shown, setShown] = useState(false); // drives the gentle fade-in
  const [justUpdated, setJustUpdated] = useState(false); // "MyCalinan is now up to date" after the reload

  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);

  /* ───────── ask the server which version is live ───────── */
  const check = useCallback(async (urgent = false) => {
    if (CURRENT_VERSION === "dev") return; // on your computer (npm run dev) there is nothing to update
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (checkingRef.current) return;
    const now = Date.now();
    if (!shouldCheckNow(lastCheckRef.current, now, urgent ? MIN_URGENT_GAP_MS : MIN_GAP_MS)) return;

    checkingRef.current = true;
    lastCheckRef.current = now;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch("/api/version", { cache: "no-store", credentials: "omit", signal: controller.signal });
      if (!res.ok) return;
      const info = parseVersionInfo(await res.json());
      if (!info) return;
      // Once an update is known, the banner stays. A later "same version" answer (a deploy still settling,
      // a server that answers from two versions for a moment) must NOT take it away; only a reload does.
      if (isOutdated(CURRENT_VERSION, info.version)) setLatest(info);
    } catch {
      /* offline, slow or the server is busy: stay silent, try again later */
    } finally {
      clearTimeout(timer);
      checkingRef.current = false;
    }
    // Also let the browser look for a changed sw.js (it only differs when you change sw.js)
    navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
  }, []);

  /* ───────── when to ask ───────── */
  useEffect(() => {
    setDismissed(readDismissed());

    const first = setTimeout(() => void check(), FIRST_CHECK_DELAY_MS);
    const every = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onOnline = () => void check(true);

    // An old page talking to a newer deployment fails with "a file is missing". Ask at once.
    const onError = (e: Event) => {
      const target = e.target as { tagName?: string; src?: string; href?: string } | null;
      const brokenAsset =
        !!target &&
        (target.tagName === "SCRIPT" || target.tagName === "LINK") &&
        /\/_next\/static\//.test(target.src || target.href || "");
      const ev = e as ErrorEvent;
      if (brokenAsset || looksLikeStaleDeployError(ev.message, ev.error?.name)) void check(true);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: string; name?: string } | string | undefined;
      const message = typeof reason === "string" ? reason : reason?.message;
      const name = typeof reason === "string" ? "" : reason?.name;
      if (looksLikeStaleDeployError(message, name)) void check(true);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("error", onError, true); // capture: a failed <script> does not bubble
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [check]);

  useEffect(() => {
    let target: string | null = null;
    try {
      target = sessionStorage.getItem(UPDATED_KEY);
      if (target) sessionStorage.removeItem(UPDATED_KEY);
    } catch {
      /* private mode: no confirmation, nothing else is lost */
    }
    // only when this page really IS the version we were updating to (an old copy served again says nothing)
    if (!target || target !== CURRENT_VERSION) return;
    setJustUpdated(true);
    const t = setTimeout(() => setJustUpdated(false), UPDATED_TOAST_MS);
    return () => clearTimeout(t);
  }, []);

  const forced = !!latest?.force && !isForceExempt(pathname);
  const visible = !!latest && (forced || dismissed !== latest.version);

  // fade in on the next frame (never a sudden jump), and not at all if the person prefers less motion (CSS handles that)
  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  const later = () => {
    if (!latest) return;
    try {
      sessionStorage.setItem(DISMISS_KEY, latest.version);
    } catch {
      /* private mode: just hide it for now */
    }
    setDismissed(latest.version);
  };

  const updateNow = async () => {
    if (updating || !latest) return;
    const target = latest.version;
    const started = Date.now();
    setUpdating(true);
    setUpdateFailed(false);
    const giveUp = setTimeout(() => {
      setUpdating(false);
      setUpdateFailed(true);
    }, RELOAD_GIVE_UP_MS);
    try {
      await forgetSavedCopyOfThisPage();
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update().catch(() => {});
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    } catch {
      /* not fatal: the reload below is what matters */
    }
    // keep "Updating…" on the screen long enough to read, even when everything above took a split second
    const left = UPDATING_MIN_MS - (Date.now() - started);
    if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
    try {
      sessionStorage.setItem(UPDATED_KEY, target);
    } catch {
      /* private mode */
    }
    window.location.reload();
    void giveUp; // if the reload never happens, the timer above re-enables the button
  };

  if (!visible || !latest) {
    if (!justUpdated) return null;
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" data-testid="update-done" role="status" aria-live="polite">
        <div className="pointer-events-auto rounded-full bg-green-900 px-4 py-2 text-sm font-semibold text-white shadow-xl ring-1 ring-black/10">
          ✔ MyCalinan is now up to date
        </div>
      </div>
    );
  }

  const fade = `transition-all duration-300 motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`;

  /* ── breaking change: must update ── */
  if (forced) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-testid="update-required" role="alertdialog" aria-modal="true" aria-labelledby="mc-update-title">
        <div className={`w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl ${fade}`}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl" aria-hidden="true">🔄</div>
          <h2 id="mc-update-title" className="text-lg font-bold text-neutral-900">Update your MyCalinan app</h2>
          <p className="mt-1 text-sm text-neutral-600">This update is required. Please update to keep using MyCalinan.</p>
          {updateFailed && <p className="mt-2 text-xs text-red-700" data-testid="update-failed">Could not update. Check your internet and try again.</p>}
          <button
            type="button"
            onClick={() => void updateNow()}
            disabled={updating}
            className="mt-4 w-full rounded-xl bg-green-800 py-2.5 text-sm font-bold text-white hover:bg-green-900 disabled:opacity-70"
            data-testid="update-now"
          >
            {updating ? "Updating MyCalinan… please wait" : "Update now"}
          </button>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-green-100" data-testid="update-progress" aria-hidden="true">
            <div className="h-full rounded-full bg-green-700 transition-[width] ease-linear" style={{ width: updating ? "100%" : "0%", transitionDuration: `${UPDATING_MIN_MS}ms` }} />
          </div>
        </div>
      </div>
    );
  }

  /* ── normal: a small banner, easy to ignore ── */
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid="update-banner"
      role="status"
      aria-live="polite"
    >
      <div className={`pointer-events-auto w-full max-w-md rounded-2xl bg-green-900 p-3 text-white shadow-xl ring-1 ring-black/10 ${fade}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden="true">🔄</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{updating ? "Updating MyCalinan… please wait" : "Update your MyCalinan app"}</p>
            <p className="text-xs text-green-100">{updating ? "The app will restart by itself in a moment." : "A new version is ready, with the latest features and fixes."}</p>
            {updateFailed && <p className="mt-1 text-xs font-semibold text-amber-200" data-testid="update-failed">Could not update. Check your internet and try again.</p>}
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void updateNow()}
            disabled={updating}
            className="flex-1 rounded-xl bg-white py-2 text-sm font-bold text-green-900 hover:bg-green-50 disabled:opacity-70"
            data-testid="update-now"
          >
            {updating ? "Updating…" : "Update now"}
          </button>
          <button
            type="button"
            onClick={later}
            disabled={updating}
            className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-green-50 hover:bg-green-700 disabled:opacity-60"
            data-testid="update-later"
          >
            Later
          </button>
        </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25" data-testid="update-progress" aria-hidden="true">
            <div className="h-full rounded-full bg-white transition-[width] ease-linear" style={{ width: updating ? "100%" : "0%", transitionDuration: `${UPDATING_MIN_MS}ms` }} />
          </div>
      </div>
    </div>
  );
}