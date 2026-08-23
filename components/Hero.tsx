const FACT_CHIPS = [
  { label: "Fruit Basket of Davao City" },
  { label: "3rd District, Davao City" },
  { label: "~27 km from the city center" },
];

export default function Hero() {
  return (
    <section className="grid gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:px-20 lg:py-24">
      <div>
        <ul className="mb-6 flex flex-wrap gap-2" aria-label="Quick facts about Calinan">
          {FACT_CHIPS.map((chip) => (
            <li
              key={chip.label}
              className="rounded-[var(--radius-stall)] border border-canopy-600/40 bg-canopy-100 px-3 py-1 font-mono text-xs tracking-wide text-canopy-800"
            >
              {chip.label}
            </li>
          ))}
        </ul>

        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] text-canopy-950 sm:text-6xl">
          Calinan, grown from
          <br />
          <em className="text-durian-500 not-italic">durian, banana,</em> and
          <br />
          Bagobo roots.
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
          MyCalinan brings Calinan Poblacion&rsquo;s tourist spots, local
          Businesses, Barangay services, and community news onto one
          platform — built for residents, Visitors, and officials alikeeeeeeeeeeeeeee.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#discover"
            className="rounded-[var(--radius-stall)] bg-canopy-700 px-6 py-3 font-semibold text-white transition hover:bg-canopy-800"
          >
            Discover Calinan
          </a>
          <a
            href="/documents/barangay-clearance"
            className="rounded-[var(--radius-stall)] border border-canopy-700 px-6 py-3 font-semibold text-canopy-800 transition hover:bg-canopy-100"
          >
            Request a document
          </a>
        </div>
      </div>

      {/* Art panel — swap the pattern below for a real photo of Calinan
          (e.g. the Poblacion market or Malagos Garden) when available. */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-canopy-600/30 bg-gradient-to-br from-canopy-100 via-canopy-400/40 to-durian-400/50 shadow-xl">
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern
              id="weave"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 20 L20 0 L40 20 L20 40 Z"
                fill="none"
                stroke="var(--canopy-800)"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>
          <rect width="400" height="300" fill="url(#weave)" />
        </svg>
        <div className="absolute bottom-6 left-6 rounded-[var(--radius-stall)] bg-white/85 px-4 py-2 font-mono text-xs text-canopy-900">
          Calinan Poblacion
        </div>
      </div>
    </section>
  );
}
