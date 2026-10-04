/* ============================================================
   FILE: next.config.ts   (REPLACE whole file — project root)

   Your settings are kept (images, devIndicators, security headers, the sw.js header).
   ADDED: every build gets a VERSION (NEXT_PUBLIC_APP_VERSION). On Vercel it is the
   first 7 characters of the Git commit, so each `git push` = a new version.
   The "Update your MyCalinan app" banner (components/UpdateNotifier.tsx) compares
   the phone's version with the live one (/api/version).

   SECURITY BENEFITS (unchanged)
   - X-Content-Type-Options: nosniff   → the browser must trust the declared file type
   - X-Frame-Options: DENY             → no other website can put MyCalinan in a hidden
                                          frame (clickjacking)
   - Referrer-Policy                   → other sites only learn our domain, not the full page address
   - Permissions-Policy                → location is allowed only for our own pages; camera,
                                          microphone and payment are switched off
   - Strict-Transport-Security         → browsers insist on HTTPS for 2 years

   Not added on purpose: Content-Security-Policy. Your site uses Mapbox, Firebase, Font
   Awesome and Google Fonts, so a CSP needs careful testing. Do it later as an upgrade.
   ============================================================ */

import type { NextConfig } from "next";

/* The version of THIS build:
   - Vercel (git push)      -> the commit, e.g. "3f9a1c2"
   - Vercel (other deploys) -> the deployment id
   - your computer          -> "dev" while you run `npm run dev` (the banner stays off),
                               a time stamp for `npm run build` + `npm start` (to test it) */
function buildVersion(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  if (process.env.VERCEL_DEPLOYMENT_ID) return process.env.VERCEL_DEPLOYMENT_ID.slice(-12);
  if (process.env.NODE_ENV === "development") return "dev";
  return `local-${Date.now().toString(36)}`;
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // Put into the app code when it is built (client AND server), so both sides know their version.
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion(),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;