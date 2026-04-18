// GET    /api/practitioner/patients/[id]  — full patient record
// PATCH  /api/practitioner/patients/[id]  — update label / notes
// DELETE /api/practitioner/patients/[id]  — archive patient link

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("patient_links")
    .select(`
      id, session_id, patient_label, notes, status, added_at,
      audits (
        id, score, public_slug, teaser_json, report_json,
        is_unlocked, email, created_at
      ),
      quiz_responses (
        id, primary_goals, age_range, biological_sex,
        weight_kg, height_cm, activity_level, diet_type,
        avg_sleep_hours, sleep_quality,
        health_conditions, medications, allergies,
        assigned_protocol_slug, protocol_match_score,
        raw_responses, created_at
      )
    `)
    .eq("id", id)
    .eq("practitioner_id", session.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ patient: data });
}

const PatchSchema = z.object({
  label: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = getSupabaseServer();
  const updates: Record<string, string> = {};
  if (parsed.data.label !== undefined) updates.patient_label = parsed.data.label;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const { error } = await supabase
    .from("patient_links")
    .update(updates)
    .eq("id", id)
    .eq("practitioner_id", session.id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("patient_links")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("practitioner_id", session.id);

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });

  const { count } = await supabase
    .from("patient_links")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", session.id)
    .neq("status", "archived");

  await supabase
    .from("practitioners")
    .update({ patient_count: count ?? 0 })
    .eq("id", session.id);

  return NextResponse.json({ ok: true });
}
