import Image from "next/image";

export default function Hero() {
  return (
    <section className="grid gap-8 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:px-20 lg:py-24">
      {/* Hero Content */}
      <div>
        {/* Heading */}
        <h1 className="font-display text-[2.25rem] font-semibold leading-[1.05] text-canopy-950 sm:text-6xl">
          <em className="text-durian-500 not-italic">Durian, Banana,</em>
          <br />
          and Bagobo roots.
        </h1>

        {/* Description */}
        <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-500 sm:mt-6 sm:text-lg">
          MyCalinan brings Calinan Poblacion&rsquo;s tourist spots, local
          businesses, barangay services, and community news onto one platform,
          built for residents, visitors, and officials alike. Known as the
          Fruit Basket of Davao City, Calinan sits in the 3rd District of Davao
          City, about 27 km from the city center.
        </p>

        {/* CTA */}
        <div className="mt-6 flex flex-wrap gap-4 sm:mt-8">
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
        <div className="absolute bottom-4 left-4 rounded-[var(--radius-stall)] bg-white/85 px-4 py-2 font-mono text-xs text-canopy-900 backdrop-blur-sm sm:bottom-6 sm:left-6">
          Calinan Poblacion
        </div>
      </div>
    </section>
  );
}