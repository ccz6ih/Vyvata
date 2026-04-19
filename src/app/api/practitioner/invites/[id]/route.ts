// DELETE /api/practitioner/invites/[id] — revoke an invite (soft: sets revoked_at)
// The token row is preserved for audit trail; it just becomes unusable.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getPractitionerSession } from "@/lib/practitioner-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("practitioner_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("practitioner_id", session.id);

  if (error) {
    console.error("invite revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
