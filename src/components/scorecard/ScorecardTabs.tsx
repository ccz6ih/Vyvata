"use client";

// Scorecard tabs shell — client component that owns the active-tab state.
// Tab content is passed in as children (server-rendered), so only the
// selector UI is client. Hides inactive content via CSS rather than
// unmounting, which keeps layout stable during rapid switches.

import { useState, type ReactNode } from "react";
import { FileText, Microscope, Beaker, Database } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "evidence", label: "Evidence", icon: Microscope },
  { id: "formulation", label: "Formulation", icon: Beaker },
  { id: "sources", label: "Data Sources", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ScorecardTabs({
  overview,
  evidence,
  formulation,
  sources,
}: {
  overview: ReactNode;
  evidence: ReactNode;
  formulation: ReactNode;
  sources: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("overview");

  const content: Record<TabId, ReactNode> = {
    overview,
    evidence,
    formulation,
    sources,
  };

  return (
    <section className="space-y-4">
      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{
          background: "rgba(17,32,64,0.4)",
          border: "1px solid rgba(201,214,223,0.08)",
        }}
        role="tablist"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              role="tab"
              aria-selected={isActive}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
              style={{
                background: isActive ? "rgba(20,184,166,0.15)" : "transparent",
                color: isActive ? "#14B8A6" : "#7A90A8",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels — render all, hide inactive. Keeps scroll position stable
          on tab change and avoids reflow jitter from remounting content. */}
      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          hidden={active !== t.id}
          style={{ display: active === t.id ? "block" : "none" }}
        >
          {content[t.id]}
        </div>
      ))}
    </section>
  );
}
