"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronDown, X } from "lucide-react";

interface AlertRow {
  patientLinkId: string;
  patientLabel: string;
  auditSlug: string | null;
  flagId: string;
  flagSource: string;
  flagSeverity: string;
  flagSubject: string;
  flagIssuedDate: string | null;
  matchedBrand: string;
}

const SOURCE_LABEL: Record<string, string> = {
  openfda_recall: "openFDA Recall",
  fda_warning_letter: "FDA Warning Letter",
  caers: "CAERS Adverse Events",
  import_alert: "Import Alert",
};

/**
 * Dashboard banner that only renders if the practitioner has patients whose
 * stacks reference a flagged product/manufacturer. Collapsible — a small
 * badge-only version when collapsed, expanded list on click.
 */
export default function ComplianceAlertBanner() {
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/practitioner/compliance-alerts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setAlerts(data.alerts ?? []);
        setPatientCount(data.flaggedPatientCount ?? 0);
      })
      .catch(() => {});
  }, []);

  if (dismissed || !alerts || alerts.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.3)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 text-left"
      >
        <AlertTriangle size={16} style={{ color: "#F87171" }} className="shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "#FCA5A5", fontFamily: "Montserrat, sans-serif" }}>
            {patientCount} patient{patientCount === 1 ? "" : "s"} on flagged products
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#C9D6DF" }}>
            {alerts.length} FDA enforcement match{alerts.length === 1 ? "" : "es"} across your panel. Review before your next touchpoint.
          </p>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: "#FCA5A5",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="p-1 rounded hover:bg-white/5 shrink-0"
          style={{ color: "#7A90A8" }}
          aria-label="Dismiss banner"
        >
          <X size={13} />
        </button>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {alerts.map((a, i) => (
            <div
              key={`${a.patientLinkId}-${a.flagId}-${i}`}
              className="rounded-xl px-3 py-2.5 flex items-start gap-3"
              style={{ background: "rgba(11,31,59,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold uppercase tracking-widest">
                  <span style={{ color: "#F87171" }}>{a.flagSeverity}</span>
                  <span style={{ color: "#4a6080" }}>·</span>
                  <span style={{ color: "#7A90A8" }}>{SOURCE_LABEL[a.flagSource] ?? a.flagSource}</span>
                  {a.flagIssuedDate && (
                    <>
                      <span style={{ color: "#4a6080" }}>·</span>
                      <span style={{ color: "#7A90A8" }}>{a.flagIssuedDate}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  <strong style={{ color: "#14B8A6" }}>{a.patientLabel}</strong>
                  <span style={{ color: "#7A90A8" }}> has </span>
                  <strong style={{ color: "#FCA5A5" }}>{a.matchedBrand}</strong>
                  <span style={{ color: "#7A90A8" }}> in their stack</span>
                </p>
                <p className="text-xs" style={{ color: "#C9D6DF" }}>
                  {a.flagSubject}
                </p>
              </div>
              <Link
                href={`/practitioner/patients/${a.patientLinkId}`}
                className="flex items-center gap-1 text-xs font-semibold shrink-0"
                style={{ color: "#14B8A6" }}
              >
                Review <ArrowRight size={11} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
