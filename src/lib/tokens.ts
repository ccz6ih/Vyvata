// Vyvata design tokens — single source of truth for colors used across
// scorecards, OG images, admin surfaces, and recommendation cards.
//
// If you're adding a new tier color or semantic accent, add it here and
// import from callers instead of hardcoding a hex. Mis-matched colors
// between the public scorecard, the OG image, and the in-app card break
// brand coherence in ways users notice even if they can't name.

export const VYVATA_TOKENS = {
  // Dark backgrounds
  db: "#0B1F3B",
  db2: "#0d2545",
  db3: "#112a52",

  // Primary teal (Verified tier, brand accent)
  teal: "#14B8A6",
  tealDim: "rgba(20,184,166,0.10)",
  tealMid: "rgba(20,184,166,0.25)",
  tealGlow: "rgba(20,184,166,0.45)",

  // Tier color ladder — distinct visual weight per tier.
  // Elite gets purple (claimed from the "reserved" slot in the palette) so
  // the top tier is visually distinguishable from Verified, which was
  // previously sharing a teal-green space with Elite.
  elite: "#a78bfa",       // purple — NEW, was #34D399
  eliteDim: "rgba(167,139,250,0.11)",
  eliteMid: "rgba(167,139,250,0.30)",
  verified: "#14B8A6",    // same as teal
  verifiedDim: "rgba(20,184,166,0.10)",
  standard: "#F59E0B",
  standardDim: "rgba(245,158,11,0.11)",
  rejected: "#F87171",
  rejectedDim: "rgba(248,113,113,0.11)",

  // Semantic accents
  positive: "#34D399",     // improvements / positive deltas
  positiveDim: "rgba(52,211,153,0.12)",
  warning: "#F59E0B",
  danger: "#F87171",
  dangerDim: "rgba(248,113,113,0.11)",
  blue: "#60a5fa",         // AI-inferred mode accent
  blueDim: "rgba(96,165,250,0.11)",

  // Text
  fg: "#E8F0F5",
  fgMid: "#C9D6DF",
  fgDim: "#7A90A8",
  fgFaint: "#4a6080",
} as const;

export type Tier = "elite" | "verified" | "standard" | "rejected";

// Tier → primary color. Use for score tiles, rings, pills, anything that
// should carry the tier identity.
export const TIER_COLOR: Record<Tier, string> = {
  elite: VYVATA_TOKENS.elite,
  verified: VYVATA_TOKENS.verified,
  standard: VYVATA_TOKENS.standard,
  rejected: VYVATA_TOKENS.rejected,
};

// Tier → translucent fill for backgrounds.
export const TIER_COLOR_DIM: Record<Tier, string> = {
  elite: VYVATA_TOKENS.eliteDim,
  verified: VYVATA_TOKENS.verifiedDim,
  standard: VYVATA_TOKENS.standardDim,
  rejected: VYVATA_TOKENS.rejectedDim,
};
