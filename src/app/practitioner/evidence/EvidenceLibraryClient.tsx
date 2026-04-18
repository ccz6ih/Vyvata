"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, BookOpen, Pill, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import PractitionerNav from "@/components/PractitionerNav";
import { EvidenceSummaryCard } from "@/components/EvidenceSummaryCard";
import {
  EVIDENCE_SUMMARIES,
  getEvidenceSummariesByCategory,
  getStrongEvidenceSummaries,
  type EvidenceSummary,
} from "@/lib/evidence-summaries";

type FilterType = "all" | "ingredient" | "protocol" | "interaction" | "strong";

export default function EvidenceLibraryClient() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  let filteredSummaries: EvidenceSummary[] = [];

  if (filter === "all") {
    filteredSummaries = EVIDENCE_SUMMARIES;
  } else if (filter === "strong") {
    filteredSummaries = getStrongEvidenceSummaries();
  } else {
    filteredSummaries = getEvidenceSummariesByCategory(filter);
  }

  if (search) {
    const query = search.toLowerCase();
    filteredSummaries = filteredSummaries.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.summary.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    );
  }

  const filterButtons: Array<{ id: FilterType; label: string; icon: any }> = [
    { id: "all", label: "All", icon: BookOpen },
    { id: "ingredient", label: "Ingredients", icon: Pill },
    { id: "protocol", label: "Protocols", icon: Users },
    { id: "interaction", label: "Interactions", icon: AlertTriangle },
    { id: "strong", label: "Strong Evidence", icon: CheckCircle },
  ];

  return (
    <div className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 py-4"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity md:hidden"
              style={{ color: "#14B8A6" }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <VyvataLogo size={16} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                EVIDENCE LIBRARY
              </span>
            </div>
          </div>
          <PractitionerNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 py-8 max-w-5xl mx-auto space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <h1
            className="text-3xl font-black"
            style={{ color: "#C9D6DF", fontFamily: "Montserrat, sans-serif" }}
          >
            Clinical Evidence Library
          </h1>
          <p style={{ color: "#7A90A8" }}>
            Evidence-based summaries for top ingredients, protocols, and interactions. All references include PubMed citations.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#7A90A8" }}
            />
            <input
              type="text"
              placeholder="Search evidence summaries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "rgba(17,32,64,0.4)",
                border: "1px solid rgba(201,214,223,0.08)",
                color: "#C9D6DF",
              }}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: filter === id ? "rgba(20,184,166,0.15)" : "rgba(17,32,64,0.4)",
                  color: filter === id ? "#14B8A6" : "#7A90A8",
                  border: `1px solid ${filter === id ? "rgba(20,184,166,0.3)" : "rgba(201,214,223,0.08)"}`,
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "#7A90A8" }}>
            {filteredSummaries.length} {filteredSummaries.length === 1 ? "summary" : "summaries"}
          </p>
        </div>

        {/* Evidence Cards */}
        <div className="space-y-4">
          {filteredSummaries.map((summary) => (
            <EvidenceSummaryCard key={summary.id} summary={summary} />
          ))}
        </div>

        {filteredSummaries.length === 0 && (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
          >
            <p className="text-sm" style={{ color: "#7A90A8" }}>
              No evidence summaries match your search.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
