"use client";

import { useEffect } from "react";

/* ============================================================
   SplashScreen — the screen you see when you tap the MyCalinan app icon.

   How it works
   - A tiny script in app/layout.tsx runs BEFORE the page paints. If the site was
     opened as an installed app (standalone) and this is a fresh launch, it adds
     the class  mc-splash-on  to <html>.  The picture itself is pure CSS
     (see "APP LAUNCH SPLASH" at the bottom of app/globals.css), so people
     browsing in a normal browser never even download it.
   - This component then fades it away after a moment and remembers, for this
     session, that it was shown (so page reloads don't show it again).
   ============================================================ */

const SHOW_MS = 1700; // how long the picture stays
const FADE_MS = 450; // how long it takes to fade away (matches the CSS)

export default function SplashScreen() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("mc-splash-on")) return;

    try {
      sessionStorage.setItem("mc_splash", "1");
    } catch {
      /* private mode — fine, it just may show again */
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hide = setTimeout(() => html.classList.add("mc-splash-hide"), SHOW_MS);
    const remove = setTimeout(
      () => html.classList.remove("mc-splash-on", "mc-splash-hide"),
      SHOW_MS + (reduceMotion ? 0 : FADE_MS)
    );

    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, []);

  return <div id="mc-splash" aria-hidden="true" />;
}