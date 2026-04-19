"use client";

// Brand portal login — a thin wrapper around the existing consumer
// magic-link flow that redirects the post-click callback to
// /brand/dashboard. No separate auth infrastructure; we lean on
// Supabase Auth and layer the brand_accounts lookup in brand-auth.ts.

import { useState } from "react";
import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import { Mail, ArrowRight } from "lucide-react";

export default function BrandLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          next: "/brand/dashboard",
        }),
      });
      if (res.ok) {
        setStatus("sent");
        setMessage("Check your email for a sign-in link.");
      } else if (res.status === 429) {
        setStatus("error");
        setMessage("Too many requests. Try again shortly.");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-6 py-10"
      style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}
    >
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <VyvataLogo size={28} />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
          >
            VYVATA BRAND PORTAL
          </span>
        </div>

        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: "rgba(17,32,64,0.6)",
            border: "1px solid rgba(201,214,223,0.08)",
          }}
        >
          <div className="space-y-1.5">
            <h1
              className="text-2xl font-black text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Sign in
            </h1>
            <p className="text-sm" style={{ color: "#C9D6DF" }}>
              Enter the email on file at your company. We&apos;ll email you a
              one-click sign-in link.
            </p>
          </div>

          {status === "sent" ? (
            <div
              className="rounded-xl p-4 text-sm space-y-1"
              style={{
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.3)",
                color: "#C9D6DF",
              }}
            >
              <p className="font-bold" style={{ color: "#34D399" }}>
                Link sent.
              </p>
              <p className="text-xs">
                If <span className="font-mono">{email}</span> is a valid address,
                you&apos;ll have a sign-in link in your inbox within a minute.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#7A90A8" }}
                >
                  Work email
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{
                    background: "rgba(11,31,59,0.6)",
                    border: "1px solid rgba(201,214,223,0.12)",
                  }}
                >
                  <Mail size={14} style={{ color: "#7A90A8" }} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@your-brand.com"
                    required
                    className="flex-1 bg-transparent border-0 text-sm text-white placeholder:text-[#4a6080] focus:outline-none"
                  />
                </div>
              </div>

              {status === "error" && (
                <p className="text-xs" style={{ color: "#F87171" }}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#14B8A6,#0F766E)",
                  color: "#fff",
                  fontFamily: "Montserrat, sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                {status === "sending" ? "Sending…" : "Email me a sign-in link"}
                <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px]" style={{ color: "#4a6080" }}>
          Questions?{" "}
          <a
            href="mailto:brands@vyvata.com"
            className="underline-offset-2 hover:underline"
            style={{ color: "#14B8A6" }}
          >
            brands@vyvata.com
          </a>
          {" · "}
          <Link
            href="/"
            className="underline-offset-2 hover:underline"
            style={{ color: "#7A90A8" }}
          >
            vyvata.com
          </Link>
        </p>
      </div>
    </main>
  );
}
