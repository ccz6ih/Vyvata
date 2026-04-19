// POST /api/enrich-stack
// Accepts array of products (brand + name + optional UPC)
// Returns enriched ingredient data from DSLD API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichStackFromDSLD } from "@/lib/dsld-api";

const ProductSchema = z.object({
  brand: z.string().min(1),
  productName: z.string().min(1),
  upc: z.string().optional(),
});

const BodySchema = z.object({
  products: z.array(ProductSchema).min(1).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { products } = parsed.data;

    console.log('[ENRICH-STACK] Enriching', products.length, 'products via DSLD...');

    // Enrich products with DSLD API
    const enrichedProducts = await enrichStackFromDSLD(products);

    // Format response with useful data
    const results = products.map((product, i) => {
      const dsldData = enrichedProducts[i];
      
      if (!dsldData) {
        return {
          input: product,
          found: false,
          message: `Product not found in DSLD database`
        };
      }

      return {
        input: product,
        found: true,
        dsld: {
          id: dsldData.id,
          fullName: dsldData.fullName,
          brandName: dsldData.brandName,
          upc: dsldData.upcSku,
          servingSize: dsldData.servingSizes?.[0] 
            ? `${dsldData.servingSizes[0].minQuantity} ${dsldData.servingSizes[0].unit}`
            : null,
          servingsPerContainer: dsldData.servingsPerContainer,
          offMarket: dsldData.offMarket === 1,
          ingredients: dsldData.ingredients?.map(ing => ({
            name: ing.name,
            dose: ing.quantity,
            unit: ing.unit,
            form: ing.ingredientForm,
            percentDV: ing.percentDailyValue,
          })) || []
        }
      };
    });

    // Calculate summary stats
    const summary = {
      total: products.length,
      found: results.filter(r => r.found).length,
      notFound: results.filter(r => !r.found).length,
      totalIngredients: results
        .filter(r => r.found)
        .reduce((sum, r) => sum + (r.dsld?.ingredients?.length || 0), 0)
    };

    return NextResponse.json({
      success: true,
      summary,
      results
    });

  } catch (error: any) {
    console.error('[ENRICH-STACK] Error:', error);
    return NextResponse.json(
      { error: "Failed to enrich stack", details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/enrich-stack
// Returns API documentation
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/enrich-stack",
    method: "POST",
    description: "Enrich supplement stack with DSLD API data",
    rateLimit: "1,000 requests/hour (DSLD free tier)",
    dataSource: "NIH DSLD (212,642+ supplement labels, public domain)",
    body: {
      products: [
        {
          brand: "Thorne",
          productName: "Magnesium Bisglycinate",
          upc: "optional - improves accuracy"
        }
      ]
    },
    response: {
      summary: {
        total: 1,
        found: 1,
        notFound: 0,
        totalIngredients: 1
      },
      results: [
        {
          input: { brand: "...", productName: "..." },
          found: true,
          dsld: {
            id: 181813,
            fullName: "Magnesium Bisglycinate",
            brandName: "Thorne",
            upc: "6 93749 00644 2",
            ingredients: [
              {
                name: "Magnesium",
                dose: 200,
                unit: "mg",
                form: "TRAACS Magnesium Bisglycinate Chelate"
              }
            ]
          }
        }
      ]
    }
  });
}
