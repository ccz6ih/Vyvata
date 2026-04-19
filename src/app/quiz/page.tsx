"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight,
} from "lucide-react";
import { getOrCreateSessionId } from "@/lib/session";
import { VyvataLogo } from "@/components/VyvataLogo";
import InvitedByBanner from "@/components/InvitedByBanner";

// ── Types ─────────────────────────────────────────────────────────────────────
type SingleOption = { type: "single"; key: string; label: string; icon?: string };
type MultiOption  = { type: "multi";  key: string; label: string; icon?: string };
type ScaleOption  = { type: "scale";  key: string; label: string };
type TextOption   = { type: "text";   placeholder: string };

type QuizStep = {
  id: string;
  phase: string;
  question: string;
  subtext?: string;
  input: SingleOption | MultiOption | ScaleOption | TextOption;
};

// ── Quiz definition ───────────────────────────────────────────────────────────
const STEPS: QuizStep[] = [
  // ── Phase 1: Goals
  {
    id: "primary_goal",
    phase: "Your Goals",
    question: "What's your single most important health goal right now?",
    subtext: "We'll build your protocol around this first.",
    input: {
      type: "single",
      key: "primary_goal",
      label: "",
    } as unknown as SingleOption,
  },
  {
    id: "secondary_goals",
    phase: "Your Goals",
    question: "Any other areas you want to optimize?",
    subtext: "Select all that apply. We'll layer these into your protocol.",
    input: {
      type: "multi",
      key: "secondary_goals",
      label: "",
    } as unknown as MultiOption,
  },

  // ── Phase 2: Sleep
  {
    id: "sleep_hours",
    phase: "Sleep",
    question: "On average, how many hours of sleep do you get per night?",
    input: {
      type: "single",
      key: "sleep_hours",
      label: "",
    } as unknown as SingleOption,
  },
  {
    id: "sleep_quality",
    phase: "Sleep",
    question: "How would you rate your sleep quality?",
    subtext: "Think about how rested you feel when you wake up.",
    input: {
      type: "scale",
      key: "sleep_quality",
      label: "",
    } as unknown as ScaleOption,
  },

  // ── Phase 3: Energy
  {
    id: "energy_pattern",
    phase: "Energy",
    question: "How does your energy typically behave throughout the day?",
    input: {
      type: "single",
      key: "energy_pattern",
      label: "",
    } as unknown as SingleOption,
  },
  {
    id: "energy_level",
    phase: "Energy",
    question: "How's your overall energy level been lately?",
    input: {
      type: "scale",
      key: "energy_level",
      label: "",
    } as unknown as ScaleOption,
  },

  // ── Phase 4: Focus & cognition
  {
    id: "focus_issues",
    phase: "Focus",
    question: "Which cognitive challenges do you experience most?",
    subtext: "Select everything that feels relevant.",
    input: {
      type: "multi",
      key: "focus_issues",
      label: "",
    } as unknown as MultiOption,
  },
  {
    id: "focus_level",
    phase: "Focus",
    question: "On your best days vs. worst days — how wide is the gap in your mental clarity?",
    input: {
      type: "scale",
      key: "focus_level",
      label: "",
    } as unknown as ScaleOption,
  },

  // ── Phase 5: Lifestyle context
  {
    id: "activity_level",
    phase: "Lifestyle",
    question: "How physically active are you?",
    input: {
      type: "single",
      key: "activity_level",
      label: "",
    } as unknown as SingleOption,
  },
  {
    id: "diet_type",
    phase: "Lifestyle",
    question: "How would you describe your diet?",
    input: {
      type: "single",
      key: "diet_type",
      label: "",
    } as unknown as SingleOption,
  },
  {
    id: "age_range",
    phase: "Lifestyle",
    question: "What's your age range?",
    subtext: "Age affects absorption rates, hormone levels, and optimal dosing.",
    input: {
      type: "single",
      key: "age_range",
      label: "",
    } as unknown as SingleOption,
  },

  // ── Phase 6: Health context
  {
    id: "health_conditions",
    phase: "Health Context",
    question: "Do any of these apply to you?",
    subtext: "This helps us flag interactions and avoid contraindicated ingredients.",
    input: {
      type: "multi",
      key: "health_conditions",
      label: "",
    } as unknown as MultiOption,
  },

  // ── Phase 7: Current Supplement Stack (NEW)
  {
    id: "supplements_usage",
    phase: "Your Stack",
    question: "Are you currently taking any supplements?",
    subtext: "This helps us analyze your stack quality and identify gaps.",
    input: {
      type: "single",
      key: "supplements_usage",
      label: "",
    } as unknown as SingleOption,
  },
  {
    id: "supplements_specific",
    phase: "Your Stack",
    question: "Which supplements are you currently taking?",
    subtext: "Select all that apply. Don't see yours? You can add it in the next step.",
    input: {
      type: "multi",
      key: "supplements_specific",
      label: "",
    } as unknown as MultiOption,
  },
  {
    id: "supplements_current",
    phase: "Your Stack",
    question: "Any other supplements not listed?",
    subtext: "Enter them here with dosages (optional).",
    input: {
      type: "text",
      placeholder: "e.g. Magnesium 400mg, Vitamin D 5000 IU, Ashwagandha 600mg...",
    },
  },
];

// ── Options per step ──────────────────────────────────────────────────────────
const OPTIONS: Record<string, { value: string; label: string; icon?: string }[]> = {
  primary_goal: [
    { value: "sleep",        label: "Better sleep",           icon: "/icons/Get Enough Sleep.svg" },
    { value: "energy",       label: "More energy",            icon: "/icons/Exercise Regularly.svg" },
    { value: "focus",        label: "Sharper focus",          icon: "/icons/Read a Good Book.svg" },
    { value: "longevity",    label: "Longevity & healthspan", icon: "/icons/Healthy Diet.svg" },
    { value: "performance",  label: "Athletic performance",   icon: "/icons/Start Running.svg" },
    { value: "inflammation", label: "Less inflammation",      icon: "/icons/Detoxify Your Body.svg" },
  ],
  secondary_goals: [
    { value: "sleep",        label: "Sleep quality",      icon: "/icons/Get Enough Sleep.svg" },
    { value: "energy",       label: "Sustained energy",   icon: "/icons/Stay Fit.svg" },
    { value: "focus",        label: "Mental clarity",     icon: "/icons/Read a Good Book.svg" },
    { value: "longevity",    label: "Longevity",          icon: "/icons/Healthy Diet.svg" },
    { value: "muscle",       label: "Strength & muscle",  icon: "/icons/Dumbbell Exercises.svg" },
    { value: "recovery",     label: "Recovery speed",     icon: "/icons/Get a Massage.svg" },
    { value: "stress",       label: "Stress resilience",  icon: "/icons/Meditate.svg" },
    { value: "immunity",     label: "Immune support",     icon: "/icons/Vitamins.svg" },
    { value: "gut",          label: "Gut health",         icon: "/icons/Eat Healthy Food.svg" },
  ],
  sleep_hours: [
    { value: "under5",  label: "Under 5 hours" },
    { value: "5to6",    label: "5–6 hours" },
    { value: "6to7",    label: "6–7 hours" },
    { value: "7to8",    label: "7–8 hours" },
    { value: "over8",   label: "8+ hours" },
  ],
  sleep_quality: [
    { value: "1", label: "Terrible" },
    { value: "2", label: "Poor" },
    { value: "3", label: "Fair" },
    { value: "4", label: "Good" },
    { value: "5", label: "Excellent" },
  ],
  energy_pattern: [
    { value: "crash_morning",   label: "Struggle to wake up, slow mornings" },
    { value: "crash_afternoon", label: "Strong morning, hard crash after lunch" },
    { value: "inconsistent",    label: "Unpredictable — good days and bad days" },
    { value: "flat",            label: "Consistently low all day" },
    { value: "steady",          label: "Generally steady and reliable" },
  ],
  energy_level: [
    { value: "1", label: "Exhausted" },
    { value: "2", label: "Low" },
    { value: "3", label: "Moderate" },
    { value: "4", label: "Good" },
    { value: "5", label: "High energy" },
  ],
  focus_issues: [
    { value: "brain_fog",       label: "Brain fog" },
    { value: "distractibility", label: "Easily distracted" },
    { value: "memory",          label: "Memory lapses" },
    { value: "task_switching",  label: "Hard to switch tasks" },
    { value: "motivation",      label: "Low motivation" },
    { value: "word_finding",    label: "Slow word recall" },
    { value: "none",            label: "None of the above" },
  ],
  focus_level: [
    { value: "1", label: "Very wide gap" },
    { value: "2", label: "Noticeable gap" },
    { value: "3", label: "Moderate gap" },
    { value: "4", label: "Small gap" },
    { value: "5", label: "Very consistent" },
  ],
  activity_level: [
    { value: "sedentary",  label: "Sedentary — mostly desk work" },
    { value: "light",      label: "Light — walks, casual movement" },
    { value: "moderate",   label: "Moderate — 3–4 workouts/week" },
    { value: "active",     label: "Active — 5+ workouts/week" },
    { value: "athlete",    label: "Athlete-level training" },
  ],
  diet_type: [
    { value: "omnivore",   label: "Omnivore" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "vegan",      label: "Vegan" },
    { value: "keto",       label: "Keto / Low carb" },
    { value: "paleo",      label: "Paleo" },
    { value: "other",      label: "Something else" },
  ],
  age_range: [
    { value: "18-24", label: "18–24" },
    { value: "25-34", label: "25–34" },
    { value: "35-44", label: "35–44" },
    { value: "45-54", label: "45–54" },
    { value: "55-64", label: "55–64" },
    { value: "65+",   label: "65+" },
  ],
  health_conditions: [
    { value: "thyroid",      label: "Thyroid condition" },
    { value: "diabetes",     label: "Diabetes / blood sugar issues" },
    { value: "hypertension", label: "High blood pressure" },
    { value: "anxiety",      label: "Anxiety / panic" },
    { value: "depression",   label: "Depression" },
    { value: "ibs",          label: "IBS / gut issues" },
    { value: "autoimmune",   label: "Autoimmune condition" },
    { value: "none",         label: "None of the above" },
  ],
  supplements_usage: [
    { value: "yes", label: "Yes, I take supplements regularly" },
    { value: "some", label: "Yes, a few occasionally" },
    { value: "no", label: "No, not currently" },
  ],
  // Top 50 most common supplements from our 452-ingredient database
  supplements_specific: [
    { value: "Vitamin D", label: "Vitamin D" },
    { value: "Magnesium", label: "Magnesium" },
    { value: "Omega-3", label: "Omega-3 / Fish Oil" },
    { value: "Vitamin C", label: "Vitamin C" },
    { value: "Zinc", label: "Zinc" },
    { value: "Creatine", label: "Creatine" },
    { value: "Ashwagandha", label: "Ashwagandha" },
    { value: "L-Theanine", label: "L-Theanine" },
    { value: "Rhodiola Rosea", label: "Rhodiola" },
    { value: "Bacopa Monnieri", label: "Bacopa" },
    { value: "Lion's Mane", label: "Lion's Mane" },
    { value: "Melatonin", label: "Melatonin" },
    { value: "Curcumin", label: "Curcumin / Turmeric" },
    { value: "NAC", label: "NAC (N-Acetyl Cysteine)" },
    { value: "Probiotic", label: "Probiotics" },
    { value: "Protein Powder", label: "Protein Powder" },
    { value: "Caffeine", label: "Caffeine" },
    { value: "Alpha-GPC", label: "Alpha-GPC" },
    { value: "CoQ10", label: "CoQ10" },
    { value: "NMN", label: "NMN" },
    { value: "Resveratrol", label: "Resveratrol" },
    { value: "Quercetin", label: "Quercetin" },
    { value: "Vitamin B12", label: "Vitamin B12" },
    { value: "Vitamin K2", label: "Vitamin K2" },
    { value: "Collagen", label: "Collagen" },
    { value: "Electrolytes", label: "Electrolytes" },
    { value: "GABA", label: "GABA" },
    { value: "5-HTP", label: "5-HTP" },
    { value: "Glycine", label: "Glycine" },
    { value: "Taurine", label: "Taurine" },
    { value: "Beta-Alanine", label: "Beta-Alanine" },
    { value: "Citrulline", label: "L-Citrulline" },
    { value: "Tyrosine", label: "L-Tyrosine" },
    { value: "Glutamine", label: "L-Glutamine" },
    { value: "BCAAs", label: "BCAAs" },
    { value: "Cordyceps", label: "Cordyceps" },
    { value: "Reishi", label: "Reishi" },
    { value: "Chaga", label: "Chaga" },
    { value: "Berberine", label: "Berberine" },
    { value: "Digestive Enzymes", label: "Digestive Enzymes" },
    { value: "Vitamin A", label: "Vitamin A" },
    { value: "Vitamin E", label: "Vitamin E" },
    { value: "Iron", label: "Iron" },
    { value: "Calcium", label: "Calcium" },
    { value: "Selenium", label: "Selenium" },
    { value: "Iodine", label: "Iodine" },
    { value: "Chromium", label: "Chromium" },
    { value: "PQQ", label: "PQQ" },
    { value: "Spermidine", label: "Spermidine" },
    { value: "Fisetin", label: "Fisetin" },
  ],
};

// ── Scale labels ──────────────────────────────────────────────────────────────
const SCALE_LABELS: Record<string, { lo: string; hi: string }> = {
  sleep_quality: { lo: "Terrible", hi: "Excellent" },
  energy_level:  { lo: "Exhausted", hi: "High energy" },
  focus_level:   { lo: "Huge gap", hi: "Very consistent" },
};

// ── Protocol matching ─────────────────────────────────────────────────────────
function matchProtocol(answers: Record<string, unknown>): string {
  const primary = answers.primary_goal as string;
  const secondary = (answers.secondary_goals as string[] | undefined) || [];
  const all = [primary, ...secondary];

  if (all.includes("sleep") || all.includes("recovery")) return "deep-sleep-recovery";
  if (all.includes("focus") || all.includes("energy"))   return "cognitive-performance";
  if (all.includes("performance") || all.includes("muscle")) return "athletic-performance";
  if (all.includes("longevity") || all.includes("inflammation")) return "longevity-foundation";
  return "cognitive-performance"; // default
}

// ── Phase map ─────────────────────────────────────────────────────────────────
const PHASES = ["Your Goals", "Sleep", "Energy", "Focus", "Lifestyle", "Health Context", "Your Stack"];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function QuizPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [textDraft, setTextDraft] = useState("");
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const progress = ((stepIndex) / STEPS.length) * 100;
  const isLast = stepIndex === STEPS.length - 1;

  // Current answer
  const currentAnswer = answers[step.id];
  const hasAnswer =
    step.input.type === "text"
      ? textDraft.trim().length > 0
      : step.input.type === "multi"
      ? Array.isArray(currentAnswer) && (currentAnswer as string[]).length > 0
      : currentAnswer !== undefined;

  // Restore text draft when navigating back
  useEffect(() => {
    if (step.input.type === "text") {
      setTextDraft((answers[step.id] as string) || "");
    }
  }, [stepIndex, step.id, step.input.type, answers]);

  const navigate = useCallback(
    (dir: "forward" | "back") => {
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        if (dir === "forward") setStepIndex((i) => i + 1);
        else setStepIndex((i) => i - 1);
        setAnimating(false);
      }, 220);
    },
    []
  );

  const handleSingle = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
    // Auto-advance after brief delay for satisfying feel
    setTimeout(() => navigate("forward"), 280);
  };

  const handleMultiToggle = (value: string) => {
    setAnswers((prev) => {
      const current = (prev[step.id] as string[]) || [];
      // "none" is exclusive
      if (value === "none") return { ...prev, [step.id]: ["none"] };
      const withoutNone = current.filter((v) => v !== "none");
      const next = withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value];
      return { ...prev, [step.id]: next };
    });
  };

  const handleScale = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
    setTimeout(() => navigate("forward"), 300);
  };

  const handleNext = () => {
    if (step.input.type === "text") {
      setAnswers((prev) => ({ ...prev, [step.id]: textDraft }));
    }
    if (isLast) {
      handleSubmit();
    } else {
      navigate("forward");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const finalAnswers = { ...answers };
    if (step.input.type === "text") {
      finalAnswers[step.id] = textDraft;
    }

    const sessionId = getOrCreateSessionId();
    const protocolSlug = matchProtocol(finalAnswers);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers: finalAnswers, protocolSlug }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Submission failed");
      }

      const result = await res.json();

      // Store quiz context so processing + protocol pages can use it
      sessionStorage.setItem("vv_quiz_answers", JSON.stringify(finalAnswers));
      sessionStorage.setItem("vv_protocol_slug", protocolSlug);
      
      // Store stack scores if available
      if (result.stackScores) {
        sessionStorage.setItem("vv_stack_scores", JSON.stringify(result.stackScores));
      }

      // If user entered a current stack, pre-fill the processing flow
      const currentSupps = (finalAnswers.supplements_current as string) || "";
      const specificSupps = (finalAnswers.supplements_specific as string[]) || [];
      
      if (currentSupps.trim() || specificSupps.length > 0) {
        // Combine specific + text input
        const allSupps = specificSupps.length > 0
          ? specificSupps.join(", ") + (currentSupps.trim() ? `, ${currentSupps}` : "")
          : currentSupps;
        
        sessionStorage.setItem("sr_raw_input", allSupps);
        // Map primary goal to goals array format
        const goals = [
          finalAnswers.primary_goal as string,
          ...((finalAnswers.secondary_goals as string[]) || []).slice(0, 2),
        ];
        sessionStorage.setItem("sr_goals", JSON.stringify(goals));
        router.push("/processing");
      } else {
        // No stack — go straight to protocol result
        router.push(`/protocol/${protocolSlug}?from=quiz`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  const phaseIndex = PHASES.indexOf(step.phase);
  const opts = OPTIONS[step.id] || [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}
    >
      <InvitedByBanner />
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: "rgba(11,31,59,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}>
        {/* Back button */}
        <button
          onClick={() => stepIndex > 0 ? navigate("back") : router.push("/")}
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-100 opacity-60"
          style={{ color: "#C9D6DF" }}
          aria-label="Go back"
        >
          <ArrowLeft size={15} />
          <span>{stepIndex > 0 ? "Back" : "Home"}</span>
        </button>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-2">
          <VyvataLogo size={22} />
          <span className="text-sm font-bold tracking-widest text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            VYVATA
          </span>
        </div>

        {/* Step counter */}
        <div className="text-xs tabular-nums" style={{ color: "#7A90A8" }}>
          {stepIndex + 1} / {STEPS.length}
        </div>
      </header>

      {/* ── Progress rail ── */}
      <div className="h-0.5 w-full" style={{ background: "rgba(201,214,223,0.08)" }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #0F766E, #14B8A6)",
          }}
        />
      </div>

      {/* ── Phase pills ── */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-1 overflow-x-auto no-scrollbar">
        {PHASES.map((phase, i) => {
          const done = i < phaseIndex;
          const active = i === phaseIndex;
          return (
            <div
              key={phase}
              className="flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all"
              style={{
                background: active
                  ? "rgba(20,184,166,0.15)"
                  : done
                  ? "rgba(20,184,166,0.08)"
                  : "rgba(255,255,255,0.04)",
                border: active
                  ? "1px solid rgba(20,184,166,0.4)"
                  : done
                  ? "1px solid rgba(20,184,166,0.2)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: active ? "#14B8A6" : done ? "#0F766E" : "#4a6080",
              }}
            >
              {done && <Check size={10} strokeWidth={3} />}
              {phase}
            </div>
          );
        })}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col items-center justify-start px-5 pt-8 pb-28 max-w-lg mx-auto w-full">
        {/* Question block */}
        <div
          ref={containerRef}
          className="w-full"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? direction === "forward" ? "translateY(12px)" : "translateY(-12px)"
              : "translateY(0)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}
        >
          {/* Phase label */}
          <p className="text-xs font-semibold tracking-widest uppercase mb-3"
            style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
            {step.phase}
          </p>

          {/* Question */}
          <h1 className="text-2xl font-bold leading-tight mb-2 text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}>
            {step.question}
          </h1>

          {/* Subtext */}
          {step.subtext && (
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "#7A90A8" }}>
              {step.subtext}
            </p>
          )}
          {!step.subtext && <div className="mb-6" />}

          {/* ── Input: Single choice ── */}
          {step.input.type === "single" && (
            <div className="space-y-2.5">
              {opts.map((opt) => {
                const selected = currentAnswer === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSingle(opt.value)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: selected
                        ? "rgba(20,184,166,0.15)"
                        : "rgba(255,255,255,0.04)",
                      border: selected
                        ? "1px solid rgba(20,184,166,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      color: selected ? "#fff" : "#C9D6DF",
                    }}
                    data-testid={`option-${opt.value}`}
                  >
                    {opt.icon && (
                      <img src={opt.icon} alt="" className="w-6 h-6 shrink-0" style={{ filter: selected ? "brightness(0) saturate(100%) invert(70%) sepia(35%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(90%)" : "brightness(0.8)" }} />
                    )}
                    <span className="flex-1 text-sm font-medium">{opt.label}</span>
                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: selected ? "#14B8A6" : "rgba(201,214,223,0.2)",
                        background: selected ? "#14B8A6" : "transparent",
                      }}
                    >
                      {selected && <Check size={9} strokeWidth={3} color="#0B1F3B" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Input: Multi-select ── */}
          {step.input.type === "multi" && (
            <div className="space-y-2.5">
              {opts.map((opt) => {
                const selected = Array.isArray(currentAnswer) && (currentAnswer as string[]).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMultiToggle(opt.value)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: selected
                        ? "rgba(20,184,166,0.15)"
                        : "rgba(255,255,255,0.04)",
                      border: selected
                        ? "1px solid rgba(20,184,166,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      color: selected ? "#fff" : "#C9D6DF",
                    }}
                    data-testid={`multi-${opt.value}`}
                  >
                    {opt.icon && (
                      <img src={opt.icon} alt="" className="w-6 h-6 shrink-0" style={{ filter: selected ? "brightness(0) saturate(100%) invert(70%) sepia(35%) saturate(1000%) hue-rotate(130deg) brightness(95%) contrast(90%)" : "brightness(0.8)" }} />
                    )}
                    <span className="flex-1 text-sm font-medium">{opt.label}</span>
                    <div
                      className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: selected ? "#14B8A6" : "rgba(201,214,223,0.2)",
                        background: selected ? "#14B8A6" : "transparent",
                      }}
                    >
                      {selected && <Check size={9} strokeWidth={3} color="#0B1F3B" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Input: Scale ── */}
          {step.input.type === "scale" && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2.5">
                {["1","2","3","4","5"].map((val) => {
                  const selected = currentAnswer === val;
                  const filled = parseInt(currentAnswer as string || "0") >= parseInt(val);
                  return (
                    <button
                      key={val}
                      onClick={() => handleScale(val)}
                      className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all duration-150"
                      style={{
                        background: selected
                          ? "rgba(20,184,166,0.2)"
                          : filled
                          ? "rgba(20,184,166,0.07)"
                          : "rgba(255,255,255,0.04)",
                        border: selected
                          ? "1px solid rgba(20,184,166,0.6)"
                          : "1px solid rgba(255,255,255,0.07)",
                      }}
                      data-testid={`scale-${val}`}
                    >
                      <span
                        className="text-xl font-bold"
                        style={{ color: selected ? "#14B8A6" : filled ? "#0F766E" : "#2E4060" }}
                      >
                        {val}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Scale legend */}
              {SCALE_LABELS[step.id] && (
                <div className="flex justify-between text-xs" style={{ color: "#4a6080" }}>
                  <span>{SCALE_LABELS[step.id].lo}</span>
                  <span>{SCALE_LABELS[step.id].hi}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Input: Text area ── */}
          {step.input.type === "text" && (
            <div className="space-y-3">
              <textarea
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder={(step.input as TextOption).placeholder}
                rows={4}
                className="w-full rounded-xl px-4 py-3.5 text-sm resize-none outline-none transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: textDraft
                    ? "1px solid rgba(20,184,166,0.45)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: "#E8F0F5",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.6,
                }}
                data-testid="input-supplements"
              />
              <p className="text-xs" style={{ color: "#4a6080" }}>
                Don't have a current stack? Leave blank — we'll build one from scratch.
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <p className="mt-4 text-sm text-center" style={{ color: "#F87171" }}>{error}</p>
          )}
        </div>
      </main>

      {/* ── Bottom action bar ── */}
      <div
        className="fixed bottom-0 inset-x-0 px-5 py-4 flex items-center gap-3"
        style={{
          background: "rgba(11,31,59,0.96)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="max-w-lg mx-auto w-full flex items-center gap-3">
          {/* Skip / back for multi + text */}
          {(step.input.type === "multi" || step.input.type === "text") && (
            <button
              onClick={() => {
                if (step.input.type === "text") {
                  setAnswers((prev) => ({ ...prev, [step.id]: textDraft }));
                }
                if (isLast) handleSubmit();
                else navigate("forward");
              }}
              className="text-sm px-4 py-3 rounded-xl transition-opacity hover:opacity-80"
              style={{ color: "#7A90A8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="button-skip"
            >
              Skip
            </button>
          )}

          {/* Continue / Submit */}
          {(step.input.type === "multi" || step.input.type === "text") && (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: hasAnswer
                  ? "linear-gradient(135deg, #14B8A6, #0F766E)"
                  : "rgba(255,255,255,0.06)",
                color: hasAnswer ? "#fff" : "#4a6080",
                border: "none",
                cursor: hasAnswer && !submitting ? "pointer" : "default",
                boxShadow: hasAnswer ? "0 0 24px rgba(20,184,166,0.25)" : "none",
              }}
              data-testid="button-continue"
            >
              {submitting ? (
                <span>Building your protocol...</span>
              ) : isLast ? (
                <>
                  <span>Build my protocol</span>
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}

          {/* Final submit for scale that hasn't auto-advanced (edge case) */}
          {step.input.type === "scale" && isLast && hasAnswer && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm"
              style={{
                background: "linear-gradient(135deg, #14B8A6, #0F766E)",
                color: "#fff",
                boxShadow: "0 0 24px rgba(20,184,166,0.25)",
              }}
            >
              {submitting ? "Building..." : "Build my protocol"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
