/* ============================================================
   FILE: lib/cebuanoGlossary.ts   (NEW FILE)
   Hand-checked Cebuano for MyCalinan, used by app/api/translate/route.ts.

   1. CEBUANO_PHRASES — exact UI phrases with a fixed translation.
      Short buttons and labels have no context, so machine translation
      often gets them wrong. These are used INSTEAD of Google: free, instant,
      and always the same. Matching ignores letter case, a leading emoji or
      symbol ("📍 View on Map"), and ending punctuation ("Loading…").
      ➜ Have a native Cebuano speaker review this list and add to it.

   2. KEEP_AS_IS — words that must never be translated (place names,
      agencies, brands, app names). Explore listing names are protected
      automatically by the route, so you don't need to add businesses here.

   After changing either list, bump TRANSLATION_VERSION in the route so old
   cached translations are refreshed.
   ============================================================ */

export const CEBUANO_PHRASES: Record<string, string> = {
  // Navigation & common buttons
  "home": "Home",
  "back to home": "Balik sa Home",
  "search": "Pangita",
  "cancel": "Kanselahon",
  "submit": "Isumite",
  "save changes": "I-save ang mga kausaban",
  "edit": "Usba",
  "delete": "Papasa",
  "loading": "Nagkarga",
  "log out": "Mogawas",
  "next": "Sunod",
  "back": "Balik",

  // Explore pages
  "locate me": "Pangitaa ang akong lokasyon",
  "tracking": "Gisubay",
  "view on map": "Tan-awa sa Mapa",
  "get directions": "Unsaon pag-adto",
  "loading route": "Gikarga ang ruta",
  "open in google maps": "Ablihi sa Google Maps",
  "sort by nearest": "Pinakaduol una",
  "sorted by nearest": "Gihan-ay sumala sa kaduol",
  "filter": "Salaa",
  "all": "Tanan",
  "no results found": "Walay nakit-an",
  "try a different search term or filter": "Sulayi ang laing pulong o filter",
  "enable location first": "I-on una ang lokasyon",
  "road distance": "Gilay-on sa dalan",
  "estimated time": "Gibanabanang oras",
  "est. tricycle fare": "Banabana nga plete sa tricycle",

  // Reviews
  "reviews": "Mga review",
  "no reviews yet": "Wala pay review",

  // Operating hours
  "opening hours": "Oras sa pag-abli",
  "operating hours": "Oras sa operasyon",
  "open 24 hours": "Abli 24 oras",
  "closed": "Sirado",
  "closing soon": "Hapit na mosira",
  "hours not listed": "Wala pay nakalistang oras",

  // Sections
  "healthcare": "Panglawas",
  "education": "Edukasyon",
  "food & dining": "Pagkaon ug Kan-anan",
  "community": "Komunidad",
  "finance": "Pinansya",
  "transport & utilities": "Transportasyon ug Serbisyo",
  "shopping & store": "Shopping ug Tindahan",
  "announcements": "Mga Pahibalo",
  "events": "Mga Kalihokan",
  "emergency hotlines": "Mga Emergency Hotline",

  // Business
  "register a business": "Irehistro ang Negosyo",
  "my businesses": "Akong mga Negosyo",
  "request deletion": "Mohangyo nga papason",
  "pending review": "Naghulat sa pagsusi",
  "approved": "Giaprobahan",
  "rejected": "Gibalibaran",

  // Weather
  "today's weather": "Panahon karon",
  "humidity": "Kaumog",
  "wind": "Hangin",
};

export const KEEP_AS_IS: string[] = [
  // App & place names
  "MyCalinan", "CaliBot", "Calibot", "Calinan", "Calinan Poblacion", "Poblacion",
  "Davao City", "Davao del Sur", "Davao", "Mindanao", "Malagos", "Tamayong", "Wangan",
  "Barangay", "Purok", "Sitio",
  // Agencies & services
  "PhilHealth", "DTI", "SEC", "BIR", "DOH", "DepEd", "PAGASA", "PNP", "BFP", "LTO",
  "SSS", "Pag-IBIG", "GSIS", "TODA",
  // Brands & tools
  "Google Maps", "Mapbox", "GCash", "Maya", "Facebook", "Messenger",
];