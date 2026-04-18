"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });
      if (!res.ok) {
        setError("Invalid admin secret.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: "#0B1F3B" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <VyvataLogo size={40} />
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Admin Console
          </h1>
          <p className="text-xs text-center" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            Internal tool. Vyvata team access only.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
        >
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs"
            style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", color: "#14B8A6" }}
          >
            <ShieldCheck size={11} />
            Restricted access
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium" style={{ color: "#7A90A8" }}>Admin secret</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white"
                style={{
                  background: "rgba(11,31,59,0.6)",
                  border: "1px solid rgba(201,214,223,0.12)",
                  fontFamily: "Inter, sans-serif",
                }}
                data-testid="input-admin-secret"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                style={{ color: "#7A90A8" }}
                aria-label={show ? "Hide secret" : "Show secret"}
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="text-xs" style={{ color: "#F87171", fontFamily: "Inter, sans-serif" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!secret.trim() || loading}
            className="w-full h-11 flex items-center justify-center gap-2 font-bold rounded-lg btn-teal disabled:opacity-50"
            style={{ fontFamily: "Montserrat, sans-serif", fontSize: "14px" }}
            data-testid="button-admin-login"
          >
            {loading ? "Authenticating..." : "Sign in"}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>
      </div>
    </main>
  );
}
