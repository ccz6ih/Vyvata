"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight,
  Stethoscope, Building2, ClipboardList, Sparkles
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

// ── Form state shape ──────────────────────────────────────────────────────────
interface RegForm {
  // Step 1 — Identity
  name: string;
  email: string;
  credential: string;
  license_number: string;
  // Step 2 — Practice
  specialty: string;
  organization: string;
  practice_type: string;
  practice_website: string;
  // Step 3 — Use case
  patient_volume: string;
  use_case: string;
}

const EMPTY: RegForm = {
  name: "", email: "", credential: "", license_number: "",
  specialty: "", organization: "", practice_type: "", practice_website: "",
  patient_volume: "", use_case: "",
};

// ── Option lists ──────────────────────────────────────────────────────────────
const CREDENTIALS = ["MD", "DO", "ND", "RD", "PharmD", "DC", "NP", "PA", "RN", "PhD", "Other"];
const SPECIALTIES = [
  "Functional Medicine", "Longevity & Anti-Aging", "Sports Medicine",
  "Internal Medicine", "Integrative Medicine", "Endocrinology",
  "Neurology", "Psychiatry", "Nutrition & Dietetics",
  "Naturopathic Medicine", "Pharmacy", "Other",
];
const PRACTICE_TYPES = [
  { value: "private",     label: "Private Practice" },
  { value: "clinic",      label: "Multi-provider Clinic" },
  { value: "hospital",    label: "Hospital / Health System" },
  { value: "telehealth",  label: "Telehealth Platform" },
  { value: "wellness",    label: "Wellness Center / Spa" },
  { value: "corporate",   label: "Corporate Wellness" },
  { value: "independent", label: "Independent Consultant" },
];
const PATIENT_VOLUMES = [
  { value: "under25",  label: "Under 25 patients / month" },
  { value: "25to100",  label: "25–100 patients / month" },
  { value: "100to500", label: "100–500 patients / month" },
  { value: "over500",  label: "500+ patients / month" },
];

// ── Steps config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Your credentials", icon: Stethoscope },
  { id: 2, label: "Your practice",    icon: Building2 },
  { id: 3, label: "How you'll use it", icon: ClipboardList },
];

// ── Shared field components ───────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7A90A8" }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs" style={{ color: "#4a6080" }}>{hint}</p>}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", required = false
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: value ? "1px solid rgba(20,184,166,0.4)" : "1px solid rgba(255,255,255,0.1)",
        color: "#E8F0F5",
        fontFamily: "Inter, sans-serif",
      }}
    />
  );
}

function PillSelect({
  options, value, onChange
}: {
  options: string[] | { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <div className="flex flex-wrap gap-2">
      {normalized.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: selected ? "rgba(20,184,166,0.18)" : "rgba(255,255,255,0.04)",
              border: selected ? "1px solid rgba(20,184,166,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: selected ? "#14B8A6" : "#7A90A8",
            }}
          >
            {selected && <Check size={9} className="inline mr-1" strokeWidth={3} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PractitionerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RegForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [animDir, setAnimDir] = useState<"fwd" | "back">("fwd");
  const [animating, setAnimating] = useState(false);

  const set = (key: keyof RegForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Step validation
  const step1Valid = form.name.trim() && form.email.trim() && form.credential;
  const step2Valid = form.specialty && form.practice_type;
  const step3Valid = form.patient_volume && form.use_case.trim().length > 10;
  const canAdvance = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  const navigate = (dir: "fwd" | "back") => {
    setAnimDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => dir === "fwd" ? s + 1 : s - 1);
      setAnimating(false);
    }, 200);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/practitioner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      // Store email so pending page can show it
      sessionStorage.setItem("vv_reg_email", form.email.trim().toLowerCase());
      router.push("/practitioner/pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const progressPct = ((step - 1) / STEPS.length) * 100;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <button
          onClick={() => step > 1 ? navigate("back") : router.push("/practitioner/login")}
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80"
          style={{ color: "#7A90A8" }}
        >
          <ArrowLeft size={15} />
          {step > 1 ? "Back" : "Sign in"}
        </button>

        <div className="flex items-center gap-2">
          <VyvataLogo size={18} />
          <span className="text-xs font-bold tracking-widest text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            VYVATA
          </span>
        </div>

        <span className="text-xs tabular-nums" style={{ color: "#7A90A8" }}>
          {step} / {STEPS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-0.5" style={{ background: "rgba(201,214,223,0.08)" }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #0F766E, #14B8A6)" }}
        />
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-2 px-5 pt-5 overflow-x-auto">
        {STEPS.map((s) => {
          const done = s.id < step;
          const active = s.id === step;
          return (
            <div
              key={s.id}
              className="flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: active ? "rgba(20,184,166,0.15)" : done ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.04)",
                border: active ? "1px solid rgba(20,184,166,0.4)" : done ? "1px solid rgba(20,184,166,0.2)" : "1px solid rgba(255,255,255,0.06)",
                color: active ? "#14B8A6" : done ? "#0F766E" : "#4a6080",
              }}
            >
              {done && <Check size={9} strokeWidth={3} />}
              {s.label}
            </div>
          );
        })}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-5 pt-8 pb-32">
        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? animDir === "fwd" ? "translateY(10px)" : "translateY(-10px)"
              : "translateY(0)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                  Your Credentials
                </p>
                <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Tell us who you are
                </h1>
                <p className="text-sm" style={{ color: "#7A90A8" }}>
                  We verify every practitioner before granting access to patient data.
                </p>
              </div>

              <div className="space-y-4">
                <Field label="Full name *">
                  <TextInput value={form.name} onChange={set("name")} placeholder="Dr. Jane Smith" required />
                </Field>

                <Field label="Professional email *">
                  <TextInput value={form.email} onChange={set("email")} placeholder="jane@clinic.com" type="email" required />
                </Field>

                <Field label="Primary credential *" hint="Your highest relevant credential.">
                  <PillSelect options={CREDENTIALS} value={form.credential} onChange={set("credential")} />
                </Field>

                <Field label="License / registration number" hint="State or national license. Optional but speeds up verification.">
                  <TextInput value={form.license_number} onChange={set("license_number")} placeholder="e.g. CA-MD-123456" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2: Practice ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                  Your Practice
                </p>
                <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Where do you practice?
                </h1>
                <p className="text-sm" style={{ color: "#7A90A8" }}>
                  Helps us tailor your protocol tools and compliance settings.
                </p>
              </div>

              <div className="space-y-5">
                <Field label="Specialty *">
                  <PillSelect options={SPECIALTIES} value={form.specialty} onChange={set("specialty")} />
                </Field>

                <Field label="Practice type *">
                  <PillSelect options={PRACTICE_TYPES} value={form.practice_type} onChange={set("practice_type")} />
                </Field>

                <Field label="Organization / practice name">
                  <TextInput value={form.organization} onChange={set("organization")} placeholder="e.g. Integra Health Clinic" />
                </Field>

                <Field label="Practice website" hint="Optional — helps verify your credentials faster.">
                  <TextInput value={form.practice_website} onChange={set("practice_website")} placeholder="https://yourpractice.com" type="url" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 3: Use case ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                  How You'll Use It
                </p>
                <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Tell us about your patients
                </h1>
                <p className="text-sm" style={{ color: "#7A90A8" }}>
                  Helps us prioritize the right protocol categories for your panel.
                </p>
              </div>

              <div className="space-y-5">
                <Field label="Approximate patient volume *">
                  <PillSelect options={PATIENT_VOLUMES} value={form.patient_volume} onChange={set("patient_volume")} />
                </Field>

                <Field label="How do you plan to use Vyvata? *" hint="Be specific — e.g. protocol recommendations before consult, post-lab follow-up, etc. (min 10 characters)">
                  <textarea
                    value={form.use_case}
                    onChange={(e) => set("use_case")(e.target.value)}
                    placeholder="I want to use Vyvata to review my patients' supplement stacks before appointments and generate evidence-based protocol recommendations aligned with their lab results..."
                    rows={5}
                    className="w-full px-4 py-3.5 rounded-xl text-sm resize-none outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: form.use_case.length > 10 ? "1px solid rgba(20,184,166,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      color: "#E8F0F5",
                      lineHeight: 1.6,
                    }}
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: "#4a6080" }}>
                    <span>The Vyvata team reviews every application.</span>
                    <span style={{ color: form.use_case.length > 10 ? "#14B8A6" : "#4a6080" }}>
                      {form.use_case.length} chars
                    </span>
                  </div>
                </Field>

                {/* What happens next */}
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.15)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#14B8A6" }}>
                    What happens next
                  </p>
                  {[
                    "We review your credentials (usually within 24 hours)",
                    "You receive an email with your personal access code",
                    "Log in and your dashboard is ready to use",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "rgba(20,184,166,0.15)", color: "#14B8A6" }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm" style={{ color: "#C9D6DF" }}>{item}</p>
                    </div>
                  ))}
                </div>

                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#FCA5A5" }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom bar ── */}
      <div
        className="fixed bottom-0 inset-x-0 px-5 py-4"
        style={{ background: "rgba(11,31,59,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(201,214,223,0.08)" }}
      >
        <div className="max-w-lg mx-auto">
          {step < 3 ? (
            <button
              onClick={() => navigate("fwd")}
              disabled={!canAdvance}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: canAdvance ? "linear-gradient(135deg, #14B8A6, #0F766E)" : "rgba(255,255,255,0.06)",
                color: canAdvance ? "#fff" : "#4a6080",
                boxShadow: canAdvance ? "0 0 24px rgba(20,184,166,0.22)" : "none",
                fontFamily: "Montserrat, sans-serif",
              }}
              data-testid="button-next"
            >
              Continue
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canAdvance || submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: canAdvance && !submitting ? "linear-gradient(135deg, #14B8A6, #0F766E)" : "rgba(255,255,255,0.06)",
                color: canAdvance && !submitting ? "#fff" : "#4a6080",
                boxShadow: canAdvance ? "0 0 24px rgba(20,184,166,0.22)" : "none",
                fontFamily: "Montserrat, sans-serif",
              }}
              data-testid="button-submit"
            >
              {submitting ? (
                "Submitting application..."
              ) : (
                <>
                  <Sparkles size={14} />
                  Submit Application
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
