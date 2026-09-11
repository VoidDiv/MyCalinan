const GUEST_ID_KEY = "mycalinan_guest_id";

/**
 * Returns the permanent guest identifier for this browser.
 * Generates and stores one (via crypto.randomUUID) the first time
 * "Continue as Guest" is used, then reuses the same id on every
 * later visit — this is what links guest submissions (like business
 * registrations) back to the actual person who submitted them.
 */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateGuestId() can only run in the browser.");
  }

  const existing = localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : fallbackUUID();

  localStorage.setItem(GUEST_ID_KEY, newId);
  return newId;
}

/** Reads the guest id without creating one. Returns null if none exists yet. */
export function getGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_ID_KEY);
}

/** Fallback UUID v4 generator for older browsers without crypto.randomUUID(). */
function fallbackUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}