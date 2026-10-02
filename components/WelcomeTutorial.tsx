/* ============================================================
   FILE: components/WelcomeTutorial.tsx   (REPLACE whole file)
   The interactive "How to use MyCalinan" tour.

   - A welcome pop-up, then the page goes dark and ONE real button glows at a time
     (menu, Explore, Barangay Map, Documents, Language, Calibot, Install, Login),
     with a speech bubble that explains it.
   - "Try it" steps: tap the glowing button (for example ☰ or Calibot) and the tour
     moves on by itself. The Next button is always there too, so nobody gets stuck.
   - On a phone the tour opens the ☰ menu and the Calibot chat for you, and closes
     them again afterwards.
   - A step whose button is not on screen (for example "Install" when the app is already
     installed) is skipped automatically.
   - Shows ONCE for a new visitor; Skip / Esc / the last button all count as "seen".
     Replay it from the footer link "How to use MyCalinan".
   - Keyboard: ← → move, Esc closes, Tab stays inside the bubble.
   - The text is normal page text, so the ENG / CEB switch translates it too.
   - Styles: globals-tutorial.css (classes "tut-*").
   ============================================================ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  OPEN_TUTORIAL_EVENT,
  hasSeenTutorial,
  isAdminSession,
  markTutorialSeen,
  stepsFor,
  type SpotStep,
  type TourStep,
} from "@/lib/tutorial";
import {
  TARGET_FINDERS,
  isPhone,
  maskBoxes,
  placeTooltip,
  setChatOpen,
  setMenuOpen,
  waitFor,
  type Box,
  type Size,
} from "@/lib/tutorialTargets";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const RING_PADDING = 6;
const FIELD_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

const sameBox = (a: Box | null, b: Box) =>
  !!a && Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y) && Math.round(a.w) === Math.round(b.w) && Math.round(a.h) === Math.round(b.h);

export default function WelcomeTutorial({ delayMs = 1200 }: { delayMs?: number }) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [idx, setIdx] = useState(0);
  const [phone, setPhone] = useState(false);

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Box | null>(null);
  const [tipSize, setTipSize] = useState<Size>({ w: 320, h: 210 });
  const [viewport, setViewport] = useState<Size>({ w: 0, h: 0 });

  const direction = useRef<1 | -1>(1); // which way the visitor is going (used when a step is skipped)
  const rootRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const step: TourStep | undefined = steps[idx];
  const last = steps.length - 1;

  /* ───────── start / stop ───────── */

  const start = useCallback(() => {
    const onPhone = isPhone();
    setPhone(onPhone);
    setSteps(stepsFor(onPhone));
    setIdx(0);
    direction.current = 1;
    setTarget(null);
    setRect(null);
    setOpen(true);
  }, []);

  const end = useCallback(() => {
    setMenuOpen(false);
    setChatOpen(false);
    markTutorialSeen();
    setOpen(false);
    setTarget(null);
    setRect(null);
  }, []);

  const goNext = useCallback(() => {
    direction.current = 1;
    setIdx((i) => Math.min(i + 1, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

  const goBack = useCallback(() => {
    direction.current = -1;
    setIdx((i) => Math.max(i - 1, 0));
  }, []);

  /* ───────── 1) a new visitor: open by themselves (after the app splash, if any) ───────── */
  useEffect(() => {
    if (hasSeenTutorial() || isAdminSession()) return;

    let timer: ReturnType<typeof setTimeout>;
    let waited = 0;
    const tryOpen = () => {
      if (document.documentElement.classList.contains("mc-splash-on") && waited < 6000) {
        waited += 300;
        timer = setTimeout(tryOpen, 300);
        return;
      }
      start();
    };
    timer = setTimeout(tryOpen, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, start]);

  /* ───────── 2) replay from the footer button ───────── */
  useEffect(() => {
    window.addEventListener(OPEN_TUTORIAL_EVENT, start);
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, start);
  }, [start]);

  /* ───────── 3) while open: lock page scroll, remember + restore focus ───────── */
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      lastFocused.current?.focus?.();
    };
  }, [open]);

  /* ───────── 4) each step: open what it needs, find its real button ───────── */
  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    setTarget(null);
    setRect(null);

    if (step.kind === "card") {
      setMenuOpen(false);
      setChatOpen(false);
      return;
    }

    setMenuOpen(!!step.needsMenu);
    setChatOpen(!!step.needsChat);

    // steps that open the menu / chat get a little longer to appear; a button that is simply
    // not on this screen (e.g. Install) is skipped quickly
    const patience = step.needsMenu || step.needsChat ? 1100 : 350;
    waitFor(() => TARGET_FINDERS[step.id](), patience).then((el) => {
      if (cancelled) return;
      if (el) {
        setTarget(el);
      } else {
        // that button is not on this screen → skip the step (in the direction the visitor was going)
        setIdx((i) => Math.min(Math.max(i + direction.current, 0), last));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, step, last]);

  /* ───────── 5) keep the glow + bubble stuck to the button (it may move or re-draw) ───────── */
  useEffect(() => {
    if (!open || !target || !step || step.kind !== "spot") return;
    let current = target;

    const measure = () => {
      if (!current.isConnected) {
        const again = TARGET_FINDERS[(step as SpotStep).id]();
        if (again) {
          current = again;
          setTarget(again);
        }
        return;
      }
      const r = current.getBoundingClientRect();
      const box = { x: r.left, y: r.top, w: r.width, h: r.height };
      setRect((prev) => (sameBox(prev, box) ? prev : box));

      const t = tipRef.current?.getBoundingClientRect();
      if (t && t.width > 0) {
        setTipSize((prev) => (Math.round(prev.w) === Math.round(t.width) && Math.round(prev.h) === Math.round(t.height) ? prev : { w: t.width, h: t.height }));
      }
      setViewport((prev) => (prev.w === window.innerWidth && prev.h === window.innerHeight ? prev : { w: window.innerWidth, h: window.innerHeight }));
    };

    measure();
    const timer = setInterval(measure, 100);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, target, step]);

  /* ───────── 6) "try it": tapping the glowing button moves the tour on ───────── */
  useEffect(() => {
    if (!open || !target || !step || step.kind !== "spot" || !step.advanceOnClick) return;
    let timer: ReturnType<typeof setTimeout>;
    const onTap = () => {
      clearTimeout(timer);
      timer = setTimeout(goNext, 350); // let the menu / chat finish opening first
    };
    target.addEventListener("click", onTap, true);
    return () => {
      target.removeEventListener("click", onTap, true);
      clearTimeout(timer);
    };
  }, [open, target, step, goNext]);

  /* ───────── 7) focus the main button on every step ───────── */
  useEffect(() => {
    if (open) nextRef.current?.focus();
  }, [open, idx, target]);

  /* ───────── 8) keyboard ───────── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return end();

      const typing = FIELD_TAGS.includes((document.activeElement as HTMLElement | null)?.tagName ?? "");
      if (e.key === "ArrowRight" && !typing) return goNext();
      if (e.key === "ArrowLeft" && !typing) return goBack();

      if (e.key === "Tab" && rootRef.current) {
        const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.closest(".tut-tip, .tut-card"));
        if (items.length === 0) return;
        const first = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && active === lastItem) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, end, goNext, goBack]);

  /* the tour was removed while open → leave the page tidy */
  useEffect(
    () => () => {
      setMenuOpen(false);
      setChatOpen(false);
    },
    []
  );

  if (!open || !step) return null;

  /* ───────────────────────── a pop-up card (welcome / finish) ───────────────────────── */
  if (step.kind === "card") {
    return (
      <div ref={rootRef} className="tut-overlay">
        <div className="tut-card" role="dialog" aria-modal="true" aria-labelledby="tut-title">
          <div className="tut-icon" aria-hidden="true">
            {step.icon}
          </div>
          <h2 id="tut-title" className="tut-title">
            {step.title}
          </h2>
          <p className="tut-intro">{step.intro}</p>

          <ul className="tut-points">
            {step.points.map((point) => (
              <li key={point}>
                <span className="tut-check" aria-hidden="true">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="tut-actions">
            {step.secondary ? (
              <button type="button" className="tut-back" onClick={end}>
                {step.secondary}
              </button>
            ) : (
              <button type="button" className="tut-back" onClick={goBack}>
                ← Back
              </button>
            )}
            <button ref={nextRef} type="button" className="tut-next" onClick={step.id === "finish" ? end : goNext}>
              {step.primary} {step.id === "finish" ? "" : "→"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── a spotlight step ───────────────────────── */
  const vp = viewport.w ? viewport : { w: typeof window === "undefined" ? 0 : window.innerWidth, h: typeof window === "undefined" ? 0 : window.innerHeight };

  // while the button is being found (the menu may still be opening) just dim the page
  if (!target || !rect) {
    return <div ref={rootRef} className="tut-root"><div className="tut-mask tut-mask-full" /></div>;
  }

  const hole: Box = { x: rect.x - RING_PADDING, y: rect.y - RING_PADDING, w: rect.w + RING_PADDING * 2, h: rect.h + RING_PADDING * 2 };
  const masks = maskBoxes(hole, vp);
  const tip = placeTooltip(hole, tipSize, vp);
  const text = phone ? step.text.phone : step.text.desktop;
  const spotNumber = steps.slice(0, idx + 1).filter((s) => s.kind === "spot").length;
  const spotTotal = steps.filter((s) => s.kind === "spot").length;

  return (
    <div ref={rootRef} className="tut-root">
      {masks.map((m, i) => (
        <div key={i} className="tut-mask" style={{ left: m.x, top: m.y, width: m.w, height: m.h }} />
      ))}

      <div className="tut-ring" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} aria-hidden="true" />

      <div
        ref={tipRef}
        className="tut-tip"
        role="dialog"
        aria-modal="false"
        aria-labelledby="tut-tip-title"
        style={{ left: tip.left, top: tip.top }}
      >
        <span
          className={`tut-tip-arrow ${tip.side === "below" ? "is-top" : "is-bottom"}`}
          style={{ left: tip.arrowLeft }}
          aria-hidden="true"
        />

        <div className="tut-top">
          <span className="tut-count">
            Step {spotNumber} of {spotTotal}
          </span>
          <button type="button" className="tut-skip" onClick={end}>
            Skip tour
          </button>
        </div>

        <h2 id="tut-tip-title" className="tut-tip-title">
          {step.title}
        </h2>
        <p className="tut-tip-text">{text}</p>
        {step.advanceOnClick && step.hint && <p className="tut-hint">{step.hint}</p>}

        <div className="tut-actions">
          <button type="button" className="tut-back" onClick={goBack}>
            ← Back
          </button>
          <button ref={nextRef} type="button" className="tut-next" onClick={goNext}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}