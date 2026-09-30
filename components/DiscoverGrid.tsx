import Image from "next/image";
import WovenDivider from "./WovenDivider";

type Stall = {
  title: string;
  description: string;
  href: string;
  images: { src: string; alt: string }[];
};

// Ilisi ang src sa imong Firebase download URLs
const STALLS: Stall[] = [
  {
    title: "Discover places",
    description: "Php Eagle Center, Malagos Garden, Davao Bamboo Sanctuary, and more.",
    href: "/explore/Hotspots",
    images: [
{ src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Hotspots%2FPhilippine%20Eagle%20Center%20(PEC).jpg?alt=media&token=6bbac1a2-bea3-4ae9-a376-665d0f943eab", alt: "Philippine Eagle Center" },
 { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Hotspots%2FMalagos%20Garden%20Resort.jpg?alt=media&token=a7938f22-173b-474a-99b4-18de5bf8b7a1", alt: "Malagos Garden Resort" },
{ src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/Hotspots%2Fbamboo-sanctuary-and-ecological-park.webp.jpg?alt=media&token=c149c8b9-451a-4779-b46a-7df89109967e", alt: "Davao Bamboo Sanctuary" },
    ],
  },
  {
    title: "Explore via map",
    description: "Live GPS and turn-by-turn routing across Calinan Poblacion.",
    href: "/map",
    images: [
{ src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2Fmap.jpg?alt=media&token=79b92d29-4aaf-42e5-9642-dbc1eae97ca8", alt: "Map view" },
    ],
  },
  {
    title: "Browse marketplace",
    description: "Local shops, eateries, and businesses run by Calinanians.",
    href: "/explore/Shopping",
    images: [
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FCalinan%20Today1.png?alt=media&token=fb567293-e1ce-4a92-b909-687e0b25e341", alt: "Calinan Commercial Center" },
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FCalinan%20Today2.jpg?alt=media&token=c85f3992-e606-4587-a4f1-8e1a0687bd3e", alt: "Calinan today" },
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FCalinan%20Market.jpg?alt=media&token=1efada3b-0ebd-4117-a0f7-f8bfee7e6735", alt: "Calinan market" },
    ],
  },
  {
    title: "Access hotlines",
    description: "Emergency, barangay, and utility numbers in one place.",
    href: "/others/Hotlines",
    images: [
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FCalinan%20Police%20Staion.jpg?alt=media&token=dd5f7e8a-6a8e-4269-92de-d563820ca114", alt: "Police Station 10" },
{ src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FCalinan%20Fire%20Station.jpg?alt=media&token=02e352ce-de86-402c-88fb-712ffcc350cf", alt: "Calinan Fire Station" },
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FCity%20Health.jpg?alt=media&token=944eb00d-2914-4369-97db-14295a0b03aa", alt: "City Health Office" },
    ],
  },
  {
    title: "Learn history",
    description: "From the Bagobo settlement under Datu Abeng to today.",
    href: "/others/History",
    images: [
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FHistory1.jpg?alt=media&token=a4909832-e1fa-445c-b9b3-9a8f26b03e59", alt: "Obu-Manuvu and Bagobo Klata tribes" },
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FHistory2.jpg?alt=media&token=8d2c807e-7357-4fb6-a903-f12e8eac0897", alt: "Datu Abing" },
      { src: "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/History%2FHistory3.jpg?alt=media&token=c7c2ddee-93ea-4eaa-b78b-80957f55cdb2", alt: "Little Tokyo" },
    ],
  },
];

// Laptop: 3 sa taas (2 col kada usa), 2 sa ubos (3 col kada usa)
function spanClass(i: number) {
  if (i < 3) return "lg:col-span-2";
  if (i === 4) return "sm:col-span-2 lg:col-span-3"; // ang ikalimang card
  return "lg:col-span-3";
}

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

        <div className="mt-6 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6">
          {STALLS.map((stall, i) => (
            <a
              key={stall.title}
              href={stall.href}
              className={`group overflow-hidden rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${spanClass(i)}`}
            >
              {/* Selpon: swipe tanang pic. Laptop (md+): unang pic ra */}
              <div
                className="flex snap-x snap-mandatory overflow-x-auto
                           [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                           md:overflow-hidden"
              >
                {stall.images.map((img, n) => (
                  <div
                    key={img.src + n}
                    className={`relative aspect-[16/9] w-full shrink-0 snap-center ${
                      n > 0 ? "md:hidden" : ""
                    }`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>

              <div className="p-4 sm:p-6">
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
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}