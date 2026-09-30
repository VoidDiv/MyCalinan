import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyCalinan",
    short_name: "MyCalinan",
    description:
      "Tourism, services, and community information for Calinan Poblacion, Davao City.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf6ee",
    theme_color: "#1f4d33",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}