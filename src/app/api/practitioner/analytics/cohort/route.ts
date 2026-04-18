import { NextResponse } from "next/server";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Auth check
    const session = await getPractitionerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    // Fetch all patient_links for this practitioner with related data
    const { data: patients, error } = await supabase
      .from("patient_links")
      .select(`
        id,
        patient_name,
        status,
        created_at,
        audits!inner(
          id,
          score,
          report,
          created_at
        ),
        quiz_responses!inner(
          id,
          answers,
          assigned_protocol_slug,
          created_at
        ),
        sessions!inner(
          id,
          goals,
          current_stack,
          created_at
        )
      `)
      .eq("practitioner_id", session.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching patient data:", error);
      return NextResponse.json({ error: "Failed to fetch patient data" }, { status: 500 });
    }

    if (!patients || patients.length === 0) {
      // Return empty analytics for practitioners with no patients
      return NextResponse.json({
        totalPatients: 0,
        activePatients: 0,
        goalDistribution: [],
        protocolDistribution: [],
        stackComplexity: [],
        interactionStats: {
          withInteractions: 0,
          withoutInteractions: 0,
        },
        evidenceTiers: [],
        trendingIngredients: [],
      });
    }

    // Calculate analytics
    const totalPatients = patients.length;
    const activePatients = patients.filter((p) => p.status === "active").length;

    // Goal distribution
    const goalCounts = new Map<string, number>();
    patients.forEach((patient) => {
      const session = patient.sessions?.[0];
      if (session?.goals && Array.isArray(session.goals)) {
        session.goals.forEach((goal: string) => {
          goalCounts.set(goal, (goalCounts.get(goal) || 0) + 1);
        });
      }
    });

    const goalDistribution = Array.from(goalCounts.entries())
      .map(([goal, count]) => ({
        goal: goal.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Protocol distribution
    const protocolCounts = new Map<string, number>();
    patients.forEach((patient) => {
      const quiz = patient.quiz_responses?.[0];
      if (quiz?.assigned_protocol_slug) {
        const slug = quiz.assigned_protocol_slug;
        protocolCounts.set(slug, (protocolCounts.get(slug) || 0) + 1);
      }
    });

    const PROTOCOL_LABELS: Record<string, string> = {
      "cognitive-performance": "Cognitive Performance",
      "deep-sleep-recovery": "Deep Sleep & Recovery",
      "athletic-performance": "Athletic Performance",
      "longevity-foundation": "Longevity Foundation",
    };

    const protocolDistribution = Array.from(protocolCounts.entries())
      .map(([slug, count]) => ({
        protocol: PROTOCOL_LABELS[slug] || slug,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Stack complexity (ingredient counts)
    const complexityCounts = new Map<string, number>();
    patients.forEach((patient) => {
      const session = patient.sessions?.[0];
      if (session?.current_stack && Array.isArray(session.current_stack)) {
        const ingredientCount = session.current_stack.length;
        let bucket = "0-5";
        if (ingredientCount >= 20) bucket = "20+";
        else if (ingredientCount >= 15) bucket = "15-19";
        else if (ingredientCount >= 10) bucket = "10-14";
        else if (ingredientCount >= 6) bucket = "6-9";

        complexityCounts.set(bucket, (complexityCounts.get(bucket) || 0) + 1);
      }
    });

    const stackComplexity = ["0-5", "6-9", "10-14", "15-19", "20+"].map((bucket) => ({
      range: bucket,
      count: complexityCounts.get(bucket) || 0,
    }));

    // Interaction stats
    let withInteractions = 0;
    let withoutInteractions = 0;
    patients.forEach((patient) => {
      const audit = patient.audits?.[0];
      if (audit?.report) {
        try {
          const report = typeof audit.report === "string" ? JSON.parse(audit.report) : audit.report;
          const hasInteractions =
            report.interactions?.potential_interactions?.length > 0 ||
            report.interactions?.fighting_pairs?.length > 0;
          if (hasInteractions) {
            withInteractions++;
          } else {
            withoutInteractions++;
          }
        } catch {
          withoutInteractions++;
        }
      }
    });

    // Evidence tiers
    const evidenceCounts = { strong: 0, moderate: 0, weak: 0 };
    patients.forEach((patient) => {
      const audit = patient.audits?.[0];
      if (audit?.report) {
        try {
          const report = typeof audit.report === "string" ? JSON.parse(audit.report) : audit.report;
          if (report.synergies?.working_well && Array.isArray(report.synergies.working_well)) {
            report.synergies.working_well.forEach((item: any) => {
              const tier = item.evidence_tier?.toLowerCase();
              if (tier === "strong") evidenceCounts.strong++;
              else if (tier === "moderate") evidenceCounts.moderate++;
              else evidenceCounts.weak++;
            });
          }
        } catch {}
      }
    });

    const evidenceTiers = [
      { tier: "Strong", count: evidenceCounts.strong },
      { tier: "Moderate", count: evidenceCounts.moderate },
      { tier: "Weak", count: evidenceCounts.weak },
    ];

    // Trending ingredients
    const ingredientCounts = new Map<string, number>();
    patients.forEach((patient) => {
      const session = patient.sessions?.[0];
      if (session?.current_stack && Array.isArray(session.current_stack)) {
        session.current_stack.forEach((ingredient: string) => {
          ingredientCounts.set(ingredient, (ingredientCounts.get(ingredient) || 0) + 1);
        });
      }
    });

    const trendingIngredients = Array.from(ingredientCounts.entries())
      .map(([ingredient, count]) => ({
        ingredient: ingredient.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalPatients,
      activePatients,
      goalDistribution,
      protocolDistribution,
      stackComplexity,
      interactionStats: {
        withInteractions,
        withoutInteractions,
      },
      evidenceTiers,
      trendingIngredients,
    });
  } catch (error) {
    console.error("Error generating cohort analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
