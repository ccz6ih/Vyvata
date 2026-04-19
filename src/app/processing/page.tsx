"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Play } from "lucide-react";
import { getOrCreateSessionId } from "@/lib/session";
import type { Goal } from "@/types";
import { VyvataLogo } from "@/components/VyvataLogo";
import InvitedByBanner from "@/components/InvitedByBanner";

const STEPS = [
  { label: "Parsing your input...",                    duration: 700 },
  { label: "Matching to ingredient intelligence...",   duration: 800 },
  { label: "Cross-referencing clinical evidence...",   duration: 1000 },
  { label: "Checking interactions & redundancies...",  duration: 900 },
  { label: "Analyzing goal alignment...",              duration: 700 },
  { label: "Building your personalized protocol...",   duration: 800 },
];

export default function ProcessingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const rawInput = sessionStorage.getItem("sr_raw_input");
    const goalsRaw = sessionStorage.getItem("sr_goals");

    if (!rawInput || !goalsRaw) {
      router.replace("/");
      return;
    }

    const goals = JSON.parse(goalsRaw) as Goal[];
    const sessionId = getOrCreateSessionId();

    let stepIndex = 0;
    let elapsed = 0;
    const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0);

    const animateSteps = () => {
      if (stepIndex < STEPS.length) {
        setCurrentStep(stepIndex);
        const stepDuration = STEPS[stepIndex].duration;
        setTimeout(() => {
          stepIndex++;
          elapsed += stepDuration;
          setProgress(Math.round((elapsed / totalDuration) * 85));
          animateSteps();
        }, stepDuration);
      }
    };
    animateSteps();

    const inviteToken =
      (typeof window !== "undefined" && sessionStorage.getItem("vv_invite_token")) || null;

    fetch("/api/parse-stack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput, goals, sessionId, inviteToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to analyze");
        }
        return res.json();
      })
      .then((data) => {
        setProgress(100);
        sessionStorage.setItem("sr_audit_result", JSON.stringify(data));

        // Store stack scores if available
        if (data.stackScores) {
          sessionStorage.setItem("vv_stack_scores", JSON.stringify(data.stackScores));
        }

        // Invite token was consumed server-side — clear it so subsequent
        // audits in the same tab aren't re-attached to the practitioner.
        if (inviteToken) sessionStorage.removeItem("vv_invite_token");
        
        // Store DSLD products if enriched
        if (data.dsldProducts && data.dsldProducts.length > 0) {
          sessionStorage.setItem("sr_dsld_products", JSON.stringify(data.dsldProducts));
        }
        
        setTimeout(() => {
          router.push(`/protocol/${data.publicSlug}?new=1`);
        }, 600);
      })
      .catch((err) => {
        setError(err.message || "Something went wrong. Please try again.");
      });
  }, [router]);

  return (
    <main
      className="min-h-dvh flex flex-col items-center px-6"
      style={{ background: "#0B1F3B" }}
    >
      <InvitedByBanner />
      <div className="flex-1 flex flex-col items-center justify-center w-full">
      <div className="max-w-sm w-full space-y-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <VyvataLogo size={40} />
          <span
            className="font-bold text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Vyvata
          </span>
        </div>

        {error ? (
          <div className="text-center space-y-4">
            <p
              className="text-sm"
              style={{ color: "#F87171", fontFamily: "Inter, sans-serif" }}
            >
              {error}
            </p>
            <button
              onClick={() => router.push("/")}
              className="text-sm underline"
              style={{ color: "#14B8A6" }}
            >
              Start over
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Progress bar */}
            <div className="space-y-2.5">
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(201,214,223,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #0F766E, #14B8A6)",
                  }}
                />
              </div>
              <div
                className="flex justify-between text-xs"
                style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
              >
                <span>Analyzing</span>
                <span>{progress}%</span>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-center gap-3 text-sm transition-all duration-300"
                  style={{
                    color: i < currentStep
                      ? "rgba(201,214,223,0.3)"
                      : i === currentStep
                      ? "#14B8A6"
                      : "rgba(201,214,223,0.15)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <span className="w-4 shrink-0 flex items-center justify-center">
                    {i < currentStep ? (
                      <Check size={12} strokeWidth={2.5} />
                    ) : i === currentStep ? (
                      <Play size={10} strokeWidth={2.5} fill="currentColor" />
                    ) : (
                      <span className="w-1 h-1 rounded-full" style={{ background: "currentColor" }} />
                    )}
                  </span>
                  <span
                    style={{
                      animation: i === currentStep ? "pulse-dot 1.4s ease-in-out infinite" : "none",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Pulse dots */}
            {currentStep < STEPS.length && (
              <div className="flex justify-center gap-1.5 pt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full pulse-dot"
                    style={{
                      background: "#14B8A6",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
