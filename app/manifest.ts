/* ============================================================
   PWA MANIFEST  →  served at /manifest.webmanifest
   Put this file at:  app/manifest.ts   (replace the existing one)

   Needs these files in /public:
     icons/icon-192.png
     icons/icon-512.png
     icons/maskable-512.png

   background_color is the colour Android shows behind the icon while the
   app is starting. It matches the new logo's own background (#fdfdfc), so
   the logo sits on it with no visible square.
   theme_color is the colour of the phone's top bar — same green as the navbar.

   Optional later: add screenshots (1280x720 "wide" and 540x960 "narrow") in
   /public/screenshots and a  screenshots: [...]  list for Android's richer
   install window.
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
    background_color: "#fdfdfc",
    theme_color: "#1f4d33",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}