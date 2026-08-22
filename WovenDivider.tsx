type WovenDividerProps = {
  /** Background color the divider sits on top of */
  tone?: "cream" | "canopy";
};

/**
 * The page's signature motif: a woven bamboo-strip pattern, standing in
 * for the crates Calinan's produce is carried in. Used once per section
 * seam rather than as decoration throughout, so it stays legible as a
 * mark of the brand instead of noise.
 */
export default function WovenDivider({ tone = "cream" }: WovenDividerProps) {
  const stroke = tone === "cream" ? "var(--canopy-700)" : "var(--durian-400)";

  return (
    <div aria-hidden="true" className="w-full overflow-hidden leading-none">
      <svg
        viewBox="0 0 240 16"
        preserveAspectRatio="none"
        className="h-4 w-full"
      >
        <path
          d="M0 8 L15 1 L30 8 L45 1 L60 8 L75 1 L90 8 L105 1 L120 8 L135 1 L150 8 L165 1 L180 8 L195 1 L210 8 L225 1 L240 8"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <path
          d="M0 8 L15 15 L30 8 L45 15 L60 8 L75 15 L90 8 L105 15 L120 8 L135 15 L150 8 L165 15 L180 8 L195 15 L210 8 L225 15 L240 8"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
