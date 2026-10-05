/* ============================================================
   FILE: app/api/version/route.ts 
   URL:  /api/version

   Tells the app which version is live right now. The phone compares it with
   the version it was built with (see components/UpdateNotifier.tsx).

   - Never cached (no-store), so a phone always hears the truth.
   - The service worker never saves /api/ answers either (sw.js: NEVER_CACHE).
   - To make an update REQUIRED (a breaking change), set the Vercel
     environment variable  MYCALINAN_FORCE_UPDATE = 1  and redeploy. Take it
     away again for the next normal release.
   ============================================================ */

export const dynamic = "force-dynamic";

export function GET(): Response {
  const body = {
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    force: process.env.MYCALINAN_FORCE_UPDATE === "1",
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}