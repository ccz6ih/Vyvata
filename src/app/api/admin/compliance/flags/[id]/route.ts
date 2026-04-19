// PATCH /api/admin/compliance/flags/[id]
// Admin actions on a single flag: resolve (dismiss false positive),
// or manually match to a manufacturer/product.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resolve"),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("unresolve"),
  }),
  z.object({
    action: z.literal("match"),
    manufacturerId: z.string().uuid().optional().nullable(),
    productId: z.string().uuid().optional().nullable(),
    notes: z.string().max(500).optional(),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  let update: Record<string, unknown>;

  switch (parsed.data.action) {
    case "resolve":
      update = {
        resolved_at: new Date().toISOString(),
        resolved_by: "admin",
        resolved_reason: parsed.data.reason ?? null,
      };
      break;
    case "unresolve":
      update = { resolved_at: null, resolved_by: null, resolved_reason: null };
      break;
    case "match":
      update = {
        matched_manufacturer_id: parsed.data.manufacturerId ?? null,
        matched_product_id: parsed.data.productId ?? null,
        match_confidence: "high", // admin override
        match_notes: parsed.data.notes ?? "manual match",
      };
      break;
  }

  const { error } = await supabase.from("compliance_flags").update(update).eq("id", id);
  if (error) {
    console.error("compliance flag update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
