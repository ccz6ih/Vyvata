"use client";

import { Award, Shield, Target, DollarSign, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { StackScore } from "@/lib/scoring-engine";

type StackScoreCardProps = {
  scores: StackScore;
  className?: string;
};

export function StackScoreCard({ scores, className = "" }: StackScoreCardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Your Stack Analysis
        </h2>
        <p className="text-sm" style={{ color: "#7A90A8" }}>
          Evidence-based scores for your current supplement routine
        </p>
      </div>

      {/* 4 Score Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Evidence Score */}
        <ScoreCard
          icon={<Award size={20} />}
          title="Evidence Score"
          score={scores.evidenceScore}
          description={`${scores.evidenceBreakdown.strongEvidence.length} of ${
            scores.evidenceBreakdown.strongEvidence.length +
            scores.evidenceBreakdown.moderateEvidence.length +
            scores.evidenceBreakdown.weakEvidence.length +
            scores.evidenceBreakdown.noEvidence.length
          } ingredients have strong clinical backing`}
          color="#14B8A6"
        />

        {/* Safety Score */}
        <ScoreCard
          icon={<Shield size={20} />}
          title="Safety Score"
          score={scores.safetyScore}
          description={
            scores.safetyBreakdown.criticalWarnings.length > 0
              ? `${scores.safetyBreakdown.criticalWarnings.length} critical warning(s) detected`
              : scores.safetyBreakdown.moderateWarnings.length > 0
              ? `${scores.safetyBreakdown.moderateWarnings.length} moderate warning(s) to review`
              : "No significant safety concerns"
          }
          color={scores.safetyScore >= 80 ? "#10B981" : scores.safetyScore >= 60 ? "#F59E0B" : "#EF4444"}
        />

        {/* Optimization Score */}
        <ScoreCard
          icon={<Target size={20} />}
          title="Optimization Score"
          score={scores.optimizationScore}
          description={`${scores.optimizationBreakdown.goalAligned.length} ingredients directly support your goals`}
          color="#8B5CF6"
        />

        {/* Value Score */}
        <ScoreCard
          icon={<DollarSign size={20} />}
          title="Value Score"
          score={scores.valueScore}
          description="Cost-effectiveness analysis (coming soon)"
          color="#6B7280"
          isPlaceholder
        />
      </div>

      {/* Insights Section */}
      {scores.insights.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} style={{ color: "#14B8A6" }} />
            <h3 className="text-sm font-semibold text-white">Key Insights</h3>
          </div>
          <ul className="space-y-2">
            {scores.insights.map((insight, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#C9D6DF" }}>
                <span className="shrink-0 mt-0.5">
                  {insight.includes("🚨") || insight.includes("⚠️") ? (
                    <AlertTriangle size={14} style={{ color: "#F59E0B" }} />
                  ) : (
                    <CheckCircle2 size={14} style={{ color: "#10B981" }} />
                  )}
                </span>
                <span>{insight.replace(/[🎯✅⚠️🚨💡📚]/g, "").trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Breakdowns (Expandable) */}
      {scores.safetyBreakdown.criticalWarnings.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} style={{ color: "#EF4444" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#FCA5A5" }}>
              Critical Safety Warnings
            </h3>
          </div>
          <ul className="space-y-2">
            {scores.safetyBreakdown.criticalWarnings.map((warning, i) => (
              <li key={i} className="text-sm" style={{ color: "#FEE2E2" }}>
                <span className="font-medium">{warning.ingredients.join(", ")}</span>: {warning.warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type ScoreCardProps = {
  icon: React.ReactNode;
  title: string;
  score: number;
  description: string;
  color: string;
  isPlaceholder?: boolean;
};

function ScoreCard({ icon, title, score, description, color, isPlaceholder }: ScoreCardProps) {
  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", text: "Excellent" };
    if (score >= 80) return { grade: "A", text: "Very Good" };
    if (score >= 70) return { grade: "B", text: "Good" };
    if (score >= 60) return { grade: "C", text: "Fair" };
    if (score >= 50) return { grade: "D", text: "Needs Work" };
    return { grade: "F", text: "Poor" };
  };

  const { grade, text } = getScoreGrade(score);

  return (
    <div
      className="rounded-xl p-5 transition-all hover:scale-[1.02]"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${isPlaceholder ? "rgba(255, 255, 255, 0.06)" : `${color}33`}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{
              background: `${color}20`,
              color: color,
            }}
          >
            {icon}
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "#E8F0F5" }}>
            {title}
          </h3>
        </div>
        <div
          className="px-2 py-1 rounded-md text-xs font-bold"
          style={{
            background: `${color}20`,
            color: color,
          }}
        >
          {grade}
        </div>
      </div>

      {/* Score Circle */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-16 h-16">
          {/* Background circle */}
          <svg className="w-16 h-16 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="6"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={color}
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(score / 100) * 176} 176`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{score}</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs font-semibold mb-1" style={{ color: color }}>
            {text}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "#7A90A8" }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
