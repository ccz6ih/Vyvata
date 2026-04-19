// GET /api/invites/[token] — public validator. Returns the inviting
// practitioner's display info + invite status so the /invite/[token]
// landing page can render a trusted hand-off screen.
//
// Intentionally read-only. Consumption happens in parse-stack when the
// patient creates their audit.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

interface InviteRow {
  id: string;
  token: string;
  label: string | null;
  notes: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  practitioner_id: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = getSupabaseServer();

  const { data: invite, error } = await supabase
    .from("practitioner_invites")
    .select("id, token, label, notes, max_uses, use_count, expires_at, revoked_at, created_at, practitioner_id")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
  }

  const row = invite as unknown as InviteRow;

  if (row.revoked_at) {
    return NextResponse.json({ valid: false, reason: "revoked" }, { status: 410 });
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" }, { status: 410 });
  }
  if (row.max_uses != null && row.use_count >= row.max_uses) {
    return NextResponse.json({ valid: false, reason: "exhausted" }, { status: 410 });
  }

  const { data: prac } = await supabase
    .from("practitioners")
    .select("name, credential, specialty, organization")
    .eq("id", row.practitioner_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!prac) {
    return NextResponse.json({ valid: false, reason: "practitioner_inactive" }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    invite: {
      token: row.token,
      label: row.label,
      notes: row.notes,
    },
    practitioner: prac,
  });
}
