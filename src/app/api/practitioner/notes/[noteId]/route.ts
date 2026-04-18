// PATCH  /api/practitioner/notes/[noteId] — update a note
// DELETE /api/practitioner/notes/[noteId] — delete a note

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// PATCH — Update an existing note
// ══════════════════════════════════════════════════════════════

const UpdateNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(5000, "Note too long (max 5000 characters)"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const body = await req.json();
  const parsed = UpdateNoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  // Update note (RLS enforces created_by = auth.uid())
  const { data: updatedNote, error } = await supabase
    .from("patient_notes")
    .update({ note: parsed.data.note })
    .eq("id", noteId)
    .eq("created_by", session.id)
    .select("id, note, created_at, updated_at")
    .single();

  if (error || !updatedNote) {
    console.error("Failed to update note:", error);
    return NextResponse.json(
      { error: "Note not found or unauthorized" },
      { status: 404 }
    );
  }

  return NextResponse.json({ note: updatedNote });
}

// ══════════════════════════════════════════════════════════════
// DELETE — Delete a note
// ══════════════════════════════════════════════════════════════

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const supabase = getSupabaseServer();

  // Delete note (RLS enforces created_by = auth.uid())
  const { error } = await supabase
    .from("patient_notes")
    .delete()
    .eq("id", noteId)
    .eq("created_by", session.id);

  if (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json(
      { error: "Note not found or unauthorized" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
