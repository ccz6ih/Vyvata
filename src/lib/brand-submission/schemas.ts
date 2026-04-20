// Zod validation schemas for the brand submission form.
//
// Four sections match the mockup in UI-V2-AND-SUBMISSION-PLAN.md §4.4:
// 1. Product Identity
// 2. Manufacturing Evidence
// 3. Clinical Evidence
// 4. Safety & Transparency
//
// submission_data JSONB in product_submissions table stores the full
// validated payload from SubmissionDataSchema.

import { z } from "zod";

// ══════════════════════════════════════════════════════════════
// Section 1: Product Identity
// ══════════════════════════════════════════════════════════════

const IngredientFormSchema = z.object({
  name: z.string().min(1, "Ingredient name required"),
  amount: z.string().optional(), // e.g., "500mg", "1000 IU"
  unit: z.string().optional(),
  bioavailability_form: z.string().optional(), // e.g., "bisglycinate", "citrate"
  daily_value_percent: z.number().optional(),
});

export const ProductIdentitySchema = z.object({
  product_name: z.string().min(1, "Product name required"),
  sku: z.string().optional(),
  brand_name: z.string().min(1, "Brand name required"),
  category: z.string().min(1, "Category required"),
  ingredients: z.array(IngredientFormSchema).min(1, "At least one ingredient required"),
  serving_size: z.string().optional(),
  servings_per_container: z.number().int().positive().optional(),
});

// ══════════════════════════════════════════════════════════════
// Section 2: Manufacturing Evidence
// ══════════════════════════════════════════════════════════════

export const ManufacturingEvidenceSchema = z.object({
  // Third-party certifications
  nsf_sport: z.boolean().default(false),
  usp_verified: z.boolean().default(false),
  informed_sport: z.boolean().default(false),
  informed_choice: z.boolean().default(false),
  bscg_certified: z.boolean().default(false),
  non_gmo: z.boolean().default(false),
  organic_usda: z.boolean().default(false),
  vegan: z.boolean().default(false),
  gluten_free: z.boolean().default(false),
  kosher: z.boolean().default(false),
  halal: z.boolean().default(false),

  // Testing frequency
  testing_frequency: z
    .enum(["per_batch", "monthly", "quarterly", "annually", "not_disclosed"])
    .optional(),

  // Manufacturing facility details
  facility_name: z.string().optional(),
  facility_country: z.string().optional(),
  gmp_certified: z.boolean().default(false),
  fda_registered: z.boolean().default(false),
  
  // Additional notes
  manufacturing_notes: z.string().max(1000).optional(),
});

// ══════════════════════════════════════════════════════════════
// Section 3: Clinical Evidence
// ══════════════════════════════════════════════════════════════

export const ClinicalEvidenceSchema = z.object({
  // Primary health outcome
  primary_health_outcome: z.string().max(500).optional(),
  
  // PubMed URLs for product-specific studies
  clinical_study_urls: z.array(z.string().url()).default([]),
  
  // Study summary
  study_summary: z.string().max(2000).optional(),
  
  // Additional clinical notes
  clinical_notes: z.string().max(1000).optional(),
});

// ══════════════════════════════════════════════════════════════
// Section 4: Safety & Transparency
// ══════════════════════════════════════════════════════════════

export const SafetyTransparencySchema = z.object({
  // Contraindications & interactions
  contraindications: z.string().max(1000).optional(),
  known_interactions: z.string().max(1000).optional(),
  
  // Ingredient sourcing
  ingredient_sourcing_notes: z.string().max(1000).optional(),
  supply_chain_origin: z.string().max(500).optional(),
  
  // Paid endorsements
  paid_endorsements_disclosed: z
    .enum(["yes", "no", "not_applicable"])
    .optional(),
  
  // Additional transparency notes
  transparency_notes: z.string().max(1000).optional(),
  
  // Legal attestation (required for submission)
  legal_attestation: z.boolean().default(false),
});

// ══════════════════════════════════════════════════════════════
// Complete submission data
// ══════════════════════════════════════════════════════════════

export const SubmissionDataSchema = z.object({
  product_identity: ProductIdentitySchema,
  manufacturing_evidence: ManufacturingEvidenceSchema,
  clinical_evidence: ClinicalEvidenceSchema,
  safety_transparency: SafetyTransparencySchema,
});

export type SubmissionData = z.infer<typeof SubmissionDataSchema>;
export type ProductIdentity = z.infer<typeof ProductIdentitySchema>;
export type ManufacturingEvidence = z.infer<typeof ManufacturingEvidenceSchema>;
export type ClinicalEvidence = z.infer<typeof ClinicalEvidenceSchema>;
export type SafetyTransparency = z.infer<typeof SafetyTransparencySchema>;

// ══════════════════════════════════════════════════════════════
// File reference schema (for file_references JSONB array)
// ══════════════════════════════════════════════════════════════

export const FileReferenceSchema = z.object({
  kind: z.enum([
    "coa", // Certificate of Analysis
    "clinical_study",
    "sourcing_doc",
    "facility_audit",
    "ethics_audit",
    "other",
  ]),
  path: z.string(), // Supabase Storage path
  filename: z.string(),
  size_bytes: z.number().int().positive(),
  uploaded_at: z.string(), // ISO timestamp
});

export type FileReference = z.infer<typeof FileReferenceSchema>;

// ══════════════════════════════════════════════════════════════
// Helper: Empty submission data (for new drafts)
// ══════════════════════════════════════════════════════════════

export function emptySubmissionData(): SubmissionData {
  return {
    product_identity: {
      product_name: "",
      brand_name: "",
      category: "",
      ingredients: [],
    },
    manufacturing_evidence: {
      nsf_sport: false,
      usp_verified: false,
      informed_sport: false,
      informed_choice: false,
      bscg_certified: false,
      non_gmo: false,
      organic_usda: false,
      vegan: false,
      gluten_free: false,
      kosher: false,
      halal: false,
      gmp_certified: false,
      fda_registered: false,
    },
    clinical_evidence: {
      clinical_study_urls: [],
    },
    safety_transparency: {},
  };
}
