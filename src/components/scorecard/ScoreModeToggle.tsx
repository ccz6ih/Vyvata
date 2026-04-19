"use client";

// Score mode toggle — shows only when a product has both ai_inferred and
// verified scores. The toggle is URL-driven (?mode=ai|verified) so the
// selection is linkable and survives refresh; defaults to verified when
// available (brand-submitted data is the canonical public view).

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Zap, CheckCircle2 } from "lucide-react";

export default function ScoreModeToggle({
  aiIntegrity,
  verifiedIntegrity,
  activeMode,
}: {
  aiIntegrity: number;
  verifiedIntegrity: number;
  activeMode: "ai_inferred" | "verified";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setMode = (mode: "ai_inferred" | "verified") => {
    const next = new URLSearchParams(searchParams.toString());
    if (mode === "verified") next.delete("mode");
    else next.set("mode", "ai");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div
      className="inline-flex rounded-full p-1"
      style={{
        background: "rgba(17,32,64,0.6)",
        border: "1px solid rgba(201,214,223,0.08)",
      }}
    >
      <button
        onClick={() => setMode("ai_inferred")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        style={{
          background: activeMode === "ai_inferred" ? "rgba(96,165,250,0.18)" : "transparent",
          color: activeMode === "ai_inferred" ? "#60a5fa" : "#7A90A8",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        <Zap size={11} />
        AI Score ({aiIntegrity})
      </button>
      <button
        onClick={() => setMode("verified")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        style={{
          background: activeMode === "verified" ? "rgba(20,184,166,0.18)" : "transparent",
          color: activeMode === "verified" ? "#14B8A6" : "#7A90A8",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        <CheckCircle2 size={11} />
        Verified ({verifiedIntegrity})
      </button>
    </div>
  );
}
