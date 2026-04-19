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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { rawInput, goals, sessionId } = parsed.data;

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
    });
  } catch (err) {
    console.error("parse-stack error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
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
