/* ============================================================
   FILE: data/exploreSeedAdditions.ts   (NEW FILE)
   Built-in listings added AFTER the first import of data/exploreSeed.ts.

   Admin > Listings > Explore Listings shows a "New built-in listings"
   banner for these, even on pages that were already imported. Press
   "Import" to add them, or "Skip" if you don't want them.
   Add future built-in listings HERE (not in exploreSeed.ts).

   Photos: Firebase Storage > Community folder. File names must match
   EXACTLY, including capital letters and spaces:
     "Calinan Fire station.png"     (lowercase "s" in "station")
     "Calinan Police Station.png"
   ============================================================ */

import type { ExplorePage } from "@/types/listing";
import type { SeedListing } from "@/data/exploreSeed";

const STORAGE_BASE = "https://storage.googleapis.com/mycalinan.firebasestorage.app";

/** Same shape as the entry() builders in exploreSeed.ts. */
function entry(
  page: ExplorePage,
  folder: string,
  e: Omit<SeedListing, "page" | "image" | "tags" | "published"> & { file: string; tags?: string[] }
): SeedListing {
  const { file, tags, ...rest } = e;
  return {
    ...rest,
    page,
    tags: tags ?? [e.category],
    image: `${STORAGE_BASE}/${folder}/${encodeURIComponent(file)}`,
    published: true,
  };
}

const COMMUNITY_ADDITIONS: SeedListing[] = [
  entry("community", "Community", {
    id: "calinan-fire-station",
    name: "Calinan Fire Station",
    category: "Public Safety",
    tag: "Fire Station",
    pin: "🚒",
    description:
      "H. Quiambao St., Calinan Poblacion — Bureau of Fire Protection (BFP) station under the Davao City Fire District, and the only fire station serving the Calinan, Baguio and Marilog districts. Responds to fires, rescue calls and emergencies 24 hours a day.",
    address: "H. Quiambao St., Calinan Poblacion, Davao City",
    mapsQuery: "Calinan Fire Station H. Quiambao St Calinan Davao City",
    file: "Calinan Fire station.png",
    lat: 7.1903,
    lng: 125.452,
  }),
  entry("community", "Community", {
    id: "calinan-police-station",
    name: "Calinan Police Station (Police Station 10)",
    category: "Public Safety",
    tag: "Police Station",
    pin: "🚓",
    description:
      "Aurora St., Calinan Poblacion — Davao City Police Office (DCPO) Police Station 10, responsible for peace and order in Calinan District. For concerns, call (082) 295-0119 or 0998-598-7074.",
    address: "Aurora St., Calinan Poblacion, Davao City",
    mapsQuery: "Police Station 10 Calinan Aurora St Davao City",
    file: "Calinan Police Station.png",
    lat: 7.1894,
    lng: 125.4523,
  }),
];

export const EXPLORE_SEED_ADDITIONS: Partial<Record<ExplorePage, SeedListing[]>> = {
  community: COMMUNITY_ADDITIONS,
};

/** Built-ins that are open 24/7: imported with "Open 24 hours" already set. */
export const ALWAYS_OPEN_SEED_IDS = new Set(["calinan-fire-station", "calinan-police-station"]);