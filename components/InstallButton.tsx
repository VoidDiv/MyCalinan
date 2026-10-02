"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ============================================================
   InstallButton — the "Install app" button in the navbar (beside Login).

   - Android / Chrome / Edge : one tap opens the browser's install window.
   - iPhone / iPad (Safari)  : iOS has no install window, so the button opens a
                               short "Share → Add to Home Screen" guide instead.
   - Already installed (opened from the home-screen icon): the button is hidden.
   - Any other browser that can't install: the button is hidden.

   Put it at:  components/InstallButton.tsx   (replaces the old one)
   It is placed by components/Navbar.tsx — remove any other <InstallButton />
   you had on a page, or it will show twice.
   ============================================================ */

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/* The browser announces "this app can be installed" only ONCE per page load.
   It is kept here (outside React) so the button still works after the visitor
   moves to another page and the navbar is drawn again. */
let savedPrompt: InstallEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of the browser's small bar
    savedPrompt = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    savedPrompt = null;
    installedNow = true;
    emit();
  });
}

const subscribePrompt = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getPrompt = () => savedPrompt;
const getInstalledNow = () => installedNow;
const getFalse = () => false;

/* Is the site open as an installed app (from the home-screen icon)? */
function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia?.("(display-mode: standalone)");
  mq?.addEventListener?.("change", cb);
  return () => mq?.removeEventListener?.("change", cb);
}
const getStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches === true ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

function isIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) // iPad that says "Mac"
  );
}

/* Facebook / Messenger / Instagram browsers can't add to the home screen */
const isInAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Messenger/i.test(navigator.userAgent);

const noopSubscribe = () => () => {};

export default function InstallButton() {
  const prompt = useSyncExternalStore(subscribePrompt, getPrompt, () => null);
  const installed = useSyncExternalStore(subscribePrompt, getInstalledNow, getFalse);
  const standalone = useSyncExternalStore(subscribeStandalone, getStandalone, getFalse);
  const ios = useSyncExternalStore(noopSubscribe, isIos, getFalse);
  const inApp = useSyncExternalStore(noopSubscribe, isInAppBrowser, getFalse);

  const [guideOpen, setGuideOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // close the iPhone guide when tapping anywhere else
  useEffect(() => {
    if (!guideOpen) return;
    const onDown = (e: Event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setGuideOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [guideOpen]);

  if (standalone || installed) return null; // already installed
  if (!prompt && !ios) return null; // this browser can't install

  async function handleClick() {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      savedPrompt = null; // the browser only allows one try per event
      emit();
      return;
    }
    setGuideOpen((v) => !v);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install the MyCalinan app"
        aria-expanded={prompt ? undefined : guideOpen}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/50 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 sm:px-4 sm:text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
        </svg>
        {/* tiny phones show just the icon; bigger screens show the words */}
        <span className="hidden min-[400px]:inline sm:hidden">Install</span>
        <span className="hidden sm:inline">Install app</span>
      </button>

      {guideOpen && (
        <div
          role="dialog"
          aria-label="How to install MyCalinan"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-[var(--radius-stall)] border border-canopy-100 bg-white p-4 text-left text-sm text-ink-900 shadow-lg"
        >
          <p className="font-semibold text-canopy-800">Install MyCalinan</p>
          {inApp ? (
            <p className="mt-2 leading-snug text-ink-500">
              This browser can&rsquo;t install apps. Open this page in <b>Safari</b>, then follow the
              steps.
            </p>
          ) : null}
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-snug text-ink-500">
            <li>
              Tap the <b className="text-ink-900">Share</b> button{" "}
              <span aria-hidden="true">⬆️</span> in Safari.
            </li>
            <li>
              Choose <b className="text-ink-900">Add to Home Screen</b>.
            </li>
            <li>
              Tap <b className="text-ink-900">Add</b>.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => setGuideOpen(false)}
            className="mt-3 w-full rounded-full bg-canopy-700 py-1.5 text-xs font-semibold text-white hover:bg-canopy-800"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}