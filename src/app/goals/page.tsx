"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Goal, GoalOption } from "@/types";

const GOALS: GoalOption[] = [
  { id: "sleep",        label: "Sleep & Recovery",     emoji: "🌙" },
  { id: "energy",       label: "Energy & Vitality",     emoji: "⚡" },
  { id: "focus",        label: "Focus & Cognition",     emoji: "🧠" },
  { id: "inflammation", label: "Reduce Inflammation",   emoji: "🔥" },
  { id: "longevity",    label: "Longevity & Healthspan", emoji: "🕰️" },
  { id: "muscle",       label: "Strength & Muscle",     emoji: "💪" },
  { id: "recovery",     label: "Athletic Recovery",     emoji: "🔄" },
];

function VyvataLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="#14B8A6" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.5" />
      <path d="M9 9L16 23L23 9" stroke="#14B8A6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.8" fill="#14B8A6" />
      <circle cx="9" cy="9" r="1.5" fill="#14B8A6" opacity="0.7" />
      <circle cx="23" cy="9" r="1.5" fill="#14B8A6" opacity="0.7" />
    </svg>
  );
}

export default function GoalsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Goal[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("sr_raw_input");
      if (!stored) router.replace("/");
    }
  }, [router]);

  const toggle = (goal: Goal) => {
    setSelected((prev) => {
      if (prev.includes(goal)) return prev.filter((g) => g !== goal);
      if (prev.length >= 3) return prev;
      return [...prev, goal];
    });
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sr_goals", JSON.stringify(selected));
    }
    router.push("/processing");
  };

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B" }}>
      {/* Header */}
      <header
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "#7A90A8" }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <VyvataLogo size={22} />
          <span
            className="font-bold text-sm text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Vyvata
          </span>
        </div>

        {/* Step progress */}
        <div className="ml-auto flex gap-1.5 items-center">
          <div className="w-8 h-1 rounded-full" style={{ background: "rgba(20,184,166,0.3)" }} />
          <div className="w-8 h-1 rounded-full" style={{ background: "#14B8A6" }} />
          <div className="w-8 h-1 rounded-full" style={{ background: "rgba(201,214,223,0.15)" }} />
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-xl mx-auto w-full">
        <div className="w-full space-y-8">
          <div className="space-y-2">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
            >
              STEP 2 OF 3
            </p>
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              What are you optimizing for?
            </h1>
            <p className="text-sm" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
              Select up to 3 goals. Your protocol is built around these — different goals
              change what we flag as a problem vs. an opportunity.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {GOALS.map((goal) => {
              const isSelected = selected.includes(goal.id);
              const isDisabled = !isSelected && selected.length >= 3;
              return (
                <button
                  key={goal.id}
                  onClick={() => toggle(goal.id)}
                  disabled={isDisabled}
                  data-testid={`chip-goal-${goal.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-left transition-all duration-150"
                  style={{
                    border: isSelected
                      ? "1px solid #14B8A6"
                      : "1px solid rgba(201,214,223,0.12)",
                    background: isSelected
                      ? "rgba(20,184,166,0.12)"
                      : isDisabled
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(17,32,64,0.6)",
                    color: isSelected ? "#14B8A6" : isDisabled ? "#3A4F6A" : "#C9D6DF",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <span className="text-xl">{goal.emoji}</span>
                  <span className="flex-1">{goal.label}</span>
                  {isSelected && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "#14B8A6" }}
                    >
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5l2 2 4-4" stroke="#0B1F3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selected.length > 0 && (
            <p
              className="text-xs text-center"
              style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
            >
              {selected.length}/3 selected{selected.length === 3 ? " — maximum reached" : ""}
            </p>
          )}

          <Button
            onClick={handleContinue}
            disabled={selected.length === 0}
            className="w-full h-13 font-bold gap-2 rounded-xl btn-teal"
            style={{
              height: "52px",
              fontFamily: "Montserrat, sans-serif",
              fontSize: "15px",
            }}
            data-testid="button-continue-goals"
          >
            Build My Protocol
            <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </main>
  );
}
