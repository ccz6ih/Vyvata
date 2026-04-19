// POST /api/admin/compliance/sync-recalls
// Triggers the openFDA food-enforcement recall ingester. Admin-cookie gated.
// Idempotent — dedups on (source, source_id); updates existing rows, preserves
// resolved ones.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";
import { ingestOpenFdaRecalls } from "@/lib/compliance/openfda-recalls";

export const maxDuration = 60;

const BodySchema = z.object({
  daysBack: z.number().int().positive().max(3650).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const result = await ingestOpenFdaRecalls(supabase, parsed.data);

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
  });
}
