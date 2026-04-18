import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LogOut, Sparkles } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";
import { VyvataLogo } from "@/components/VyvataLogo";
import SignOutButton from "./SignOutButton";

interface AuditRow {
  id: string;
  public_slug: string;
  score: number;
  is_unlocked: boolean;
  created_at: string;
  user_id: string | null;
}

function scoreColor(score: number) {
  if (score >= 70) return "#34D399";
  if (score >= 50) return "#F59E0B";
  return "#F87171";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/me");

  // Service-role-equivalent query via our existing server client.
  // Fetch audits linked to this user_id OR matching their email (pre-auth audits).
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("audits")
    .select("id, public_slug, score, is_unlocked, created_at, user_id")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("created_at", { ascending: false });

  const audits = (data ?? []) as AuditRow[];

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <header
        className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto"
        style={{ borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <VyvataLogo size={24} />
          <span className="text-base font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Vyvata
          </span>
        </Link>
        <div className="flex items-center gap-3 text-xs" style={{ color: "#7A90A8" }}>
          <span>{user.email}</span>
          <SignOutButton>
            <LogOut size={12} /> Sign out
          </SignOutButton>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            YOUR PROTOCOLS
          </p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Your Vyvata history
          </h1>
          <p className="text-sm" style={{ color: "#C9D6DF" }}>
            Every protocol audit tied to <strong style={{ color: "#fff" }}>{user.email}</strong>.
            Run a new one anytime — we'll keep the record here.
          </p>
        </div>

        {audits.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center space-y-4"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
          >
            <div className="flex justify-center" style={{ color: "#14B8A6" }}>
              <Sparkles size={36} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              No protocols yet
            </p>
            <p className="text-xs max-w-sm mx-auto" style={{ color: "#7A90A8" }}>
              Run your first audit — paste your stack or take the guided quiz.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              Build my protocol <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {audits.map((a) => (
              <Link
                key={a.id}
                href={`/protocol/${a.public_slug}`}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:translate-x-0.5"
                style={{
                  background: "rgba(17,32,64,0.6)",
                  border: "1px solid rgba(201,214,223,0.08)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black"
                  style={{
                    background: `${scoreColor(a.score)}18`,
                    border: `1px solid ${scoreColor(a.score)}40`,
                    color: scoreColor(a.score),
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {a.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
                    Protocol {a.public_slug.slice(0, 8)}
                  </p>
                  <p className="text-xs" style={{ color: "#7A90A8" }}>
                    {relativeTime(a.created_at)}
                    {a.is_unlocked ? " · unlocked" : " · teaser"}
                    {!a.user_id ? " · pre-signin" : ""}
                  </p>
                </div>
                <ArrowRight size={14} style={{ color: "#4a6080" }} />
              </Link>
            ))}

            <Link
              href="/"
              className="flex items-center justify-center gap-2 mt-4 py-3 rounded-xl text-sm font-semibold"
              style={{
                border: "1px dashed rgba(20,184,166,0.3)",
                color: "#14B8A6",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Run a new audit <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
