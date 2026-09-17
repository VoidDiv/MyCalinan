
import Image from "next/image";

const FACT_CHIPS = [
  { label: "Fruit Basket of Davao City" },
  { label: "3rd District, Davao City" },
  { label: "~27 km from the city center" },
];

export default function Hero() {
  return (
    <section className="grid gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:px-20 lg:py-24">
      {/* Hero Content */}
      <div>
        {/* Quick Facts */}
        <ul
          className="mb-6 flex flex-wrap gap-2"
          aria-label="Quick facts about Calinan"
        >
          {FACT_CHIPS.map((chip) => (
            <li
              key={chip.label}
              className="rounded-[var(--radius-stall)] border border-canopy-600/40 bg-canopy-100 px-3 py-1 font-mono text-xs tracking-wide text-canopy-800"
            >
              {chip.label}
            </li>
          ))}
        </ul>

        {/* Heading */}
        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] text-canopy-950 sm:text-6xl">
          <em className="text-durian-500 not-italic">Durian, Banana,</em>
          <br />
          and Bagobo roots.
        </h1>

        {/* Description */}
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
          MyCalinan brings Calinan Poblacion&rsquo;s tourist spots, local
          businesses, barangay services, and community news onto one platform
          — built for residents, visitors, and officials alike.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#discover"
            className="rounded-[var(--radius-stall)] bg-canopy-700 px-6 py-3 font-semibold text-white transition hover:bg-canopy-800 focus:outline-none focus:ring-2 focus:ring-canopy-600 focus:ring-offset-2"
          >
            Discover Calinan
          </a>
        </div>
      </div>

      {/* Art Panel — Real Photo of Calinan Poblacion */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-canopy-600/30 shadow-xl">
        <Image
          src="/image/Calinan-Poblacion.png"
          alt="Calinan Poblacion, Davao City"
          fill
          sizes="(min-width: 1024px) 45vw, 90vw"
          className="object-cover"
          priority
        />

        {/* Image Label */}
        <div className="absolute bottom-6 left-6 rounded-[var(--radius-stall)] bg-white/85 px-4 py-2 font-mono text-xs text-canopy-900 backdrop-blur-sm">
          Calinan Poblacion
        </div>
      </div>
    </section>
  );
}
