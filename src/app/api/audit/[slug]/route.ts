// GET /api/audit/[slug]
// Fetches audit by public slug (for the receipt page)

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabase = getSupabaseServer();

  const { data: audit, error } = await supabase
    .from("audits")
    .select("id, public_slug, score, teaser_json, report_json, is_unlocked, created_at, sessions(goals, raw_input, ingredients)")
    .eq("public_slug", slug)
    .single();

  if (error || !audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const teaser = JSON.parse(audit.teaser_json);
  const report = audit.is_unlocked && audit.report_json ? JSON.parse(audit.report_json) : null;
  const session = (audit as any).sessions;

  return NextResponse.json({
    id: audit.id,
    publicSlug: audit.public_slug,
    score: audit.score,
    teaser,
    report,
    isUnlocked: audit.is_unlocked,
    createdAt: audit.created_at,
    goals: session ? JSON.parse(session.goals) : [],
    ingredientCount: session ? JSON.parse(session.ingredients).length : 0,
  });
}
