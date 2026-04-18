"use client";

import Link from "next/link";
import { CheckCircle, ExternalLink } from "lucide-react";
import { getStrongEvidenceForIngredient } from "@/lib/evidence-helpers";

interface EvidenceBadgeProps {
  ingredientName: string;
  showCount?: boolean; // Show number of studies
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "full";
}

/**
 * Evidence Badge - Shows when an ingredient has strong clinical evidence
 * Use throughout the app for instant credibility indicators
 */
export function EvidenceBadge({
  ingredientName,
  showCount = false,
  size = "sm",
  variant = "minimal",
}: EvidenceBadgeProps) {
  const strongEvidence = getStrongEvidenceForIngredient(ingredientName);
  
  if (strongEvidence.length === 0) return null;
  
  const citationCount = strongEvidence.reduce(
    (total, e) => total + e.citations.length,
    0
  );
  
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };
  
  if (variant === "minimal") {
    return (
      <Link
        href="/practitioner/evidence"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 ${sizeClasses[size]} hover:bg-emerald-500/20 transition-colors`}
        title={`${citationCount} clinical studies`}
      >
        <CheckCircle className={iconSizes[size]} />
        {showCount && <span>{citationCount}</span>}
      </Link>
    );
  }
  
  return (
    <Link
      href="/practitioner/evidence"
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 ${sizeClasses[size]} hover:bg-emerald-500/20 transition-colors border border-emerald-500/20`}
    >
      <CheckCircle className={iconSizes[size]} />
      <span className="font-medium">
        {citationCount} {citationCount === 1 ? "study" : "studies"}
      </span>
      <ExternalLink className={`${iconSizes[size]} opacity-50`} />
    </Link>
  );
}
