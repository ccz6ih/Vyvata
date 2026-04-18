"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Stethoscope } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

export default function PractitionerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<"pending" | "rejected" | "invalid" | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim() || loading) return;
    setLoading(true);
    setError("");
    setErrorCode("");

    try {
      const res = await fetch("/api/practitioner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), accessCode: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials. Check your email and access code.");
        setErrorCode(data.code || "invalid");
        return;
      }

      router.push("/practitioner/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5"
      style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}
    >
      {/* Back to site */}
      <a
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
        style={{ color: "#7A90A8" }}
      >
        ← Vyvata
      </a>

      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)" }}
            >
              <Stethoscope size={22} style={{ color: "#14B8A6" }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <VyvataLogo size={18} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                VYVATA
              </span>
            </div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Practitioner Portal
            </h1>
            <p className="text-sm" style={{ color: "#7A90A8" }}>
              Sign in with your registered email and access code.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#7A90A8" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@practice.com"
              required
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: email ? "1px solid rgba(20,184,166,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: "#E8F0F5",
              }}
              data-testid="input-email"
            />
          </div>

          {/* Access code */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#7A90A8" }}>
              Access Code
            </label>
            <div className="relative">
              <input
                type={showCode ? "text" : "password"}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                required
                className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm outline-none transition-all tracking-widest"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: code ? "1px solid rgba(20,184,166,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  color: "#E8F0F5",
                  fontFamily: "monospace",
                }}
                data-testid="input-access-code"
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                style={{ color: "#7A90A8" }}
                tabIndex={-1}
              >
                {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3.5 rounded-xl text-sm space-y-2"
              style={{
                background: errorCode === "pending"
                  ? "rgba(20,184,166,0.07)"
                  : "rgba(248,113,113,0.1)",
                border: errorCode === "pending"
                  ? "1px solid rgba(20,184,166,0.25)"
                  : "1px solid rgba(248,113,113,0.2)",
                color: errorCode === "pending" ? "#C9D6DF" : "#FCA5A5",
              }}
            >
              <p>{error}</p>
              {errorCode === "pending" && (
                <a
                  href="/practitioner/pending"
                  className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 underline"
                  style={{ color: "#14B8A6" }}
                >
                  View application status →
                </a>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!email.trim() || !code.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background:
                email && code && !loading
                  ? "linear-gradient(135deg, #14B8A6, #0F766E)"
                  : "rgba(255,255,255,0.06)",
              color: email && code && !loading ? "#fff" : "#4a6080",
              boxShadow: email && code ? "0 0 24px rgba(20,184,166,0.2)" : "none",
              fontFamily: "Montserrat, sans-serif",
            }}
            data-testid="button-login"
          >
            {loading ? "Signing in..." : (
              <>
                Sign in to Dashboard
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Demo hint */}
        <div
          className="rounded-xl px-4 py-3 text-center space-y-1"
          style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.12)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "#14B8A6" }}>Demo credentials</p>
          <p className="text-xs" style={{ color: "#7A90A8" }}>
            Email: <span className="font-mono" style={{ color: "#C9D6DF" }}>demo@vyvata.com</span>
          </p>
          <p className="text-xs" style={{ color: "#7A90A8" }}>
            Code: <span className="font-mono" style={{ color: "#C9D6DF" }}>DEMO-2026</span>
          </p>
        </div>

        <p className="text-center text-xs" style={{ color: "#4a6080" }}>
          Not yet a Vyvata practitioner partner?{" "}
          <a href="/practitioner/register" className="underline" style={{ color: "#14B8A6" }}>
            Apply to join →
          </a>
        </p>
      </div>
    </div>
  );
}
