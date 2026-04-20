// POST /api/admin/commission-agreements — Create new agreement
// GET  /api/admin/commission-agreements — List all agreements (admin only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasAdminSession } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase";

const CreateAgreementSchema = z.object({
  manufacturer_id: z.string().uuid(),
  consumer_rate: z.coerce.number().min(8).max(12),
  practitioner_rate: z.coerce.number().min(18).max(20),
  elite_rate: z.coerce.number().min(22).max(25),
  practitioner_channel_enabled: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateAgreementSchema.parse(body);

    const supabase = getSupabaseServer();

    // Check if manufacturer exists
    const { data: manufacturer } = await supabase
      .from("manufacturers")
      .select("id, name")
      .eq("id", parsed.manufacturer_id)
      .maybeSingle();

    if (!manufacturer) {
      return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
    }

    // Check for existing active agreement
    const { data: existing } = await supabase
      .from("commission_agreements")
      .select("id")
      .eq("manufacturer_id", parsed.manufacturer_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This manufacturer already has an active commission agreement" },
        { status: 409 }
      );
    }

    // Create the agreement
    const { data: agreement, error } = await supabase
      .from("commission_agreements")
      .insert({
        manufacturer_id: parsed.manufacturer_id,
        consumer_rate: parsed.consumer_rate,
        practitioner_rate: parsed.practitioner_rate,
        elite_rate: parsed.elite_rate,
        practitioner_channel_enabled: parsed.practitioner_channel_enabled,
        notes: parsed.notes || null,
        status: "active",
        effective_date: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();

    if (error || !agreement) {
      console.error("[POST /api/admin/commission-agreements] error:", error);
      return NextResponse.json({ error: "Failed to create agreement" }, { status: 500 });
    }

    // Trigger eligibility recalculation for all products from this manufacturer
    // This is a background task - don't await it
    triggerEligibilityRecalculation(parsed.manufacturer_id).catch((err) => {
      console.error("[commission-agreements] Eligibility recalc failed:", err);
    });

    return NextResponse.json({ success: true, id: (agreement as { id: string }).id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: err.errors }, { status: 400 });
    }
    console.error("[POST /api/admin/commission-agreements] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("commission_agreements")
    .select(`
      id,
      manufacturer_id,
      consumer_rate,
      practitioner_rate,
      elite_rate,
      status,
      practitioner_channel_enabled,
      effective_date,
      termination_date,
      notes,
      created_at,
      manufacturers (id, name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/admin/commission-agreements] error:", error);
    return NextResponse.json({ error: "Failed to fetch agreements" }, { status: 500 });
  }

  return NextResponse.json({ agreements: data || [] });
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
