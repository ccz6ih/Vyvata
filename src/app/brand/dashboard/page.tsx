// Brand portal dashboard (server component). Lists this brand's
// submissions + surfaces their gap-report upside across their products.
// The "new submission" flow lands in the next session of this buildout;
// for now the dashboard shows the real account state and an empty
// submissions list.

import { redirect } from "next/navigation";
import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import { ArrowRight, FileText, Clock, CheckCircle2, XCircle, AlertCircle, LogOut, Plus } from "lucide-react";
import { getBrandSession } from "@/lib/brand-auth";
import { getSupabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface SubmissionRow {
  id: string;
  claimed_brand: string | null;
  claimed_product_name: string | null;
  status: string;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  reviewer_notes: string | null;
  product: { slug: string | null; brand: string; name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewing: "In review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#7A90A8",
  submitted: "#60a5fa",
  reviewing: "#F59E0B",
  approved: "#34D399",
  rejected: "#F87171",
  needs_revision: "#F59E0B",
};

const STATUS_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  draft: FileText,
  submitted: Clock,
  reviewing: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  needs_revision: AlertCircle,
};

export default async function BrandDashboardPage() {
  const session = await getBrandSession();
  if (!session) redirect("/brand/login");

  const supabase = getSupabaseServer();
  const { data: submissionsRaw } = await supabase
    .from("product_submissions")
    .select(`
      id, claimed_brand, claimed_product_name, status, submitted_at, decided_at, created_at, reviewer_notes,
      product:products!product_id (slug, brand, name)
    `)
    .eq("brand_account_id", session.account.id)
    .order("created_at", { ascending: false });

  const submissions = (submissionsRaw ?? []) as unknown as SubmissionRow[];
  const firstOrSelf = <T,>(v: T | T[] | null): T | null =>
    !v ? null : Array.isArray(v) ? v[0] ?? null : v;

  const counts = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const statusColor = session.account.status === "active" ? "#34D399" : session.account.status === "pending" ? "#F59E0B" : "#F87171";

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <VyvataLogo size={18} />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
          >
            VYVATA
          </span>
          <span style={{ color: "#4a6080" }}>·</span>
          <span className="text-xs" style={{ color: "#7A90A8" }}>
            Brand portal
          </span>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.05)", color: "#7A90A8" }}
          >
            <LogOut size={12} />
            Sign out
          </button>
        </form>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-8">
        {/* Account hero */}
        <section className="space-y-3">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            WELCOME
          </p>
          <h1
            className="text-2xl font-black text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {session.account.company_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "#7A90A8" }}>
            <span>{session.email}</span>
            <span>·</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: `${statusColor}15`,
                color: statusColor,
                border: `1px solid ${statusColor}40`,
              }}
            >
              {session.account.status}
            </span>
          </div>

          {session.account.status === "pending" && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#C9D6DF",
              }}
            >
              <p className="font-bold mb-1" style={{ color: "#F59E0B" }}>
                Your account is pending review.
              </p>
              <p className="text-xs">
                Vyvata verifies that you&apos;re authorized to submit on behalf
                of your brand. You&apos;ll hear from us within one business day.
                Questions? <a href="mailto:brands@vyvata.com" className="underline-offset-2 hover:underline" style={{ color: "#14B8A6" }}>brands@vyvata.com</a>
              </p>
            </div>
          )}
        </section>

        {/* Stats */}
        {submissions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={submissions.length} color="#C9D6DF" />
            <StatCard label="In review" value={(counts.submitted ?? 0) + (counts.reviewing ?? 0)} color="#60a5fa" />
            <StatCard label="Approved" value={counts.approved ?? 0} color="#34D399" />
            <StatCard label="Drafts" value={counts.draft ?? 0} color="#7A90A8" />
          </div>
        )}

        {/* Submissions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Your submissions
            </h2>
            {session.account.status === "active" && (
              <Link
                href="/brand/submissions/new"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.3)",
                  color: "#14B8A6",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <Plus size={12} />
                New submission
              </Link>
            )}
          </div>

          {submissions.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center space-y-3"
              style={{
                background: "rgba(17,32,64,0.4)",
                border: "1px dashed rgba(201,214,223,0.12)",
              }}
            >
              <FileText size={32} className="mx-auto" style={{ color: "#14B8A6" }} />
              <div className="space-y-1">
                <p
                  className="text-sm font-bold text-white"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  No submissions yet
                </p>
                <p className="text-xs" style={{ color: "#7A90A8" }}>
                  {session.account.status === "active"
                    ? "Submit documentation to unlock the verified score for one of your products."
                    : "The submission flow opens once your account is approved."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => {
                const Icon = STATUS_ICON[s.status] ?? FileText;
                const color = STATUS_COLOR[s.status] ?? "#7A90A8";
                const product = firstOrSelf(s.product);
                const brand = product?.brand ?? s.claimed_brand ?? "—";
                const name = product?.name ?? s.claimed_product_name ?? "Untitled submission";
                return (
                  <Link
                    key={s.id}
                    href={`/brand/submissions/${s.id}`}
                    className="flex items-center gap-4 rounded-xl px-4 py-3.5 hover:translate-x-0.5 transition-transform"
                    style={{
                      background: "rgba(17,32,64,0.6)",
                      border: "1px solid rgba(201,214,223,0.08)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: `${color}18`,
                        border: `1px solid ${color}40`,
                        color,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold text-white truncate"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {brand} · {name}
                      </p>
                      <p className="text-xs" style={{ color: "#7A90A8" }}>
                        {STATUS_LABEL[s.status] ?? s.status}
                        {s.submitted_at && ` · submitted ${formatDate(s.submitted_at)}`}
                        {s.decided_at && s.status !== "submitted" && ` · ${formatDate(s.decided_at)}`}
                      </p>
                      {s.reviewer_notes && s.status === "needs_revision" && (
                        <p className="text-xs mt-1" style={{ color: "#F59E0B" }}>
                          Reviewer: {s.reviewer_notes.slice(0, 120)}
                        </p>
                      )}
                    </div>
                    <ArrowRight size={14} style={{ color: "#4a6080" }} className="shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-xl p-4 space-y-1"
      style={{
        background: "rgba(17,32,64,0.4)",
        border: "1px solid rgba(201,214,223,0.08)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
        {label}
      </p>
      <p
        className="text-2xl font-black tabular-nums"
        style={{ color, fontFamily: "Montserrat, sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
