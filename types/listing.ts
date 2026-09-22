/* ============================================================
   FILE: types/listing.ts   (REPLACE whole file)
   ============================================================ */

export type ExplorePage =
  | "food"
  | "shopping"
  | "healthcare"
  | "transport"
  | "lifestyle"
  | "finance"
  | "education"
  | "hotspots"
  | "community";

/* Which filter chips (categories) each Explore page supports.
   These MUST match the category values used by the Explore pages.
   NOTE: Healthcare, Lifestyle, Shopping, Hotspots and Transport add a
   filter chip automatically for any category that has a listing (e.g.
   Pharmacy, Salon & Barbershop, Agri & Farm Supply). If you add a
   category to any OTHER page, make sure that page does the same or has
   a matching chip. */
export const EXPLORE_PAGES: Record<
  ExplorePage,
  { label: string; pin: string; categories: string[] }
> = {
  food: {
    label: "Food & Dining",
    pin: "🍽️",
    categories: ["Restaurant", "Eatery", "Fast-Food", "Cafe", "Bakeshop", "Bar"],
  },
  shopping: {
    label: "Shopping & Store",
    pin: "🛍️",
    categories: [
      "Mall & Grocery",
      "General Merchandise",
      "Hardware & Construction",
      "Motor Parts",
      "Convenience Store",
      "Electronics & Repair",
      "Printing & Photo",
      "Agri & Farm Supply", // NEW
    ],
  },
  healthcare: {
    label: "Healthcare",
    pin: "🏥",
    categories: [
      "Hospital",
      "Clinic",
      "Dental",
      "Optical",
      "Maternity",
      "Veterinary",
      "Pharmacy", // NEW
    ],
  },
  transport: {
    label: "Transport & Utilities",
    pin: "🚐",
    categories: ["Gas Station", "Transport Terminal"],
  },
  lifestyle: {
    label: "Lifestyle",
    pin: "🏋️",
    categories: [
      "Gym",
      "Hotel",
      "Salon & Barbershop", // NEW
    ],
  },
  finance: { label: "Finance", pin: "🏦", categories: ["Bank", "Remittance"] },
  education: {
    label: "Education",
    pin: "🎓",
    categories: ["Elementary", "High School", "College", "Public", "Private"],
  },
  hotspots: {
    label: "Hotspots",
    pin: "📍",
    categories: [
      "Nature Spot",
      "Wildlife & Conservation",
      "Eco Tourism",
      "Cultural Attraction",
      "Spiritual Retreat",
      "Resort / Leisure",
      "Local Market",
      "Community Park",
      "Commercial Hub",
    ],
  },
  community: {
    label: "Community",
    pin: "⛪",
    categories: ["Church", "Cemetery", "Barangay Hall", "District Hall"],
  },
};

/* The Firestore collection each Explore page uses (matches your console). */
export const PAGE_COLLECTION: Record<ExplorePage, string> = {
  food: "food",
  shopping: "shopping",
  healthcare: "healthcare",
  transport: "transport",
  lifestyle: "lifestyle",
  finance: "finance",
  education: "education",
  hotspots: "hotspots",
  community: "community",
};

/* ── Map pins ─────────────────────────────────────────────
   Every page has a default pin, but some categories deserve
   their own (a hotel or salon shouldn't get a dumbbell). */
export const CATEGORY_PINS: Record<string, string> = {
  Hotel: "🏨",
  "Salon & Barbershop": "💇",
  Pharmacy: "💊",
  "Agri & Farm Supply": "🌾",
  "Gas Station": "⛽",
};

export function pinFor(page: ExplorePage, category: string): string {
  return CATEGORY_PINS[category] ?? EXPLORE_PAGES[page].pin;
}

/* ── What business owners can register as ─────────────────
   This is the ONLY list the registration form uses, so an
   applicant can only pick something that has a real home on
   Explore. Only actual businesses belong here — Education
   (multi-tag schools), Community (churches, halls, cemeteries)
   and most Hotspots (parks, nature spots) are not registered
   through this form.
   To open up or close off a type, add/remove it below. It must
   also exist in EXPLORE_PAGES above. */
export const REGISTRABLE_CATEGORIES: Partial<Record<ExplorePage, string[]>> = {
  food: EXPLORE_PAGES.food.categories,
  shopping: EXPLORE_PAGES.shopping.categories,
  healthcare: EXPLORE_PAGES.healthcare.categories,
  transport: EXPLORE_PAGES.transport.categories,
  lifestyle: EXPLORE_PAGES.lifestyle.categories,
  finance: EXPLORE_PAGES.finance.categories,
  hotspots: ["Resort / Leisure"],
};

/* Grouped for the <optgroup> dropdown in the registration form. */
export const REGISTRATION_GROUPS: {
  page: ExplorePage;
  label: string;
  categories: string[];
}[] = (Object.keys(REGISTRABLE_CATEGORIES) as ExplorePage[]).map((page) => ({
  page,
  label: EXPLORE_PAGES[page].label,
  categories: REGISTRABLE_CATEGORIES[page] ?? [],
}));

/* The dropdown value is "page::category" so one <select> carries both. */
export function encodeChoice(page: ExplorePage, category: string): string {
  return `${page}::${category}`;
}

export function decodeChoice(
  value: string
): { page: ExplorePage; category: string } | null {
  const [page, category] = value.split("::");
  const allowed = REGISTRABLE_CATEGORIES[page as ExplorePage];
  if (!allowed || !category || !allowed.includes(category)) return null;
  return { page: page as ExplorePage, category };
}

/* Every doc the Explore pages show carries a `source` marker, so the
   pages never pick up unrelated documents that may share a collection.
   - "business-registration": published from a business application
   - "admin": added or imported by an admin in Admin > Listings > Explore */
export const LISTING_SOURCE = "business-registration";
export const ADMIN_SOURCE = "admin";
export const EXPLORE_SOURCES: string[] = [LISTING_SOURCE, ADMIN_SOURCE];

export interface PublicListing {
  id: string;
  name: string;
  page: ExplorePage;
  category: string;
  tags?: string[]; // used by Education (a school can be "Private" + "High School")
  tag: string;
  pin: string;
  description: string;
  address: string;
  image: string;
  lat: number;
  lng: number;
  mapsQuery: string; // raw text, encoded by the reader
  published: boolean;
}

export type ListingData = Omit<PublicListing, "id">;

/* What actually gets written into food / shopping / healthcare / ...
   Alias fields let one doc fit every Explore page's naming.
   businessId is only set for listings that came from a business application. */
export function toExploreDoc(
  d: ListingData,
  businessId?: string,
  source: string = businessId ? LISTING_SOURCE : ADMIN_SOURCE
) {
  return {
    ...d,
    imageSrc: d.image,
    location: d.address,
    displayTag: d.tag,
    tags: d.tags && d.tags.length > 0 ? d.tags : [d.category],
    ...(businessId ? { businessId } : {}),
    source,
  };
}