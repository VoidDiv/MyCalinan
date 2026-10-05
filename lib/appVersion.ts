/* ============================================================
   FILE: lib/appVersion.ts
   Small, pure helpers for the "Update your MyCalinan app" check.
   (No browser, no React: easy to test.)

   HOW THE UPDATE CHECK WORKS
   - Every time you deploy, next.config.ts stamps the build with a version
     (the Git commit on Vercel). The phone's app has the version of the build
     it loaded; the server's /api/version answers with the version that is
     live now.
   - Same version  -> nothing happens (no banner, no reload, no flash).
   - Different     -> a banner says "Update your MyCalinan app".
   ============================================================ */

/** The version this copy of the app was BUILT with ("dev" while you run it on your computer). */
export const CURRENT_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

/** What /api/version answers. */
export interface VersionInfo {
  version: string;
  /** true = this release must be installed (a breaking change): the banner cannot be dismissed. */
  force: boolean;
}

/** Reads and cleans the answer of /api/version. Returns null if it is not a valid answer. */
export function parseVersionInfo(data: unknown): VersionInfo | null {
  if (!data || typeof data !== "object") return null;
  const v = (data as { version?: unknown }).version;
  if (typeof v !== "string" || v.trim() === "" || v.length > 80) return null;
  return { version: v.trim(), force: (data as { force?: unknown }).force === true };
}

/** Is the app on this phone older than the server? ("dev" builds never ask for an update.) */
export function isOutdated(current: string, latest: string | null | undefined): boolean {
  if (!latest || current === "dev" || latest === "dev") return false;
  return current !== latest;
}

/** Pages where a full-screen "update required" window must NOT block the work (the admin may be in the middle of a form). */
export function isForceExempt(pathname: string): boolean {
  return /^\/adminpage(\/|$)/i.test(pathname) || /^\/admin(\/|$)/i.test(pathname);
}

/** Should we ask the server again now? (Not more often than every `minGapMs`.) */
export function shouldCheckNow(lastCheckAt: number, now: number, minGapMs: number): boolean {
  return lastCheckAt === 0 || now - lastCheckAt >= minGapMs;
}

/** The error a phone gets when it runs OLD code against a NEW deployment (a file that no longer exists). */
export function looksLikeStaleDeployError(message: string | undefined | null, name?: string | null): boolean {
  const m = `${name ?? ""} ${message ?? ""}`;
  return /ChunkLoadError|Loading chunk \S+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to find Server Action/i.test(m);
}