import Link from "next/link";
import { House } from "lucide-react";

export default function HomeButton() {
  return (
    <Link href="/" className="back-btn" aria-label="Back to homepage">
      <House size={18} strokeWidth={2} aria-hidden="true" />
      <span>Home</span>
    </Link>
  );
}