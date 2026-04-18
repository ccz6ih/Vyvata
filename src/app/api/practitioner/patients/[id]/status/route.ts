// PATCH /api/practitioner/patients/[id]/status — update patient status

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════
// PATCH — Update patient status
// ══════════════════════════════════════════════════════════════

const UpdateStatusSchema = z.object({
  status: z.enum(["active", "paused", "archived"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientLinkId } = await params;
  const body = await req.json();
  const parsed = UpdateStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  // Fetch current patient to verify ownership and get current status
  const { data: currentPatient, error: fetchError } = await supabase
    .from("patient_links")
    .select("id, status")
    .eq("id", patientLinkId)
    .eq("practitioner_id", session.id)
    .single();

  if (fetchError || !currentPatient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const oldStatus = currentPatient.status;
  const newStatus = parsed.data.status;

  // No-op if status unchanged
  if (oldStatus === newStatus) {
    return NextResponse.json({ ok: true, status: newStatus });
  }

  // Update the status
  const { error: updateError } = await supabase
    .from("patient_links")
    .update({ status: newStatus })
    .eq("id", patientLinkId)
    .eq("practitioner_id", session.id);

  if (updateError) {
    console.error("Failed to update status:", updateError);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // Log the status change in audit table (optional but recommended)
  await supabase.from("audits").insert({
    action: "patient_status_change",
    metadata: {
      patient_link_id: patientLinkId,
      practitioner_id: session.id,
      old_status: oldStatus,
      new_status: newStatus,
    },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
