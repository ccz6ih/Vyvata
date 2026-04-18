// GET  /api/practitioner/patients/[id]/notes — fetch all notes for a patient
// POST /api/practitioner/patients/[id]/notes — create a new note

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// GET — Fetch all notes for a patient
// ══════════════════════════════════════════════════════════════

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientLinkId } = await params;
  const supabase = getSupabaseServer();

  // Verify this patient belongs to the practitioner
  const { data: patientLink } = await supabase
    .from("patient_links")
    .select("id")
    .eq("id", patientLinkId)
    .eq("practitioner_id", session.id)
    .single();

  if (!patientLink) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Fetch all notes for this patient (RLS will enforce practitioner owns the patient)
  const { data: notes, error } = await supabase
    .from("patient_notes")
    .select("id, note, created_at, updated_at")
    .eq("patient_link_id", patientLinkId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }

  return NextResponse.json({ notes: notes || [] });
}

// ══════════════════════════════════════════════════════════════
// POST — Create a new note
// ══════════════════════════════════════════════════════════════

const CreateNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(5000, "Note too long (max 5000 characters)"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientLinkId } = await params;
  const body = await req.json();
  const parsed = CreateNoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  // Verify this patient belongs to the practitioner
  const { data: patientLink } = await supabase
    .from("patient_links")
    .select("id")
    .eq("id", patientLinkId)
    .eq("practitioner_id", session.id)
    .single();

  if (!patientLink) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Insert the note (RLS enforces created_by = auth.uid())
  const { data: newNote, error } = await supabase
    .from("patient_notes")
    .insert({
      patient_link_id: patientLinkId,
      note: parsed.data.note,
      created_by: session.id,
    })
    .select("id, note, created_at, updated_at")
    .single();

  if (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }

  return NextResponse.json({ note: newNote }, { status: 201 });
}
