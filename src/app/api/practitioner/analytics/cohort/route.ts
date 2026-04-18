// GET /api/practitioner/analytics/cohort
// Cohort-level analytics for a practitioner's patient panel.
// Fetches patient_links, then bulk-loads the related sessions/audits/quiz
// rows by ID — avoids relying on PostgREST FK inference (which wasn't set
// up between patient_links and sessions) and keeps the query predictable.

import { NextResponse } from "next/server";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";
import type { Goal, ParsedIngredient, ReportSection } from "@/types";

export const dynamic = "force-dynamic";

const PROTOCOL_LABELS: Record<string, string> = {
  "cognitive-performance": "Cognitive Performance",
  "deep-sleep-recovery":   "Deep Sleep & Recovery",
  "athletic-performance":  "Athletic Performance",
  "longevity-foundation":  "Longevity Foundation",
  "immune-support":        "Immune Support",
};

const EMPTY = {
  totalPatients: 0,
  activePatients: 0,
  goalDistribution: [] as Array<{ goal: string; count: number }>,
  protocolDistribution: [] as Array<{ protocol: string; count: number }>,
  stackComplexity: [] as Array<{ range: string; count: number }>,
  interactionStats: { withInteractions: 0, withoutInteractions: 0 },
  evidenceTiers: [] as Array<{ tier: string; count: number }>,
  trendingIngredients: [] as Array<{ ingredient: string; count: number }>,
};

interface PatientLink {
  id: string;
  status: string;
  session_id: string | null;
  audit_id: string | null;
  quiz_response_id: string | null;
}
interface AuditRow { id: string; report_json: string | null }
interface SessionRow { id: string; goals: string | null; ingredients: string | null }
interface QuizRow { id: string; assigned_protocol_slug: string | null }

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET() {
  try {
    const session = await getPractitionerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServer();

    const { data: linksRaw, error: linkErr } = await supabase
      .from("patient_links")
      .select("id, status, session_id, audit_id, quiz_response_id")
      .eq("practitioner_id", session.id);

    if (linkErr) {
      console.error("cohort: patient_links fetch error:", linkErr);
      return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
    }

    const links = (linksRaw ?? []) as PatientLink[];
    if (links.length === 0) return NextResponse.json(EMPTY);

    const sessionIds = [...new Set(links.map(l => l.session_id).filter(Boolean))] as string[];
    const auditIds   = [...new Set(links.map(l => l.audit_id).filter(Boolean))] as string[];
    const quizIds    = [...new Set(links.map(l => l.quiz_response_id).filter(Boolean))] as string[];

    const [sessionsRes, auditsRes, quizzesRes] = await Promise.all([
      sessionIds.length
        ? supabase.from("sessions").select("id, goals, ingredients").in("id", sessionIds)
        : Promise.resolve({ data: [] as SessionRow[] }),
      auditIds.length
        ? supabase.from("audits").select("id, report_json").in("id", auditIds)
        : Promise.resolve({ data: [] as AuditRow[] }),
      quizIds.length
        ? supabase.from("quiz_responses").select("id, assigned_protocol_slug").in("id", quizIds)
        : Promise.resolve({ data: [] as QuizRow[] }),
    ]);

    const sessionById = new Map<string, SessionRow>();
    ((sessionsRes.data ?? []) as SessionRow[]).forEach(s => sessionById.set(s.id, s));
    const auditById = new Map<string, AuditRow>();
    ((auditsRes.data ?? []) as AuditRow[]).forEach(a => auditById.set(a.id, a));
    const quizById = new Map<string, QuizRow>();
    ((quizzesRes.data ?? []) as QuizRow[]).forEach(q => quizById.set(q.id, q));

    const totalPatients = links.length;
    const activePatients = links.filter(l => l.status !== "archived").length;

    // Goal distribution (sessions.goals is a JSON-string array of Goal enum values)
    const goalCounts = new Map<string, number>();
    links.forEach(l => {
      const s = l.session_id ? sessionById.get(l.session_id) : null;
      const goals = safeParse<Goal[]>(s?.goals, []);
      goals.forEach(g => goalCounts.set(g, (goalCounts.get(g) ?? 0) + 1));
    });
    const goalDistribution = Array.from(goalCounts.entries())
      .map(([goal, count]) => ({ goal: titleCase(goal), count }))
      .sort((a, b) => b.count - a.count);

    // Protocol distribution (from matched quiz protocol)
    const protoCounts = new Map<string, number>();
    links.forEach(l => {
      const q = l.quiz_response_id ? quizById.get(l.quiz_response_id) : null;
      if (q?.assigned_protocol_slug) {
        protoCounts.set(q.assigned_protocol_slug, (protoCounts.get(q.assigned_protocol_slug) ?? 0) + 1);
      }
    });
    const protocolDistribution = Array.from(protoCounts.entries())
      .map(([slug, count]) => ({ protocol: PROTOCOL_LABELS[slug] ?? slug, count }))
      .sort((a, b) => b.count - a.count);

    // Stack complexity (bucket patient ingredient counts)
    const bucketCounts = new Map<string, number>();
    const bucket = (n: number) =>
      n >= 20 ? "20+" : n >= 15 ? "15-19" : n >= 10 ? "10-14" : n >= 6 ? "6-9" : "0-5";
    links.forEach(l => {
      const s = l.session_id ? sessionById.get(l.session_id) : null;
      const ingredients = safeParse<ParsedIngredient[]>(s?.ingredients, []);
      const b = bucket(ingredients.length);
      bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
    });
    const stackComplexity = ["0-5", "6-9", "10-14", "15-19", "20+"].map(range => ({
      range,
      count: bucketCounts.get(range) ?? 0,
    }));

    // Interaction stats + evidence tiers (from audits.report_json, ReportSection shape)
    let withInteractions = 0;
    let withoutInteractions = 0;
    const evidence = { strong: 0, moderate: 0, weak: 0, none: 0 };
    links.forEach(l => {
      const a = l.audit_id ? auditById.get(l.audit_id) : null;
      if (!a?.report_json) return;
      const report = safeParse<ReportSection | null>(a.report_json, null);
      if (!report) return;

      if ((report.fighting?.length ?? 0) > 0) withInteractions++;
      else withoutInteractions++;

      report.working?.forEach(w => {
        const tier = (w.evidenceTier ?? "none").toLowerCase() as keyof typeof evidence;
        if (tier in evidence) evidence[tier] += 1;
      });
    });
    const evidenceTiers = [
      { tier: "Strong",   count: evidence.strong },
      { tier: "Moderate", count: evidence.moderate },
      { tier: "Weak",     count: evidence.weak },
    ];

    // Trending ingredients across the practitioner's panel
    const ingCounts = new Map<string, number>();
    links.forEach(l => {
      const s = l.session_id ? sessionById.get(l.session_id) : null;
      const ingredients = safeParse<ParsedIngredient[]>(s?.ingredients, []);
      ingredients.forEach(i => {
        if (!i?.name) return;
        const key = i.name.trim();
        if (key) ingCounts.set(key, (ingCounts.get(key) ?? 0) + 1);
      });
    });
    const trendingIngredients = Array.from(ingCounts.entries())
      .map(([ingredient, count]) => ({ ingredient: titleCase(ingredient), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalPatients,
      activePatients,
      goalDistribution,
      protocolDistribution,
      stackComplexity,
      interactionStats: { withInteractions, withoutInteractions },
      evidenceTiers,
      trendingIngredients,
    });
  } catch (err) {
    console.error("cohort: unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
