"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { getEvidenceForIngredients } from "@/lib/evidence-helpers";
import { EvidenceSummaryCard } from "./EvidenceSummaryCard";

interface ProtocolEvidenceSectionProps {
  ingredientNames: string[];
  protocolName?: string;
}

/**
 * Protocol Evidence Section
 * Shows related clinical evidence for protocol ingredients
 * Use in ProtocolClient.tsx to add "Clinical Evidence" section
 */
export function ProtocolEvidenceSection({
  ingredientNames,
  protocolName,
}: ProtocolEvidenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const evidence = getEvidenceForIngredients(ingredientNames);
  const strongEvidence = evidence.filter((e) => e.evidenceTier === "strong");
  
  if (evidence.length === 0) return null;
  
  const totalCitations = evidence.reduce(
    (total, e) => total + e.citations.length,
    0
  );
  
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <img
              src="/icons/Read a Good Book.svg"
              alt="Evidence"
              className="w-8 h-8"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(70%) sepia(35%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(90%)",
              }}
            />
            Clinical Evidence
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {strongEvidence.length} strong evidence summaries • {totalCitations}{" "}
            clinical studies
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-6 space-y-4">
          {evidence.map((summary) => (
            <EvidenceSummaryCard key={summary.id} summary={summary} />
          ))}
          
          <div className="pt-4 border-t border-slate-700">
            <a
              href="/practitioner/evidence"
              className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View Full Evidence Library
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
