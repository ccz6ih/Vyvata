// PATCH  /api/admin/commission-agreements/[id] — Update agreement
// DELETE /api/admin/commission-agreements/[id] — Terminate agreement

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";

const UpdateAgreementSchema = z.object({
  consumer_rate: z.coerce.number().min(8).max(12).optional(),
  practitioner_rate: z.coerce.number().min(18).max(20).optional(),
  elite_rate: z.coerce.number().min(22).max(25).optional(),
  practitioner_channel_enabled: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "paused", "terminated"]).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdateAgreementSchema.parse(body);

    const supabase = getSupabaseServer();

    // Get existing agreement
    const { data: existing } = await supabase
      .from("commission_agreements")
      .select("id, manufacturer_id, status, practitioner_channel_enabled")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const existingAgreement = existing as {
      id: string;
      manufacturer_id: string;
      status: string;
      practitioner_channel_enabled: boolean;
    };

    // Update the agreement
    const { error } = await supabase
      .from("commission_agreements")
      .update({
        ...parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[PATCH /api/admin/commission-agreements/[id]] error:", error);
      return NextResponse.json({ error: "Failed to update agreement" }, { status: 500 });
    }

    // If practitioner_channel_enabled changed, trigger eligibility recalculation
    if (
      parsed.practitioner_channel_enabled !== undefined &&
      parsed.practitioner_channel_enabled !== existingAgreement.practitioner_channel_enabled
    ) {
      triggerEligibilityRecalculation(existingAgreement.manufacturer_id).catch((err) => {
        console.error("[commission-agreements] Eligibility recalc failed:", err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      // zod v4 renamed .errors → .issues
      return NextResponse.json({ error: "Invalid request data", details: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/admin/commission-agreements/[id]] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const supabase = getSupabaseServer();

    // Get existing agreement
    const { data: existing } = await supabase
      .from("commission_agreements")
      .select("id, manufacturer_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const manufacturerId = (existing as { manufacturer_id: string }).manufacturer_id;

    // Terminate the agreement (set status and termination date)
    const { error } = await supabase
      .from("commission_agreements")
      .update({
        status: "terminated",
        termination_date: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/admin/commission-agreements/[id]] error:", error);
      return NextResponse.json({ error: "Failed to terminate agreement" }, { status: 500 });
    }

    // Trigger eligibility recalculation - all products will become ineligible
    triggerEligibilityRecalculation(manufacturerId).catch((err) => {
      console.error("[commission-agreements] Eligibility recalc failed:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/commission-agreements/[id]] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper: Trigger eligibility recalculation for all products from a manufacturer
async function triggerEligibilityRecalculation(manufacturerId: string) {
  const supabase = getSupabaseServer();

  // Get all products for this manufacturer
  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("manufacturer_id", manufacturerId);

  if (!products || products.length === 0) return;

  // Import the eligibility check function
  const { checkAndUpdateDispensaryEligibility } = await import("@/lib/dispensary/check-eligibility");

  // Recalculate eligibility for each product
  const promises = products.map((p) =>
    checkAndUpdateDispensaryEligibility((p as { id: string }).id).catch((err) => {
      console.error(`Failed to recalc eligibility for product ${(p as { id: string }).id}:`, err);
    })
  );

  await Promise.all(promises);
}
