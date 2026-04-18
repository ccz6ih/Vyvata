// POST /api/quiz
// Writes quiz_responses row to Supabase, links to a matching protocol.
// Called at the end of the /quiz conversational flow.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";

// ── Validation schema ─────────────────────────────────────────────────────────
const AnswersSchema = z.object({
  // Goals
  primary_goal:       z.string().optional(),
  secondary_goals:    z.array(z.string()).optional(),

  // Sleep
  sleep_hours:        z.string().optional(),
  sleep_quality:      z.string().optional(),

  // Energy
  energy_pattern:     z.string().optional(),
  energy_level:       z.string().optional(),

  // Focus
  focus_issues:       z.array(z.string()).optional(),
  focus_level:        z.string().optional(),

  // Lifestyle
  activity_level:     z.string().optional(),
  diet_type:          z.string().optional(),
  age_range:          z.string().optional(),

  // Health context
  health_conditions:  z.array(z.string()).optional(),
  supplements_current:z.string().optional(),
});

const BodySchema = z.object({
  sessionId:    z.string().uuid(),
  answers:      AnswersSchema,
  protocolSlug: z.string().min(1).max(100),
});

// ── Sleep hours → numeric ─────────────────────────────────────────────────────
function sleepHoursToNumber(val: string | undefined): number | null {
  const map: Record<string, number> = {
    under5: 4.5,
    "5to6":  5.5,
    "6to7":  6.5,
    "7to8":  7.5,
    over8:   8.5,
  };
  return val ? (map[val] ?? null) : null;
}

// ── Scale value → numeric ─────────────────────────────────────────────────────
function scaleToNumber(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

// ── Protocol match score (0–100) ──────────────────────────────────────────────
function computeMatchScore(
  answers: z.infer<typeof AnswersSchema>,
  protocolSlug: string
): number {
  let score = 60; // base

  const primary   = answers.primary_goal || "";
  const secondary = answers.secondary_goals || [];
  const all       = [primary, ...secondary];

  // Strong match = +20 per aligned signal
  const alignmentMap: Record<string, string[]> = {
    "deep-sleep-recovery":   ["sleep", "recovery"],
    "cognitive-performance": ["focus", "energy"],
    "athletic-performance":  ["performance", "muscle", "recovery"],
    "longevity-foundation":  ["longevity", "inflammation"],
  };

  const aligned = alignmentMap[protocolSlug] || [];
  for (const goal of all) {
    if (aligned.includes(goal)) score += 15;
  }

  // Sleep quality boosts sleep protocol match
  if (protocolSlug === "deep-sleep-recovery") {
    const sq = scaleToNumber(answers.sleep_quality);
    if (sq && sq <= 2) score += 10;
  }

  // Low energy boosts cognitive protocol match
  if (protocolSlug === "cognitive-performance") {
    const el = scaleToNumber(answers.energy_level);
    if (el && el <= 2) score += 5;
  }

  return Math.min(score, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, answers, protocolSlug } = parsed.data;
    const supabase = getSupabaseServer();

    // ── Map answers to DB columns ─────────────────────────────────────────────
    const avgSleepHours = sleepHoursToNumber(answers.sleep_hours);
    const sleepQuality  = answers.sleep_quality || null;
    const healthConditions = (answers.health_conditions || []).filter(c => c !== "none");
    const focusIssues      = (answers.focus_issues      || []).filter(f => f !== "none");
    const secondaryGoals   = answers.secondary_goals || [];

    // Build a goals array combining primary + secondary (unique, max 5)
    const allGoals = [
      ...(answers.primary_goal ? [answers.primary_goal] : []),
      ...secondaryGoals,
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

    const matchScore = computeMatchScore(answers, protocolSlug);

    // ── Upsert the session row so it exists ───────────────────────────────────
    await supabase.from("sessions").upsert({
      id:         sessionId,
      raw_input:  answers.supplements_current || "",
      goals:      JSON.stringify(allGoals),
      ingredients: "[]",
    }, { onConflict: "id" });

    // ── Insert quiz_response ──────────────────────────────────────────────────
    const { data: quizRow, error: quizErr } = await supabase
      .from("quiz_responses")
      .insert({
        session_id:             sessionId,
        age_range:              answers.age_range              || null,
        primary_goals:          allGoals,
        health_conditions:      healthConditions,
        diet_type:              answers.diet_type              || null,
        activity_level:         answers.activity_level         || null,
        avg_sleep_hours:        avgSleepHours,
        sleep_quality:          sleepQuality,
        assigned_protocol_slug: protocolSlug,
        protocol_match_score:   matchScore,
        raw_responses: {
          sleep_hours:     answers.sleep_hours,
          sleep_quality:   answers.sleep_quality,
          energy_pattern:  answers.energy_pattern,
          energy_level:    answers.energy_level,
          focus_issues:    focusIssues,
          focus_level:     answers.focus_level,
          secondary_goals: secondaryGoals,
          health_conditions: answers.health_conditions,
        },
      })
      .select("id")
      .single();

    if (quizErr) {
      console.error("quiz_responses insert error:", quizErr);
      // Non-fatal — still return success so user flow continues
    }

    return NextResponse.json({
      ok:              true,
      protocolSlug,
      matchScore,
      quizResponseId:  quizRow?.id ?? null,
    });
  } catch (err) {
    console.error("Quiz API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
