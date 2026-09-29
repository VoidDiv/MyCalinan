import WovenDivider from "./WovenDivider";

type Stall = {
  title: string;
  description: string;
  href: string;
};

const STALLS: Stall[] = [
  {
    title: "Discover places",
    description: "Php Eagle Center, Malagos Garden, Davao Bamboo Sanctuary, and more.",
    href: "/explore/Hotspots",
  },
  {
    title: "Explore via map",
    description: "Live GPS and turn-by-turn routing across Calinan Poblacion.",
    href: "/map",
  },
  {
    title: "Browse marketplace",
    description: "Local shops, eateries, and businesses run by Calinanians.",
    href: "/explore/Shopping",
  },
  {
    title: "Access hotlines",
    description: "Emergency, barangay, and utility numbers in one place.",
    href: "/others/Hotlines",
  },
  {
    title: "Learn history",
    description: "From the Bagobo settlement under Datu Abeng to today.",
    href: "/others/History",
  },
];

export default function DiscoverGrid() {
  return (
    <section
      id="discover"
      className="bg-cream px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl">
          What you can do on MyCalinan
        </h2>
        <WovenDivider tone="cream" />

        <div className="mt-6 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {STALLS.map((stall, i) => (
            <a
              key={stall.title}
              href={stall.href}
              className="group rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6"
            >
              <span className="font-mono text-xs text-durian-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 font-display text-lg font-semibold text-canopy-900 sm:mt-2 sm:text-xl">
                {stall.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500 sm:mt-2">
                {stall.description}
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-canopy-700 transition group-hover:text-durian-500 sm:mt-4">
                Open →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

