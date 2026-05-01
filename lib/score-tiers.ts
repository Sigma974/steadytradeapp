// Single source of truth for Steady Score tier thresholds, labels, and colors.
// Used by UI components (Tailwind classes), OG images (hex colors), and i18n (key).

export type ScoreTierKey = "elite" | "strong" | "solid" | "improving" | "growing";

export interface ScoreTier {
  key: ScoreTierKey;
  labelEn: string;              // English label for OG images (no i18n context)
  icon: string;                 // badge icon
  // Hex values for OG / twitter image JSX inline styles
  colorHex: string;
  bgHex: string;
  borderHex: string;
  // Tailwind classes for UI components
  tailwindText: string;
  tailwindBar: string;
  tailwindCard: string;
  tailwindPhilosophyBg: string;
}

const TIERS: ScoreTier[] = [
  {
    key: "elite",
    labelEn: "Elite discipline",
    icon: "★",
    colorHex: "#34d399",
    bgHex: "#022c22",
    borderHex: "#065f46",
    tailwindText: "text-emerald-400",
    tailwindBar: "bg-emerald-500",
    tailwindCard: "border-emerald-900/40",
    tailwindPhilosophyBg: "bg-emerald-950/40 border-emerald-900/30",
  },
  {
    key: "strong",
    labelEn: "Strong discipline",
    icon: "✓",
    colorHex: "#4ade80",
    bgHex: "#052e16",
    borderHex: "#166534",
    tailwindText: "text-green-400",
    tailwindBar: "bg-green-500",
    tailwindCard: "border-green-900/30",
    tailwindPhilosophyBg: "bg-green-950/40 border-green-900/30",
  },
  {
    key: "solid",
    labelEn: "Solid foundation",
    icon: "◆",
    colorHex: "#a3e635",
    bgHex: "#1a2e05",
    borderHex: "#3f6212",
    tailwindText: "text-lime-400",
    tailwindBar: "bg-lime-500",
    tailwindCard: "border-lime-900/40",
    tailwindPhilosophyBg: "bg-lime-950/40 border-lime-900/30",
  },
  {
    key: "improving",
    labelEn: "Room for improvement",
    icon: "▲",
    colorHex: "#fb923c",
    bgHex: "#431407",
    borderHex: "#9a3412",
    tailwindText: "text-orange-400",
    tailwindBar: "bg-orange-500",
    tailwindCard: "border-orange-900/40",
    tailwindPhilosophyBg: "bg-orange-950/40 border-orange-900/30",
  },
  {
    key: "growing",
    labelEn: "Plenty of room to grow",
    icon: "▲",
    colorHex: "#f87171",
    bgHex: "#3b0a0a",
    borderHex: "#991b1b",
    tailwindText: "text-red-400",
    tailwindBar: "bg-red-500",
    tailwindCard: "border-red-900/40",
    tailwindPhilosophyBg: "bg-red-950/40 border-red-900/30",
  },
];

export function getScoreTier(score: number): ScoreTier {
  if (score >= 90) return TIERS[0]; // elite
  if (score >= 75) return TIERS[1]; // strong
  if (score >= 60) return TIERS[2]; // solid
  if (score >= 40) return TIERS[3]; // improving
  return TIERS[4];                  // growing
}
