// Cross-Reference Helper Functions
// These functions help connect ingredients with evidence summaries for magical UX

import { EVIDENCE_SUMMARIES, EvidenceSummary } from "./evidence-summaries";
import { INGREDIENTS, IngredientRecord } from "./ingredients-db";

/**
 * Get evidence summaries related to a specific ingredient
 */
export function getEvidenceForIngredient(ingredientName: string): EvidenceSummary[] {
  const lowerName = ingredientName.toLowerCase();
  
  return EVIDENCE_SUMMARIES.filter((evidence) => {
    // Check relatedIngredients array
    if (evidence.relatedIngredients?.some((ing) => ing.toLowerCase() === lowerName)) {
      return true;
    }
    
    // Check if ingredient name appears in title or summary
    const titleMatch = evidence.title.toLowerCase().includes(lowerName);
    const summaryMatch = evidence.summary.toLowerCase().includes(lowerName);
    
    return titleMatch || summaryMatch;
  });
}

/**
 * Get evidence summaries for multiple ingredients (e.g., a protocol's ingredient list)
 */
export function getEvidenceForIngredients(ingredientNames: string[]): EvidenceSummary[] {
  const allEvidence = ingredientNames.flatMap((name) => getEvidenceForIngredient(name));
  
  // Deduplicate by ID
  const unique = Array.from(
    new Map(allEvidence.map((e) => [e.id, e])).values()
  );
  
  return unique;
}

/**
 * Get evidence summaries by tags (e.g., "sleep", "focus", "inflammation")
 */
export function getEvidenceByTag(tag: string): EvidenceSummary[] {
  const lowerTag = tag.toLowerCase();
  
  return EVIDENCE_SUMMARIES.filter((evidence) => {
    return evidence.tags?.some((t) => t.toLowerCase() === lowerTag);
  });
}

/**
 * Get interaction warnings for an ingredient list
 */
export function getInteractionEvidence(ingredientNames: string[]): EvidenceSummary[] {
  return EVIDENCE_SUMMARIES.filter((evidence) => {
    if (evidence.category !== "interaction") return false;
    
    // Check if any of the ingredients are mentioned
    return ingredientNames.some((name) => {
      const lowerName = name.toLowerCase();
      return (
        evidence.title.toLowerCase().includes(lowerName) ||
        evidence.relatedIngredients?.some((ing) => ing.toLowerCase() === lowerName)
      );
    });
  });
}

/**
 * Get protocol evidence summaries
 */
export function getProtocolEvidence(protocolId?: string): EvidenceSummary[] {
  return EVIDENCE_SUMMARIES.filter((evidence) => {
    if (evidence.category !== "protocol") return false;
    
    if (protocolId) {
      return evidence.relatedProtocols?.includes(protocolId);
    }
    
    return true;
  });
}

/**
 * Get strong evidence summaries (for "Backed by Research" badges)
 */
export function getStrongEvidenceForIngredient(ingredientName: string): EvidenceSummary[] {
  return getEvidenceForIngredient(ingredientName).filter(
    (e) => e.evidenceTier === "strong"
  );
}

/**
 * Get citation count for an ingredient (for metrics)
 */
export function getCitationCountForIngredient(ingredientName: string): number {
  const evidence = getEvidenceForIngredient(ingredientName);
  return evidence.reduce((total, e) => total + e.citations.length, 0);
}

/**
 * Get ingredient records that have evidence summaries
 */
export function getIngredientsWithEvidence(): IngredientRecord[] {
  const ingredientsWithEvidence = new Set<string>();
  
  EVIDENCE_SUMMARIES.forEach((evidence) => {
    evidence.relatedIngredients?.forEach((name) => {
      ingredientsWithEvidence.add(name.toLowerCase());
    });
  });
  
  return INGREDIENTS.filter((ing) =>
    ingredientsWithEvidence.has(ing.name.toLowerCase())
  );
}

/**
 * Check if an ingredient has strong clinical evidence
 */
export function hasStrongEvidence(ingredientName: string): boolean {
  return getStrongEvidenceForIngredient(ingredientName).length > 0;
}

/**
 * Get evidence summary by ID
 */
export function getEvidenceSummaryById(id: string): EvidenceSummary | undefined {
  return EVIDENCE_SUMMARIES.find((e) => e.id === id);
}

/**
 * Search evidence summaries (title, summary, tags)
 */
export function searchEvidence(query: string): EvidenceSummary[] {
  const lowerQuery = query.toLowerCase();
  
  return EVIDENCE_SUMMARIES.filter((evidence) => {
    const titleMatch = evidence.title.toLowerCase().includes(lowerQuery);
    const summaryMatch = evidence.summary.toLowerCase().includes(lowerQuery);
    const tagMatch = evidence.tags?.some((tag) =>
      tag.toLowerCase().includes(lowerQuery)
    );
    const ingredientMatch = evidence.relatedIngredients?.some((ing) =>
      ing.toLowerCase().includes(lowerQuery)
    );
    
    return titleMatch || summaryMatch || tagMatch || ingredientMatch;
  });
}
