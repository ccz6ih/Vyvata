import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Users, Eye, UserCheck, Stethoscope, Sparkles } from "lucide-react";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";
import { VyvataLogo } from "@/components/VyvataLogo";

type Goal =
  | "sleep" | "energy" | "focus" | "inflammation"
  | "longevity" | "muscle" | "recovery";

interface SessionRow { goals: string | null }
interface AuditRow { score: number; email: string | null; user_id: string | null; created_at: string }
interface PractitionerRow { verification_status: string }
interface QuizRow { assigned_protocol_slug: string | null }
interface PatientLinkRow { status: string }
interface AuthUserRow { id: string }

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function pct(n: number, d: number) {
  if (d === 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export default async function AnalyticsPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");

  const supabase = getSupabaseServer();

  // Parallel fetches — each is a cheap count or light select.
  const [
    auditsAll,
    audits7d,
    audits30d,
    sessionsAll,
    practitionersAll,
    patientLinksAll,
    quizResponsesAll,
  ] = await Promise.all([
    supabase.from("audits").select("score, email, user_id, created_at"),
    supabase.from("audits").select("id", { head: true, count: "exact" }).gte("created_at", daysAgo(7)),
    supabase.from("audits").select("id", { head: true, count: "exact" }).gte("created_at", daysAgo(30)),
    supabase.from("sessions").select("goals"),
    supabase.from("practitioners").select("verification_status"),
    supabase.from("patient_links").select("status"),
    supabase.from("quiz_responses").select("assigned_protocol_slug"),
  ]);

  // auth.users count — anon client can't read auth schema; try service role path
  let authUserCount: number | null = null;
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1 });
    authUserCount = (authUsers && 'total' in authUsers) ? authUsers.total : null;
  } catch {
    // non-fatal — service role key may not be wired
  }

  const audits = (auditsAll.data ?? []) as AuditRow[];
  const sessions = (sessionsAll.data ?? []) as SessionRow[];
  const practitioners = (practitionersAll.data ?? []) as PractitionerRow[];
  const patientLinks = (patientLinksAll.data ?? []) as PatientLinkRow[];
  const quizzes = (quizResponsesAll.data ?? []) as QuizRow[];

  // Funnel
  const totalAudits = audits.length;
  const unlockedAudits = audits.filter((a) => a.email).length;
  const savedAudits = audits.filter((a) => a.user_id).length;

  // Score distribution (buckets of 10)
  const scoreBuckets: number[] = new Array(10).fill(0);
  audits.forEach((a) => {
    if (typeof a.score !== "number") return;
    const i = Math.min(9, Math.max(0, Math.floor(a.score / 10)));
    scoreBuckets[i] += 1;
  });
  const scoreMax = Math.max(...scoreBuckets, 1);

  // Goal frequency
  const goalCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    try {
      const arr = JSON.parse(s.goals ?? "[]") as Goal[];
      arr.forEach((g) => (goalCounts[g] = (goalCounts[g] ?? 0) + 1));
    } catch {}
  });
  const goalEntries = Object.entries(goalCounts).sort((a, b) => b[1] - a[1]);
  const goalMax = Math.max(...Object.values(goalCounts), 1);

  // Practitioner status breakdown
  const pStatus = {
    pending: practitioners.filter((p) => p.verification_status === "pending").length,
    approved: practitioners.filter((p) => p.verification_status === "approved").length,
    rejected: practitioners.filter((p) => p.verification_status === "rejected").length,
  };

  // Patient link activity
  const activePatients = patientLinks.filter((p) => p.status !== "archived").length;

  // Top matched protocols
  const protoCounts: Record<string, number> = {};
  quizzes.forEach((q) => {
    const s = q.assigned_protocol_slug;
    if (s) protoCounts[s] = (protoCounts[s] ?? 0) + 1;
  });
  const protoEntries = Object.entries(protoCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const protoMax = Math.max(...Object.values(protoCounts), 1);

  // Average score (unlocked only, so LLM reports bias isn't skewing)
  const scoredUnlocked = audits.filter((a) => a.email && typeof a.score === "number");
  const avgScore =
    scoredUnlocked.length === 0
      ? null
      : Math.round(scoredUnlocked.reduce((s, a) => s + a.score, 0) / scoredUnlocked.length);

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <header
        className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between"
        style={{ background: "rgba(11,31,59,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs" style={{ color: "#7A90A8" }}>
            <ArrowLeft size={12} /> Admin
          </Link>
          <span style={{ color: "#4a6080" }}>·</span>
          <VyvataLogo size={18} />
          <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
            VYVATA
          </span>
          <span className="text-xs" style={{ color: "#4a6080" }}>Analytics</span>
        </div>
        <div className="px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171" }}>
          Internal
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">

        {/* ── Top-line metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total audits" value={totalAudits} Icon={BarChart3} color="#14B8A6" />
          <MetricCard label="Unlocked" value={unlockedAudits} sub={pct(unlockedAudits, totalAudits)} Icon={Eye} color="#34D399" />
          <MetricCard label="Saved to account" value={savedAudits} sub={pct(savedAudits, unlockedAudits)+" of unlocks"} Icon={UserCheck} color="#818CF8" />
          <MetricCard label="Avg score" value={avgScore ?? "—"} sub="unlocked" Icon={Sparkles} color="#F59E0B" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Audits · 7d" value={audits7d.count ?? 0} Icon={BarChart3} color="#14B8A6" />
          <MetricCard label="Audits · 30d" value={audits30d.count ?? 0} Icon={BarChart3} color="#14B8A6" />
          <MetricCard label="Auth users" value={authUserCount ?? "—"} Icon={Users} color="#818CF8" />
          <MetricCard label="Active patients" value={activePatients} sub={`${patientLinks.length} total`} Icon={Stethoscope} color="#60A5FA" />
        </div>

        {/* ── Goal distribution ── */}
        <Panel title="Goal distribution" subtitle={`What users are optimizing for (from ${sessions.length} sessions)`}>
          {goalEntries.length === 0 ? <EmptyRow label="No goals tracked yet" /> : (
            <div className="space-y-2">
              {goalEntries.map(([goal, count]) => (
                <BarRow key={goal} label={goal} count={count} max={goalMax} color="#14B8A6" />
              ))}
            </div>
          )}
        </Panel>

        {/* ── Score distribution ── */}
        <Panel title="Score distribution" subtitle={`${audits.length} audits bucketed by score`}>
          {audits.length === 0 ? <EmptyRow label="No audits yet" /> : (
            <div className="space-y-2">
              {scoreBuckets.map((count, i) => (
                <BarRow
                  key={i}
                  label={`${i * 10}–${i * 10 + 9}`}
                  count={count}
                  max={scoreMax}
                  color={i >= 7 ? "#34D399" : i >= 5 ? "#F59E0B" : "#F87171"}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* ── Protocol match ── */}
        <Panel title="Top matched protocols" subtitle={`From quiz flow (${quizzes.length} quiz responses)`}>
          {protoEntries.length === 0 ? <EmptyRow label="No quiz protocols matched yet" /> : (
            <div className="space-y-2">
              {protoEntries.map(([slug, count]) => (
                <BarRow key={slug} label={slug} count={count} max={protoMax} color="#818CF8" />
              ))}
            </div>
          )}
        </Panel>

        {/* ── Practitioners ── */}
        <Panel title="Practitioner funnel" subtitle="B2B channel">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Pending" value={pStatus.pending} color="#FBB724" />
            <MiniStat label="Approved" value={pStatus.approved} color="#14B8A6" />
            <MiniStat label="Rejected" value={pStatus.rejected} color="#F87171" />
          </div>
        </Panel>

        <p className="text-xs text-center" style={{ color: "#4a6080" }}>
          Data pulled from Supabase at page-load. Refresh to re-query.
        </p>
      </div>
    </main>
  );
}

function MetricCard({
  label, value, sub, Icon, color,
}: { label: string; value: number | string; sub?: string; Icon: typeof BarChart3; color: string }) {
  return (
    <div className="rounded-2xl px-4 py-4"
      style={{ background: "#0F2445", border: "1px solid rgba(201,214,223,0.07)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} style={{ color }} />
        <span className="text-xs" style={{ color: "#7A90A8" }}>{label}</span>
      </div>
      <p className="text-2xl font-black leading-none" style={{ color, fontFamily: "Montserrat, sans-serif" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: "#4a6080" }}>{sub}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "#0F2445", border: "1px solid rgba(201,214,223,0.07)" }}>
      <div>
        <h2 className="text-sm font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const widthPct = Math.max(2, Math.round((count / max) * 100));
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 shrink-0 truncate capitalize" style={{ color: "#C9D6DF" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(201,214,223,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${widthPct}%`, background: color }} />
      </div>
      <span className="w-8 text-right tabular-nums" style={{ color: "#7A90A8" }}>{count}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl px-3 py-3 text-center"
      style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}>
      <p className="text-xl font-black" style={{ color, fontFamily: "Montserrat, sans-serif" }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>{label}</p>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="text-xs text-center py-6" style={{ color: "#4a6080" }}>{label}</p>;
}
