"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

export default function PractitionerRecoverPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/practitioner/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        setError("Too many requests. Please wait a bit and try again.");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: "#0B1F3B" }}>
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs mb-6"
          style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
        >
          <ArrowLeft size={12} /> Back
        </button>

        <div className="flex flex-col items-center gap-3 mb-8">
          <VyvataLogo size={36} />
          <h1 className="text-xl font-bold text-white text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Reset your access code
          </h1>
          <p className="text-xs text-center" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            We'll email a new code and sign out any active sessions.
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-6 space-y-4 text-center"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <div className="flex justify-center" style={{ color: "#14B8A6" }}>
              <CheckCircle2 size={36} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Check your email
            </p>
            <p className="text-xs" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
              If an approved account exists for that email, we've sent a new access code. It may take a minute to arrive.
            </p>
            <Link
              href="/practitioner/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold pt-2"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              Back to sign in <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-6 space-y-4"
            style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <label className="block space-y-2">
              <span className="text-xs font-medium" style={{ color: "#7A90A8" }}>Practitioner email</span>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#7A90A8" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  placeholder="you@clinic.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg text-sm text-white placeholder:text-[#4a6080]"
                  style={{
                    background: "rgba(11,31,59,0.6)",
                    border: "1px solid rgba(201,214,223,0.12)",
                    fontFamily: "Inter, sans-serif",
                  }}
                  data-testid="input-recover-email"
                />
              </div>
            </label>

            {error && (
              <p className="text-xs" style={{ color: "#F87171", fontFamily: "Inter, sans-serif" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="w-full h-11 flex items-center justify-center gap-2 font-bold rounded-lg btn-teal disabled:opacity-50"
              style={{ fontFamily: "Montserrat, sans-serif", fontSize: "14px" }}
              data-testid="button-send-recovery"
            >
              {loading ? "Sending..." : "Send new access code"}
              {!loading && <ArrowRight size={14} />}
            </button>

            <p className="text-xs text-center pt-1" style={{ color: "#4a6080", fontFamily: "Inter, sans-serif" }}>
              Haven't applied yet? <Link href="/practitioner/register" className="underline" style={{ color: "#14B8A6" }}>Register as a practitioner</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
