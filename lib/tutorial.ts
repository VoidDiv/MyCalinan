/* ============================================================
   FILE: lib/tutorial.ts   (REPLACE whole file)
   The words and the order of the interactive tour, plus remembering that a visitor
   already saw it. Change the text here, nowhere else.

   Two kinds of steps:
   - "card": a normal pop-up (welcome and finish)
   - "spot": the page goes dark and ONE real button glows, with a speech bubble.
             Some spots are "try it" steps: the visitor taps the glowing button and the
             tour moves on by itself. The Next button is always there as well.
   ============================================================ */

export const TUTORIAL_KEY = "mycalinan_tutorial_v1"; // change v1 → v2 to show it again to everyone
export const OPEN_TUTORIAL_EVENT = "mycalinan:open-tutorial";

export type TargetId =
  | "menu"
  | "explore"
  | "map"
  | "documents"
  | "language"
  | "calibot"
  | "chat"
  | "install"
  | "account";

export type Device = "both" | "phone" | "desktop";

export interface CardStep {
  kind: "card";
  id: "welcome" | "finish";
  icon: string;
  title: string;
  intro: string;
  points: string[];
  primary: string;
  secondary?: string;
}

export interface SpotStep {
  kind: "spot";
  id: TargetId;
  /** Which screens this step is for (the phone menu is different from the desktop menu). */
  device: Device;
  title: string;
  text: { phone: string; desktop: string };
  /** Small line under the text for "try it" steps. */
  hint?: string;
  /** Tapping the glowing button moves the tour on by itself. */
  advanceOnClick?: boolean;
  /** On a phone this step needs the ☰ menu to be open. */
  needsMenu?: boolean;
  /** This step needs the Calibot chat window to be open. */
  needsChat?: boolean;
}

export type TourStep = CardStep | SpotStep;

const same = (text: string) => ({ phone: text, desktop: text });

export const TOUR_STEPS: TourStep[] = [
  {
    kind: "card",
    id: "welcome",
    icon: "👋",
    title: "Welcome to MyCalinan",
    intro: "Let's take a quick hands-on tour of the real buttons.",
    points: ["Learn where everything is", "Try the glowing buttons as we go", "It takes about one minute"],
    primary: "Start tour",
    secondary: "Skip tour",
  },
  {
    kind: "spot",
    id: "menu",
    device: "both",
    title: "The menu",
    text: {
      phone: "Tap ☰ to open the menu. Explore, Documents, the Map, Hotlines and more are inside.",
      desktop:
        "Explore lives here. Click it to browse Health, Education, Food & Dining, Shopping, Finance, Transport, Hotspots and more.",
    },
    hint: "👆 Try it: tap the glowing button",
    advanceOnClick: true,
  },
  {
    kind: "spot",
    id: "explore",
    device: "phone",
    title: "Explore places",
    text: same(
      "Tap Explore to open the list: Health, Education, Food & Dining, Shopping, Finance, Transport, Hotspots and more."
    ),
    hint: "👆 Try it: tap Explore",
    advanceOnClick: true,
    needsMenu: true,
  },
  {
    kind: "spot",
    id: "map",
    device: "both",
    title: "Barangay Map",
    text: same(
      "One big live map of Calinan. Use the red, blue and orange Emergency buttons to find the nearest hospital, police or fire station."
    ),
    needsMenu: true,
  },
  {
    kind: "spot",
    id: "documents",
    device: "both",
    title: "Documents, hotlines and news",
    text: same(
      "Documents has step-by-step guides for Police Clearance, Barangay Clearance, Cedula and Postal ID. Hotlines, History, Announcements and Events are in this menu too."
    ),
    needsMenu: true,
  },
  {
    kind: "spot",
    id: "language",
    device: "both",
    title: "Language",
    text: same("Switch between ENG and CEB (Cebuano) here. The whole site translates."),
    needsMenu: true,
  },
  {
    kind: "spot",
    id: "calibot",
    device: "both",
    title: "Meet Calibot",
    text: same("Calibot is our assistant. It answers questions about places, officials, rules and the weather."),
    hint: "👆 Try it: tap Calibot to open the chat",
    advanceOnClick: true,
  },
  {
    kind: "spot",
    id: "chat",
    device: "both",
    title: "Ask anything",
    text: same(
      "Type a question here. Try “Will it rain today?” or “Where is the nearest hospital?”. The speaker button turns Calibot's voice on or off."
    ),
    needsChat: true,
  },
  {
    kind: "spot",
    id: "install",
    device: "both",
    title: "Install the app",
    text: same(
      "Tap Install app to add MyCalinan to your phone like a real app. Pages you open are saved, so many still work offline."
    ),
  },
  {
    kind: "spot",
    id: "account",
    device: "both",
    title: "Your account",
    text: same(
      "Log in here, or continue as a Guest from the login page. Business owners can sign up to register a business so it appears on Explore."
    ),
  },
  {
    kind: "card",
    id: "finish",
    icon: "🎉",
    title: "You're all set!",
    intro: "That's everything you need to get started.",
    points: [
      "Ask Calibot if you ever get stuck",
      "No account is needed to browse",
      "Replay this tour anytime from “How to use MyCalinan” at the bottom of the home page",
    ],
    primary: "Start exploring",
  },
];

/** The steps for this screen (phone steps and desktop steps are different). */
export function stepsFor(phone: boolean): TourStep[] {
  return TOUR_STEPS.filter((s) => s.kind === "card" || s.device === "both" || s.device === (phone ? "phone" : "desktop"));
}

/* ---------- remembering that it was seen (never crashes if storage is blocked) ---------- */

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "done";
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "done");
  } catch {
    /* private mode: it may show again next time, that is fine */
  }
}

/** Admins use the site every day — don't show them the visitor tour. */
export function isAdminSession(): boolean {
  try {
    return (localStorage.getItem("mycalinan_role") || sessionStorage.getItem("mycalinan_role")) === "admin";
  } catch {
    return false;
  }
}

/** Opens the tour from any button (WelcomeTutorial listens for this). */
export function openTutorial(): void {
  window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT));
}