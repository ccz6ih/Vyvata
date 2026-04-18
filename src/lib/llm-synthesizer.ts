// llm-synthesizer.ts
// GPT-4o synthesis with embedded Compliance Filter agent.
// Falls back to deterministic buildFullReport() if OpenAI is unavailable.

import type { Goal, ReportSection, WorkingItem, WastingItem, FightingItem, MissingItem, RevisedStackItem } from "@/types";
import type { RulesResult } from "@/lib/rules-engine";
import type { IngredientRecord } from "@/lib/ingredients-db";

// ─── Compliance Filter system prompt ────────────────────────────────────────
// Instructs GPT-4o to act as a supplement protocol analyst and enforces
// FDA structure/function claim language (no disease treatment claims).

const SYSTEM_PROMPT = `You are a precision supplement protocol analyst at Vyvata. Your job is to synthesize a structured report from rules-engine data about a user's supplement stack.

## Compliance Filter (NON-NEGOTIABLE)
You MUST follow FDA structure/function claim rules in every word you write:

FORBIDDEN language (auto-block these patterns):
- "treats [disease/condition]"
- "cures [disease]"
- "heals [disease]"
- "prevents [disease]"
- "for [disease name]" (e.g., "for Alzheimer's", "for diabetes", "for cancer")
- Any clinical disease name used as a benefit claim

REQUIRED replacements:
- "treats X" → "supports healthy X function" or "associated with X outcomes"
- "cures X" → "may help maintain X"
- "for Alzheimer's" → "associated with cognitive support in aging adults"
- "for diabetes" → "supports healthy blood sugar balance"
- "for depression" → "associated with mood and neurotransmitter support"
- "for anxiety" → "supports a calm, focused mental state"
- Use phrases like: "supports", "may help", "associated with", "linked to", "research suggests"

## Your Task
Given the rules-engine output (JSON) and the user's goals, produce a structured protocol report.

## Output Format
Return ONLY valid JSON matching this exact shape:

{
  "verdict": "string — 2-4 sentences. Direct, specific, no fluff. No disease claims.",
  "working": [
    {
      "name": "ingredient name",
      "reason": "why it's working — evidence + goal alignment. No disease claims.",
      "evidenceTier": "strong" | "moderate" | "weak" | "none"
    }
  ],
  "wasting": [
    {
      "name": "ingredient name",
      "reason": "why it's not serving the user's goals",
      "evidenceTier": "strong" | "moderate" | "weak" | "none",
      "recommendation": "specific actionable recommendation"
    }
  ],
  "fighting": [
    {
      "ingredients": ["name1", "name2"],
      "interaction": "what's happening between them",
      "fix": "specific timing or substitution fix"
    }
  ],
  "missing": [
    {
      "name": "ingredient name",
      "reason": "why it would help — evidence + goal alignment. No disease claims.",
      "evidenceTier": "strong" | "moderate" | "weak" | "none"
    }
  ],
  "revisedStack": [
    {
      "status": "keep" | "remove" | "modify" | "add",
      "name": "ingredient name",
      "dose": "e.g. 400mg (optional)",
      "timing": "AM" | "PM" | "with food" | "empty stomach" (optional),
      "note": "brief reason (optional)"
    }
  ]
}

## Writing Style
- Terse and precise. No filler phrases like "It's worth noting" or "In conclusion".
- Write like a knowledgeable protocol analyst talking to a biohacker.
- Verdict should feel like a real expert read your stack — not generic.
- Lead with the most important insight in the verdict.
- working/wasting/fighting/missing sections should be specific to THEIR ingredients and goals.
- revisedStack should include ALL matched ingredients plus any recommended additions.
`;

// ─── Input serializer ────────────────────────────────────────────────────────

function serializeRulesForLLM(rules: RulesResult, goals: Goal[]): string {
  return JSON.stringify({
    goals,
    matched: rules.matched.map((m) => ({
      name: m.name,
      evidence_tier: m.evidence_tier,
      goals: m.goals,
      notes: m.notes,
      timing: m.timing,
      standard_dose_mg: m.standard_dose_mg,
    })),
    unmatched: rules.unmatched.map((u) => u.raw),
    interactions: rules.interactions.map((i) => ({
      a: i.a.name,
      b: i.b.name,
      description: i.description,
      fix: i.fix,
    })),
    redundancies: rules.redundancies.map((r) => ({
      items: r.items.map((i) => i.name),
      description: r.description,
    })),
    dosageIssues: rules.dosageIssues.map((d) => ({
      ingredient: d.ingredient.name,
      issue: d.issue,
      description: d.description,
    })),
    timingConflicts: rules.timingConflicts.map((t) => ({
      items: t.items.map((i) => i.name),
      description: t.description,
      fix: t.fix,
    })),
    goalGaps: rules.goalGaps.map((g) => ({
      goal: g.goal,
      suggestedIngredients: g.suggestedIngredients.map((i) => ({
        name: i.name,
        evidence_tier: i.evidence_tier,
        notes: i.notes,
      })),
    })),
    evidenceBreakdown: rules.evidenceBreakdown,
  }, null, 2);
}

// ─── JSON validator ──────────────────────────────────────────────────────────

function isValidReportSection(obj: unknown): obj is ReportSection {
  if (!obj || typeof obj !== "object") return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.verdict === "string" &&
    Array.isArray(r.working) &&
    Array.isArray(r.wasting) &&
    Array.isArray(r.fighting) &&
    Array.isArray(r.missing) &&
    Array.isArray(r.revisedStack)
  );
}

// ─── Deterministic fallback ──────────────────────────────────────────────────

export function buildFullReport(
  rules: RulesResult,
  goals: Goal[]
): ReportSection {
  const issues =
    rules.interactions.length +
    rules.redundancies.length +
    rules.dosageIssues.length;

  const verdict =
    issues === 0
      ? `Your stack is cleaner than most. Good ingredient choices, reasonable evidence base. The gaps are in what you haven't added, not what you've included.`
      : issues <= 2
      ? `Your stack has good intentions but ${issues} issue${issues > 1 ? "s" : ""} working against you. Fix those first before adding anything new.`
      : `Your stack is working against itself in ${issues} ways. You're likely absorbing less than half of what you're paying for. The fixes are specific and actionable.`;

  const working: WorkingItem[] = rules.matched
    .filter(
      (m) =>
        (m.evidence_tier === "strong" || m.evidence_tier === "moderate") &&
        goals.some((g) => m.goals.includes(g))
    )
    .slice(0, 4)
    .map((m) => ({
      name: m.name,
      reason:
        m.notes ||
        `${m.evidence_tier === "strong" ? "Strong" : "Moderate"} evidence for ${goals
          .filter((g) => m.goals.includes(g))
          .join(", ")}.`,
      evidenceTier: m.evidence_tier,
    }));

  const wasting: WastingItem[] = [];
  for (const m of rules.matched.filter(
    (m) => m.evidence_tier === "weak" || m.evidence_tier === "none"
  )) {
    wasting.push({
      name: m.name,
      reason: m.notes || `Weak evidence for your stated goals.`,
      evidenceTier: m.evidence_tier,
      recommendation: "Drop it unless you have a specific personal reason to keep it.",
    });
  }
  for (const r of rules.redundancies) {
    const weaker = [...r.items].sort((a, b) => {
      const tiers = ["strong", "moderate", "weak", "none"];
      return tiers.indexOf(a.evidence_tier) - tiers.indexOf(b.evidence_tier);
    })[1];
    if (weaker && !wasting.find((w) => w.name === weaker.name)) {
      wasting.push({
        name: weaker.name,
        reason: r.description,
        evidenceTier: weaker.evidence_tier,
        recommendation: `Keep ${r.items[0].name}, drop ${weaker.name}.`,
      });
    }
  }

  const fighting: FightingItem[] = [
    ...rules.interactions.map((i) => ({
      ingredients: [i.a.name, i.b.name],
      interaction: i.description,
      fix: i.fix,
    })),
    ...rules.timingConflicts.map((t) => ({
      ingredients: t.items.map((i) => i.name),
      interaction: t.description,
      fix: t.fix,
    })),
  ];

  const missing: MissingItem[] = rules.goalGaps.flatMap((gap) =>
    gap.suggestedIngredients.map((ing) => ({
      name: ing.name,
      reason: `${ing.notes || "High-value addition"} Relevant for ${gap.goal}.`,
      evidenceTier: ing.evidence_tier,
    }))
  );

  const revisedStack: RevisedStackItem[] = [
    ...rules.matched.map((m) => {
      const isRedundant = rules.redundancies.some(
        (r) => r.items[1]?.name === m.name
      );
      const isWeak =
        m.evidence_tier === "weak" || m.evidence_tier === "none";
      return {
        status: (isRedundant || isWeak
          ? "remove"
          : "keep") as RevisedStackItem["status"],
        name: m.name,
        dose: m.standard_dose_mg
          ? `${
              m.standard_dose_mg >= 1000
                ? m.standard_dose_mg / 1000 + "g"
                : m.standard_dose_mg + "mg"
            }`
          : undefined,
        timing:
          m.timing === "morning"
            ? "AM"
            : m.timing === "evening"
            ? "PM"
            : m.timing,
        note: isRedundant
          ? "Redundant — drop"
          : isWeak
          ? "Weak evidence — reconsider"
          : undefined,
      };
    }),
    ...missing.map((m) => ({
      status: "add" as const,
      name: m.name,
      timing: "AM",
      note: "Recommended addition",
    })),
  ];

  return { verdict, working, wasting, fighting, missing, revisedStack };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function synthesizeReport(
  rules: RulesResult,
  goals: Goal[]
): Promise<ReportSection> {
  const apiKey = process.env.OPENAI_API_KEY;

  // No API key → deterministic fallback immediately
  if (!apiKey) {
    console.log("[llm-synthesizer] No OPENAI_API_KEY — using deterministic fallback");
    return buildFullReport(rules, goals);
  }

  try {
    const userMessage = `Here is the rules-engine analysis of this user's supplement stack. Their goals are: ${goals.join(", ")}.

Synthesize a complete protocol report in the JSON format specified. Apply the Compliance Filter to all output — no disease claims.

Rules engine data:
${serializeRulesForLLM(rules, goals)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 2000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: { content: string };
      }>;
    };

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(raw) as unknown;

    if (!isValidReportSection(parsed)) {
      throw new Error("LLM output did not match ReportSection shape");
    }

    console.log("[llm-synthesizer] GPT-4o synthesis successful");
    return parsed;
  } catch (err) {
    console.error("[llm-synthesizer] LLM call failed, falling back to deterministic:", err);
    return buildFullReport(rules, goals);
  }
}
