"use client";

import { useEffect, useState } from "react";
import { Clock, Mail, CheckCircle2, ArrowRight } from "lucide-react";

function VyvataLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Vyvata">
      <circle cx="16" cy="16" r="14.5" stroke="#14B8A6" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.5" />
      <path d="M9 9L16 23L23 9" stroke="#14B8A6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.8" fill="#14B8A6" />
      <circle cx="9"  cy="9"  r="1.5" fill="#14B8A6" opacity="0.7" />
      <circle cx="23" cy="9"  r="1.5" fill="#14B8A6" opacity="0.7" />
    </svg>
  );
}

const STEPS = [
  { icon: CheckCircle2, label: "Application submitted", done: true },
  { icon: Clock,        label: "Under review by Vyvata team",  done: false },
  { icon: Mail,         label: "Access code sent by email",    done: false },
];

export default function PractitionerPendingPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("vv_reg_email");
    if (stored) setEmail(stored);

    // subtle pulse animation timer
    const id = setInterval(() => {
      setPulse((p) => !p);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5"
      style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}
    >
      {/* Back */}
      <a
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80"
        style={{ color: "#7A90A8" }}
      >
        ← Vyvata
      </a>

      <div className="w-full max-w-sm space-y-8">
        {/* Animated icon */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            {/* Outer pulse ring */}
            <div
              className="absolute inset-0 rounded-full transition-all duration-[2500ms] ease-in-out"
              style={{
                background: "rgba(20,184,166,0.08)",
                transform: pulse ? "scale(1.18)" : "scale(1)",
                border: "1px solid rgba(20,184,166,0.15)",
              }}
            />
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.3)" }}
            >
              <Clock size={26} style={{ color: "#14B8A6" }} />
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <VyvataLogo size={16} />
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
              >
                VYVATA
              </span>
            </div>
            <h1
              className="text-2xl font-black text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Application received
            </h1>
            <p className="text-sm" style={{ color: "#7A90A8" }}>
              Thanks for applying to join the Vyvata practitioner network.
            </p>
          </div>
        </div>

        {/* Email confirmation */}
        {email && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(20,184,166,0.07)",
              border: "1px solid rgba(20,184,166,0.18)",
            }}
          >
            <Mail size={15} style={{ color: "#14B8A6", flexShrink: 0 }} />
            <p className="text-sm" style={{ color: "#C9D6DF" }}>
              Confirmation sent to{" "}
              <span className="font-semibold" style={{ color: "#E8F0F5" }}>
                {email}
              </span>
            </p>
          </div>
        )}

        {/* Progress steps */}
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: s.done
                    ? "rgba(20,184,166,0.1)"
                    : "rgba(255,255,255,0.03)",
                  border: s.done
                    ? "1px solid rgba(20,184,166,0.25)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: s.done
                      ? "rgba(20,184,166,0.15)"
                      : "rgba(255,255,255,0.05)",
                  }}
                >
                  <Icon
                    size={14}
                    style={{ color: s.done ? "#14B8A6" : "#4a6080" }}
                  />
                </div>
                <span
                  className="text-sm"
                  style={{ color: s.done ? "#C9D6DF" : "#4a6080" }}
                >
                  {s.label}
                </span>
                {s.done && (
                  <CheckCircle2
                    size={14}
                    className="ml-auto shrink-0"
                    style={{ color: "#14B8A6" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline note */}
        <div
          className="rounded-xl px-4 py-3.5 space-y-1"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
            What to expect
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#7A90A8" }}>
            Our team reviews every application within{" "}
            <span style={{ color: "#C9D6DF" }}>24 hours</span>. Once approved,
            you&apos;ll receive an email with your personal access code to sign in.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-2 space-y-3">
          <a
            href="/practitioner/login"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #14B8A6, #0F766E)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(20,184,166,0.2)",
              fontFamily: "Montserrat, sans-serif",
              display: "flex",
            }}
          >
            Already approved? Sign in
            <ArrowRight size={15} />
          </a>

          <a
            href="/"
            className="block text-center text-sm transition-opacity hover:opacity-80"
            style={{ color: "#4a6080" }}
          >
            Return to Vyvata
          </a>
        </div>
      </div>
    </div>
  );
}
