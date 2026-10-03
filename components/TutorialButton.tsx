/* ============================================================
   FILE: components/TutorialButton.tsx   (NEW)
   A small link-style button that opens the tour again.
   It is used in the footer. (WelcomeTutorial must be on the same page.)
   ============================================================ */

"use client";

import { openTutorial } from "@/lib/tutorial";

export default function TutorialButton({ className = "underline" }: { className?: string }) {
  return (
    <button type="button" onClick={openTutorial} className={className}>
      How to use MyCalinan
    </button>
  );
}