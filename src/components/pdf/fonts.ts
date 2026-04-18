/**
 * PDF Font Registration
 * Registers custom fonts for @react-pdf/renderer
 * Uses Google Fonts CDN for Inter and Montserrat
 */

import { Font } from "@react-pdf/renderer";

// Register Inter font family (body text)
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiA.woff2",
      fontWeight: 700,
    },
  ],
});

// Register Montserrat font family (headings)
Font.register({
  family: "Montserrat",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2",
      fontWeight: 900,
    },
  ],
});

// Export font families for use in StyleSheet
export const FONTS = {
  body: "Inter",
  heading: "Montserrat",
} as const;
