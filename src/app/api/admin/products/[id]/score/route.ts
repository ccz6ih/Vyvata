// POST /api/admin/products/[id]/score
// Rescore a single product. Thin wrapper around rescoreProducts() so the
// admin button takes the same code path as the weekly cron — including
// skip-if-unchanged, tier-change detection, and practitioner email
// notifications on downgrades.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { hasAdminSession } from "@/lib/admin-auth";
import { rescoreProducts } from "@/lib/scoring/rescore-job";
import { notifyPractitionersOfTierChanges } from "@/lib/scoring/notify-tier-changes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServer();

  const result = await rescoreProducts(supabase, {
    productIds: [id],
    reason: "manual",
  });

  if (result.considered === 0) {
    return NextResponse.json({ error: "Product not found or inactive" }, { status: 404 });
  }
  if (result.errors.length > 0) {
    return NextResponse.json(
      { error: result.errors[0].error, errors: result.errors },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const notifications = await notifyPractitionersOfTierChanges(
    supabase,
    result.tierChanges,
    { appUrl }
  );

  return NextResponse.json({
    ok: true,
    rescored: result.rescored,
    skipped: result.skipped,
    tierChange: result.tierChanges[0] ?? null,
    notifications,
  });
}
