import Image from "next/image";
import WovenDivider from "./WovenDivider";

type Official = { name: string; position: string; photo: string };

// Lebel 1
const CAPTAIN: Official = {
  name: "Ngalan sa Kapitan",
  position: "Punong Barangay",
  photo: "https://firebasestorage.googleapis.com/...",
};

// Lebel 2: 7 ka kagawad
const KAGAWADS: Official[] = [
  { name: "Kagawad 1", position: "Barangay Kagawad", photo: "https://firebasestorage.googleapis.com/..." },
  { name: "Kagawad 2", position: "Barangay Kagawad", photo: "https://firebasestorage.googleapis.com/..." },
  // dugangi hangtod 7
];

// Lebel 3
const STAFF: Official[] = [
  { name: "SK Chairperson", position: "SK Chairperson", photo: "https://firebasestorage.googleapis.com/..." },
  { name: "Secretary", position: "Barangay Secretary", photo: "https://firebasestorage.googleapis.com/..." },
  { name: "Treasurer", position: "Barangay Treasurer", photo: "https://firebasestorage.googleapis.com/..." },
];

function Card({ o, big = false }: { o: Official; big?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`relative mx-auto aspect-square overflow-hidden rounded-full border-2 border-canopy-600/30 shadow-md ${
          big ? "w-40 sm:w-48" : "w-28 sm:w-36"
        }`}
      >
        <Image
          src={o.photo}
          alt={o.name}
          fill
          sizes="(min-width: 640px) 192px, 160px"
          className="object-cover"
        />
      </div>
      <h3 className="mt-3 font-display text-base font-semibold text-canopy-900 sm:text-lg">
        {o.name}
      </h3>
      <p className="text-sm text-ink-500">{o.position}</p>
    </div>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-12 text-center font-mono text-xs uppercase tracking-widest text-durian-500">
      {children}
    </h3>
  );
}

// Flex (dili grid) aron ma-center ang katapusang linya (pananglit 4 + 3)
function Group({ people }: { people: Official[] }) {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-8 sm:gap-x-6">
      {people.map((o, i) => (
        <div key={o.position + i} className="w-[44%] sm:w-[22%]">
          <Card o={o} />
        </div>
      ))}
    </div>
  );
}

export default function BarangayOfficials() {
  return (
    <section className="bg-cream px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl">
          Barangay officials
        </h2>
        <WovenDivider tone="cream" />

        <div className="mt-8">
          <Card o={CAPTAIN} big />
        </div>

        <GroupTitle>Sangguniang Barangay</GroupTitle>
        <Group people={KAGAWADS} />

        <GroupTitle>Barangay staff</GroupTitle>
        <Group people={STAFF} />
      </div>
    </section>
  );
}