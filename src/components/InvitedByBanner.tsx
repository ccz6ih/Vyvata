"use client";

import { useEffect, useState } from "react";
import { Stethoscope, X } from "lucide-react";

export const INVITED_BY_KEY = "vv_invited_by";

interface InvitedBy {
  name: string;
  credential?: string | null;
  organization?: string | null;
}

/**
 * Slim persistent banner shown across the patient-facing flow (quiz → goals →
 * processing → protocol) when the visitor arrived via a practitioner invite.
 * Reinforces the "you're in a trusted context" framing.
 */
export default function InvitedByBanner() {
  const [info, setInfo] = useState<InvitedBy | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(INVITED_BY_KEY);
      if (raw) setInfo(JSON.parse(raw) as InvitedBy);
    } catch {}
  }, []);

  if (!info || dismissed) return null;

  const display = info.credential ? `${info.name}, ${info.credential}` : info.name;

  return (
    <div
      className="w-full px-4 py-2"
      style={{
        background: "linear-gradient(90deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))",
        borderBottom: "1px solid rgba(20,184,166,0.2)",
        color: "#C9D6DF",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center gap-2.5 text-xs">
        <Stethoscope size={12} style={{ color: "#14B8A6" }} />
        <span>
          Connected to <strong style={{ color: "#14B8A6" }}>{display}</strong>
          {info.organization && <span style={{ color: "#7A90A8" }}> · {info.organization}</span>}
          <span style={{ color: "#7A90A8" }}> · your protocol will be shared automatically</span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-auto p-1 -mr-1 rounded hover:bg-white/5"
          aria-label="Dismiss banner"
          style={{ color: "#7A90A8" }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
