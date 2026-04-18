"use client";

import { CheckCircle, ExternalLink } from "lucide-react";
import type { EvidenceSummary } from "@/lib/evidence-summaries";

interface EvidenceSummaryCardProps {
  summary: EvidenceSummary;
  compact?: boolean;
}

export function EvidenceSummaryCard({ summary, compact = false }: EvidenceSummaryCardProps) {
  const tierColors: Record<string, string> = {
    strong: "#34D399",
    moderate: "#F59E0B",
    weak: "#FB923C",
  };

  const tierLabels: Record<string, string> = {
    strong: "Strong Evidence",
    moderate: "Moderate Evidence",
    weak: "Limited Evidence",
  };

  const categoryLabels: Record<string, string> = {
    ingredient: "Ingredient",
    protocol: "Protocol",
    interaction: "Interaction",
  };

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: "rgba(17,32,64,0.4)",
        border: "1px solid rgba(201,214,223,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: "rgba(139,92,246,0.15)",
                color: "#A78BFA",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {categoryLabels[summary.category]}
            </span>
          </div>
          <h3
            className="text-lg font-bold"
            style={{ color: "#C9D6DF", fontFamily: "Montserrat, sans-serif" }}
          >
            {summary.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded"
            style={{
              background: `${tierColors[summary.evidenceTier]}20`,
              color: tierColors[summary.evidenceTier],
            }}
          >
            <CheckCircle size={14} />
            <span>{tierLabels[summary.evidenceTier]}</span>
          </div>
          <span className="text-xs" style={{ color: "#7A90A8" }}>
            Updated {summary.lastUpdated}
          </span>
        </div>
      </div>

      {/* Summary Text */}
      <p
        className={`leading-relaxed ${compact ? "text-sm" : "text-sm"}`}
        style={{ color: "#9FB4CC", lineHeight: "1.7" }}
      >
        {summary.summary}
      </p>

      {/* Citations */}
      {summary.citations.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#7A90A8" }}
          >
            References
          </p>
          <div className="space-y-1.5">
            {summary.citations.map((citation, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs"
                style={{ color: "#7A90A8" }}
              >
                <span className="shrink-0" style={{ color: "#14B8A6" }}>
                  [{idx + 1}]
                </span>
                <div className="flex-1">
                  <span>{citation.source}</span>
                  {citation.year && (
                    <span className="ml-1">({citation.year})</span>
                  )}
                  {citation.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: "#14B8A6" }}
                    >
                      PMID:{citation.pmid}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {citation.url && !citation.pmid && (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: "#14B8A6" }}
                    >
                      View
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
