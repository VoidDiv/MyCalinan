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
    href: "/explore/hotspots",
  },
  {
    title: "Explore via map",
    description: "Live GPS and turn-by-turn routing across Calinan Poblacion.",
    href: "/map",
  },
  {
    title: "Browse marketplace",
    description: "Local shops, eateries, and businesses run by Calinanians.",
    href: "/explore/shopping",
  },
  {
    title: "Access hotlines",
    description: "Emergency, barangay, and utility numbers in one place.",
    href: "/hotlines",
  },
  {
    title: "Learn history",
    description: "From the Bagobo settlement under Datu Abeng to today.",
    href: "/history",
  },
];

export default function DiscoverGrid() {
  return (
    <section id="discover" className="bg-cream px-6 py-16 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-3xl font-semibold text-canopy-800 sm:text-4xl">
          What you can do on MyCalinan
        </h2>
        <WovenDivider tone="cream" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STALLS.map((stall, i) => (
            <a
              key={stall.title}
              href={stall.href}
              className="group rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="font-mono text-xs text-durian-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-xl font-semibold text-canopy-900">
                {stall.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {stall.description}
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-canopy-700 transition group-hover:text-durian-500">
                Open →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
