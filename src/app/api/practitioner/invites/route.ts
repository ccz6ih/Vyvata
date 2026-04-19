// GET  /api/practitioner/invites  — list this practitioner's invites
// POST /api/practitioner/invites  — create a new invite (optionally with label/notes/expiry)
//
// Both require a valid practitioner session cookie.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase";
import { getPractitionerSession } from "@/lib/practitioner-auth";

const CreateSchema = z.object({
  label: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  maxUses: z.number().int().positive().max(1000).optional().nullable(),
  expiresInDays: z.number().int().positive().max(365).optional().nullable(), // default 90
});

/** 12 hex chars = 48 bits of entropy. Collision-safe for practitioner scale. */
function makeToken(): string {
  return crypto.randomBytes(6).toString("hex");
}

export async function GET() {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServer();
  const { data: invites, error } = await supabase
    .from("practitioner_invites")
    .select("id, token, label, notes, max_uses, use_count, expires_at, revoked_at, created_at, last_used_at")
    .eq("practitioner_id", session.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("invites list error:", error);
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }

  const rows = invites ?? [];
  if (rows.length === 0) return NextResponse.json({ invites: [] });

  // Per-invite conversion: how many patient_links came from each invite, and
  // how many of those audits were ever unlocked. Done in one extra query.
  const inviteIds = rows.map((i) => (i as { id: string }).id);
  const { data: links } = await supabase
    .from("patient_links")
    .select("invite_id, audit_id, audits(is_unlocked)")
    .in("invite_id", inviteIds);

  type LinkRow = { invite_id: string; audits: { is_unlocked: boolean } | { is_unlocked: boolean }[] | null };
  const stats = new Map<string, { joined: number; unlocked: number }>();
  for (const l of ((links ?? []) as unknown as LinkRow[])) {
    const s = stats.get(l.invite_id) ?? { joined: 0, unlocked: 0 };
    s.joined += 1;
    // Supabase returns the joined row as either an object or a single-element array depending on cardinality hints.
    const audit = Array.isArray(l.audits) ? l.audits[0] : l.audits;
    if (audit?.is_unlocked) s.unlocked += 1;
    stats.set(l.invite_id, s);
  }

  const enriched = rows.map((r) => {
    const row = r as { id: string } & Record<string, unknown>;
    const s = stats.get(row.id) ?? { joined: 0, unlocked: 0 };
    return { ...row, joined_count: s.joined, unlocked_count: s.unlocked };
  });

  return NextResponse.json({ invites: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { label, notes, maxUses, expiresInDays } = parsed.data;
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
    : null;

  // Retry once on token collision — 48-bit randoms won't realistically collide but belt-and-suspenders
  const supabase = getSupabaseServer();
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = makeToken();
    const { data, error } = await supabase
      .from("practitioner_invites")
      .insert({
        practitioner_id: session.id,
        token,
        label: label ?? null,
        notes: notes ?? null,
        max_uses: maxUses ?? null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ invite: data });
    }

    // 23505 = unique violation (token collision) — retry
    if (error && (error as { code?: string }).code !== "23505") {
      console.error("invite create error:", error);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Token collision; try again" }, { status: 500 });
}
