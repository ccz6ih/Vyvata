// POST /api/parse-stack
// Accepts raw stack text, returns parsed ingredients + rules engine output + teaser

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { parseStackText, computeScore } from "@/lib/stack-parser";
import { runRulesEngine } from "@/lib/rules-engine";
import { calculateStackScores } from "@/lib/scoring-engine";
import { getSupabaseServer } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";
import { extractProducts, hasProductInfo } from "@/lib/product-parser";
import { enrichStackFromDSLD } from "@/lib/dsld-api";
import type { Goal, TeaserResult, ParsedIngredient } from "@/types";

const BodySchema = z.object({
  rawInput: z.string().min(3).max(5000),
  goals: z.array(z.string()).min(1).max(3),
  sessionId: z.string().uuid(),
  inviteToken: z.string().max(64).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { rawInput, goals, sessionId, inviteToken } = parsed.data;

    // Step 1: Try DSLD enrichment if input looks like product names
    let dsldEnrichedIngredients: ParsedIngredient[] = [];
    let dsldProducts: any[] = [];
    
    if (hasProductInfo(rawInput)) {
      try {
        const products = extractProducts(rawInput);
        if (products.length > 0) {
          const enrichmentResult = await enrichStackFromDSLD(products);
          
          // Convert enrichment results to our format
          for (let i = 0; i < enrichmentResult.length; i++) {
            const dsldProduct = enrichmentResult[i];
            const inputProduct = products[i];
            
            if (dsldProduct && dsldProduct.ingredients) {
              // Store full DSLD data for display
              dsldProducts.push({
                input: inputProduct,
                found: true,
                dsld: {
                  id: dsldProduct.id,
                  fullName: dsldProduct.fullName,
                  brandName: dsldProduct.brandName,
                  upc: dsldProduct.upcSku,
                  servingSize: dsldProduct.servingSizes?.[0] 
                    ? `${dsldProduct.servingSizes[0].minQuantity} ${dsldProduct.servingSizes[0].unit}`
                    : undefined,
                  servingsPerContainer: dsldProduct.servingsPerContainer,
                  offMarket: false,
                  ingredients: dsldProduct.ingredients,
                },
              });
              
              // Convert to ParsedIngredient for rules engine
              for (const ing of dsldProduct.ingredients) {
                const formNote = ing.ingredientForm ? ` (as ${ing.ingredientForm})` : '';
                dsldEnrichedIngredients.push({
                  name: ing.name,
                  dose: ing.quantity?.toString(),
                  unit: ing.unit,
                  raw: `${ing.name}${formNote} ${ing.quantity || ''}${ing.unit || ''}`,
                });
              }
            } else {
              // Product not found in DSLD
              dsldProducts.push({
                input: inputProduct,
                found: false,
                message: `${inputProduct.brand} ${inputProduct.productName} not found in DSLD database`,
              });
            }
          }
        }
      } catch (error) {
        console.warn('DSLD enrichment failed, falling back to text parsing:', error);
      }
    }

    // Step 2: Parse raw input as fallback or supplement
    const textParsedIngredients = parseStackText(rawInput);
    
    // Step 3: Merge DSLD enriched + text parsed (prefer DSLD)
    const allIngredients = dsldEnrichedIngredients.length > 0 
      ? dsldEnrichedIngredients 
      : textParsedIngredients;

    if (allIngredients.length === 0) {
      return NextResponse.json(
        { error: "Couldn't parse any ingredients. Try listing them one per line." },
        { status: 422 }
      );
    }

    // Run rules engine
    const rules = runRulesEngine(allIngredients, goals as Goal[]);

    // Compute score
    const score = computeScore(
      rules.matched.length,
      allIngredients.length,
      rules.interactions.length,
      rules.redundancies.length,
      rules.evidenceBreakdown.weak + rules.evidenceBreakdown.none,
      rules.goalGaps.length
    );

    // Build teaser (deterministic — no LLM)
    const teaser = buildTeaser(rules, score, goals as Goal[]);

    // Calculate stack scores (Evidence/Safety/Optimization/Value)
    const ingredientNames = allIngredients.map(ing => ing.name);
    const userGoals = { primary: [goals[0]], secondary: goals.slice(1) };
    const stackScores = calculateStackScores(ingredientNames, userGoals);

    // Persist session + audit to Supabase
    const supabase = getSupabaseServer();

    // Upsert session with DSLD data
    await supabase.from("sessions").upsert({
      id: sessionId,
      raw_input: rawInput,
      goals: JSON.stringify(goals),
      ingredients: JSON.stringify(allIngredients),
      dsld_products: dsldProducts.length > 0 ? JSON.stringify(dsldProducts) : null,
    });

    // Create audit row
    const publicSlug = uuidv4().slice(0, 8);
    const user = await getCurrentUser();
    const { data: auditRow, error: auditError } = await supabase
      .from("audits")
      .insert({
        id: uuidv4(),
        session_id: sessionId,
        public_slug: publicSlug,
        score,
        teaser_json: JSON.stringify(teaser),
        report_json: null,
        email: user?.email ?? null,
        is_unlocked: false,
        ...(user ? { user_id: user.id } : {}),
      })
      .select()
      .single();

    if (auditError || !auditRow) {
      console.error("Supabase insert error:", auditError);
      return NextResponse.json(
        { error: "Failed to save audit. Please try again." },
        { status: 500 }
      );
    }

    // If the patient arrived via a practitioner invite link, attach them to
    // that practitioner's panel. Non-fatal — if the invite is expired/revoked
    // we just skip the link; the audit itself is already saved.
    let invitedBy: { id: string; name: string } | null = null;
    if (inviteToken) {
      invitedBy = await consumeInvite({
        supabase,
        token: inviteToken,
        sessionId,
        auditId: auditRow.id as string,
      });
    }

    return NextResponse.json({
      sessionId,
      publicSlug: auditRow.public_slug,
      auditId: auditRow.id,
      score,
      teaser,
      ingredientCount: allIngredients.length,
      matchedCount: rules.matched.length,
      stackScores,
      dsldEnriched: dsldProducts.length > 0,
      dsldProductCount: dsldProducts.filter(p => p.found).length,
      dsldProducts, // Include full DSLD data in response
      invitedBy,
    });
  } catch (err) {
    console.error("parse-stack error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * If the incoming request carried a practitioner invite token, validate it and
 * create the patient_link so the practitioner's dashboard picks up the new
 * patient on the next refresh. Silently skips on any failure — the audit is
 * saved regardless. Returns the practitioner's name for the client to render
 * a "You're now connected to Dr. X" confirmation.
 */
async function consumeInvite({
  supabase,
  token,
  sessionId,
  auditId,
}: {
  supabase: ReturnType<typeof getSupabaseServer>;
  token: string;
  sessionId: string;
  auditId: string;
}): Promise<{ id: string; name: string } | null> {
  try {
    const { data: invite } = await supabase
      .from("practitioner_invites")
      .select("id, practitioner_id, label, notes, max_uses, use_count, expires_at, revoked_at")
      .eq("token", token)
      .maybeSingle();

    if (!invite) return null;
    const row = invite as {
      id: string;
      practitioner_id: string;
      label: string | null;
      notes: string | null;
      max_uses: number | null;
      use_count: number;
      expires_at: string | null;
      revoked_at: string | null;
    };

    if (row.revoked_at) return null;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
    if (row.max_uses != null && row.use_count >= row.max_uses) return null;

    const { data: prac } = await supabase
      .from("practitioners")
      .select("name, is_active")
      .eq("id", row.practitioner_id)
      .maybeSingle();
    if (!prac || !(prac as { is_active: boolean }).is_active) return null;

    // Attach the audit to this practitioner's panel. Uses the same pattern as
    // POST /api/practitioner/patients but without a practitioner session cookie.
    const { data: quiz } = await supabase
      .from("quiz_responses")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from("patient_links").insert({
      practitioner_id: row.practitioner_id,
      session_id: sessionId,
      audit_id: auditId,
      quiz_response_id: (quiz as { id: string } | null)?.id ?? null,
      patient_label: row.label,
      notes: row.notes,
    });

    // Keep the patient_count column honest. Matches the logic we used in
    // /api/practitioner/patients when we removed the missing increment RPC.
    const { count } = await supabase
      .from("patient_links")
      .select("id", { count: "exact", head: true })
      .eq("practitioner_id", row.practitioner_id)
      .neq("status", "archived");
    await supabase
      .from("practitioners")
      .update({ patient_count: count ?? 0 })
      .eq("id", row.practitioner_id);

    await supabase
      .from("practitioner_invites")
      .update({
        use_count: row.use_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return { id: row.practitioner_id, name: (prac as { name: string }).name };
  } catch (err) {
    console.error("[parse-stack] consumeInvite failed:", err);
    return null;
  }
}

function buildTeaser(
  rules: ReturnType<typeof runRulesEngine>,
  score: number,
  goals: Goal[]
): TeaserResult {
  const findings: string[] = [];

  // Finding 1: redundancy or weak evidence
  if (rules.redundancies.length > 0) {
    const r = rules.redundancies[0];
    findings.push(
      `${r.items[0].name} and ${r.items[1].name} are doing the same job — you're paying twice for one outcome.`
    );
  } else if (rules.evidenceBreakdown.weak + rules.evidenceBreakdown.none > 0) {
    const count = rules.evidenceBreakdown.weak + rules.evidenceBreakdown.none;
    findings.push(
      `${count} supplement${count > 1 ? "s" : ""} in your stack ${count > 1 ? "have" : "has"} weak or no clinical evidence for your goals.`
    );
  } else {
    findings.push(
      `Your evidence-tier breakdown is better than average — but there are still gaps.`
    );
  }

  // Finding 2: interaction
  if (rules.interactions.length > 0) {
    const i = rules.interactions[0];
    findings.push(
      `${i.a.name} and ${i.b.name} are working against each other — a timing fix could unlock real results.`
    );
  } else if (rules.timingConflicts.length > 0) {
    findings.push(
      `Your timing stack has at least one conflict that's reducing what you're absorbing.`
    );
  } else {
    findings.push(
      `No major interactions — your stack is cleaner than most, but it's not optimized yet.`
    );
  }

  // Finding 3: goal gap
  if (rules.goalGaps.length > 0) {
    const gap = rules.goalGaps[0];
    const sug = gap.suggestedIngredients[0];
    findings.push(
      `There's one thing missing for your ${gap.goal} goal that outperforms most of what you're already taking.`
    );
  } else if (rules.matched.length > 0) {
    findings.push(
      `Your stack covers the basics well — the full report shows where to go from here.`
    );
  }

  const hook =
    score < 50
      ? `Your stack needs work — the full receipt shows you exactly what to cut, fix, and add.`
      : score < 70
      ? `You're closer than most, but there are two changes that would meaningfully improve your results.`
      : `Solid foundation — the full report shows how to sharpen the edges.`;

  return {
    score,
    headlineFindings: findings.slice(0, 3),
    teaserHook: hook,
  };
}
