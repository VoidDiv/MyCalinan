/* ============================================================
   FILE: lib/tutorialTargets.ts   (NEW)
   How the tour FINDS the real buttons on the page, plus the small maths for the
   dark overlay and the speech bubble.

   Important: the buttons are found by their SHAPE (ids, positions, icons), never by
   their words, so the tour keeps working when the ENG / CEB switch has translated the page.
   Only buttons that are really visible on screen are used, so the phone menu and the
   desktop menu are never mixed up.
   ============================================================ */

import type { TargetId } from "./tutorial";

/* ───────────── looking at the page ───────────── */

export const isPhone = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(max-width: 767px)").matches;

export function isVisible(el: Element | null | undefined): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

const all = (selector: string): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(selector));
const visible = (els: HTMLElement[]): HTMLElement[] => els.filter(isVisible);

/* ───────────── the phone menu (☰) and the Calibot chat ───────────── */

const menuToggle = (): HTMLButtonElement | null => document.querySelector('button[aria-controls="mobile-menu"]');
const chatLauncher = (): HTMLButtonElement | null => document.querySelector("div.fixed.bottom-6.right-6 > button");

export const menuIsOpen = (): boolean => menuToggle()?.getAttribute("aria-expanded") === "true";
export const chatIsOpen = (): boolean => !!chatLauncher()?.parentElement?.querySelector("form");

/** Opens/closes the ☰ menu (phones only — on a computer the menu is always visible). */
export function setMenuOpen(open: boolean): void {
  if (!isPhone()) return;
  const toggle = menuToggle();
  if (toggle && menuIsOpen() !== open) toggle.click();
}

export function setChatOpen(open: boolean): void {
  const launcher = chatLauncher();
  if (launcher && chatIsOpen() !== open) launcher.click();
}

/** Waits (up to timeoutMs) until fn() returns something. */
export function waitFor<T>(fn: () => T | null, timeoutMs = 1000, everyMs = 50): Promise<T | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const found = fn();
      if (found) return resolve(found);
      if (Date.now() - started >= timeoutMs) return resolve(null);
      setTimeout(tick, everyMs);
    };
    tick();
  });
}

/* ───────────── finding each button ───────────── */

export const TARGET_FINDERS: Record<TargetId, () => HTMLElement | null> = {
  /* phone: the ☰ button · computer: the first menu button ("Explore") */
  menu: () =>
    isPhone()
      ? visible(all('button[aria-controls="mobile-menu"]'))[0] ?? null
      : visible(all("header nav button[aria-expanded]"))[0] ?? null,

  /* inside the open phone menu: the "Explore" group */
  explore: () => visible(all("#mobile-menu button[aria-expanded]"))[0] ?? null,

  /* the second menu button ("Documents"), in whichever menu is on screen */
  documents: () => visible(all("header nav button[aria-expanded]"))[1] ?? null,

  map: () => visible(all('header a[href="/map"]'))[0] ?? null,

  language: () => visible(all('select[id="lang-switch"]'))[0] ?? null,

  calibot: () => visible(all("div.fixed.bottom-6.right-6 > button"))[0] ?? null,

  chat: () => {
    const wrapper = chatLauncher()?.parentElement;
    return visible(Array.from(wrapper?.querySelectorAll<HTMLElement>('form input[type="text"]') ?? []))[0] ?? null;
  },

  /* the download-arrow icon button (only exists when the app can be installed) */
  install: () => {
    const buttons = all("header button svg path")
      .filter((p) => (p.getAttribute("d") ?? "").startsWith("M12 4v11"))
      .map((p) => p.closest("button") as HTMLElement | null);
    return visible(buttons.filter((b): b is HTMLElement => !!b))[0] ?? null;
  },

  /* "Login", or the account/guest button when someone is already signed in */
  account: () => {
    const login = visible(all('header a[href="/login"]'))[0];
    if (login) return login;
    const buttons = visible(all("header div.justify-self-end button")).filter((b) => !b.querySelector("svg path"));
    return buttons[buttons.length - 1] ?? null;
  },
};

/* ───────────── the maths of the overlay and the bubble ───────────── */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Size {
  w: number;
  h: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

/** Four dark rectangles around the glowing button. The hole between them stays clickable. */
export function maskBoxes(hole: Box, vp: Size): Box[] {
  const x = Math.max(0, hole.x);
  const y = Math.max(0, hole.y);
  const right = Math.min(vp.w, hole.x + hole.w);
  const bottom = Math.min(vp.h, hole.y + hole.h);
  return [
    { x: 0, y: 0, w: vp.w, h: y }, // top
    { x: 0, y: bottom, w: vp.w, h: Math.max(0, vp.h - bottom) }, // bottom
    { x: 0, y, w: x, h: Math.max(0, bottom - y) }, // left
    { x: right, y, w: Math.max(0, vp.w - right), h: Math.max(0, bottom - y) }, // right
  ];
}

/** Where to put the speech bubble: below or above the button, always inside the screen. */
export function placeTooltip(
  rect: Box,
  tip: Size,
  vp: Size,
  gap = 16,
  margin = 12
): { left: number; top: number; arrowLeft: number; side: "below" | "above" } {
  const spaceBelow = vp.h - (rect.y + rect.h);
  const spaceAbove = rect.y;
  const side: "below" | "above" = spaceBelow >= tip.h + gap + margin || spaceBelow >= spaceAbove ? "below" : "above";

  const rawTop = side === "below" ? rect.y + rect.h + gap : rect.y - tip.h - gap;
  const top = clamp(rawTop, margin, vp.h - tip.h - margin);

  const centerX = rect.x + rect.w / 2;
  const left = clamp(centerX - tip.w / 2, margin, vp.w - tip.w - margin);
  const arrowLeft = clamp(centerX - left, 24, tip.w - 24);

  return { left, top, arrowLeft, side };
}