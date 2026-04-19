"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Goal } from "@/types";
import { VyvataLogo } from "@/components/VyvataLogo";
import InvitedByBanner from "@/components/InvitedByBanner";

type GoalOption = {
  id: Goal;
  label: string;
  icon: string;
};

const GOALS: GoalOption[] = [
  { id: "sleep",        label: "Sleep & Recovery",       icon: "/icons/Get Enough Sleep.svg" },
  { id: "energy",       label: "Energy & Vitality",      icon: "/icons/Exercise Regularly.svg" },
  { id: "focus",        label: "Focus & Cognition",      icon: "/icons/Read a Good Book.svg" },
  { id: "inflammation", label: "Reduce Inflammation",    icon: "/icons/Detoxify Your Body.svg" },
  { id: "longevity",    label: "Longevity & Healthspan", icon: "/icons/Healthy Diet.svg" },
  { id: "muscle",       label: "Strength & Muscle",      icon: "/icons/Dumbbell Exercises.svg" },
  { id: "recovery",     label: "Athletic Recovery",      icon: "/icons/Get a Massage.svg" },
];

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
      <InvitedByBanner />
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

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto w-full">
        <div className="w-full space-y-8">
          <div className="flex justify-center opacity-90">
            <Image
              src="/icons/Set Your Goals.svg"
              alt=""
              width={200}
              height={200}
              priority
              className="pointer-events-none select-none"
            />
          </div>
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
                  <img 
                    src={goal.icon} 
                    alt={goal.label}
                    className="shrink-0"
                    style={{ 
                      width: "24px", 
                      height: "24px",
                      opacity: isDisabled ? 0.4 : 1,
                      filter: isSelected ? "brightness(0) saturate(100%) invert(70%) sepia(35%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(90%)" : "none"
                    }}
                  />
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
