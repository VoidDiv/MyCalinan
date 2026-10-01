/* ============================================================
   PWA MANIFEST  →  served at /manifest.webmanifest
   Put this file at:  app/manifest.ts   (replace the existing one)

   Needs these files in /public:
     icons/icon-192.png        (run scripts/generate-pwa-icons.mjs)
     icons/icon-512.png
     icons/maskable-512.png
     screenshots/wide.png      (1280x720)  ← desktop install UI
     screenshots/narrow.png    (540x960)   ← mobile install UI
   ============================================================ */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MyCalinan",
    short_name: "MyCalinan",
    description: "Discover Calinan. Explore. Stay Informed.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f7f4",
    theme_color: "#2f6b2f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src: "/screenshots/wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "MyCalinan on desktop",
      },
      {
        src: "/screenshots/narrow.png",
        sizes: "540x960",
        type: "image/png",
        form_factor: "narrow",
        label: "MyCalinan on mobile",
      },
    ],
  };
}