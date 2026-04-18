// GET  /api/practitioner/patients  — list all patients for this practitioner
// POST /api/practitioner/patients  — add a patient by session_id or audit slug

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getPractitionerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  // Fetch patient_links with joined audit + quiz data
  const { data: links, error } = await supabase
    .from("patient_links")
    .select(`
      id,
      session_id,
      patient_label,
      notes,
      status,
      added_at,
      audit_id,
      quiz_response_id,
      audits ( id, score, public_slug, is_unlocked, created_at, email ),
      quiz_responses (
        id, primary_goals, age_range, activity_level,
        diet_type, sleep_quality, avg_sleep_hours,
        assigned_protocol_slug, protocol_match_score, created_at
      )
    `)
    .eq("practitioner_id", session.id)
    .eq("status", "active")
    .order("added_at", { ascending: false });

  if (error) {
    console.error("patients fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }

  return NextResponse.json({ patients: links ?? [] });
}

const AddPatientSchema = z.object({
  publicSlug: z.string().optional(),
  sessionId:  z.string().optional(),
  label:      z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getPractitionerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = AddPatientSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.publicSlug && !parsed.data.sessionId)) {
    return NextResponse.json({ error: "Provide publicSlug or sessionId" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { publicSlug, sessionId, label } = parsed.data;

  let auditId: string | null = null;
  let resolvedSessionId = sessionId ?? null;
  let quizResponseId: string | null = null;

  if (publicSlug) {
    const { data: audit } = await supabase
      .from("audits")
      .select("id, session_id")
      .eq("public_slug", publicSlug)
      .single();

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    auditId = audit.id;
    resolvedSessionId = audit.session_id;
  }

  if (resolvedSessionId) {
    const { data: quiz } = await supabase
      .from("quiz_responses")
      .select("id")
      .eq("session_id", resolvedSessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    quizResponseId = quiz?.id ?? null;
  }

  const { data: link, error: linkErr } = await supabase
    .from("patient_links")
    .insert({
      practitioner_id:  session.id,
      session_id:       resolvedSessionId ?? "unknown",
      audit_id:         auditId,
      quiz_response_id: quizResponseId,
      patient_label:    label ?? null,
    })
    .select("id")
    .single();

  if (linkErr) {
    console.error("patient_links insert error:", linkErr);
    return NextResponse.json({ error: "Failed to add patient" }, { status: 500 });
  }

  // Increment patient_count
  await supabase.rpc("increment_patient_count" as never, { prac_id: session.id }).maybeSingle();

  return NextResponse.json({ ok: true, linkId: link.id });
}
