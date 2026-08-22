import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-canopy-800 px-6 py-8 text-center text-white sm:px-10">
      <p className="text-sm">
        © {new Date().getFullYear()} MyCalinan. All Rights Reserved | Designed
        &amp; Developed by Caldi, Saludo and Palermo
      </p>
      <p className="mt-2 text-sm">
        <Link href="/terms" className="underline">
          Terms and conditions
        </Link>{" "}
        &middot;{" "}
        <Link href="/privacy" className="underline">
          Privacy notice
        </Link>
      </p>
    </footer>
  );
}
