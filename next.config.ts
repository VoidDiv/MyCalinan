/* ============================================================
   FILE: next.config.ts   (REPLACE whole file — project root)

   Your original settings are kept (images, devIndicators, the sw.js header).
   ADDED: browser security headers on every page and API answer.

   SECURITY BENEFITS
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

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
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