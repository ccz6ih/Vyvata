// GET /api/practitioner/products/recommendations
// Returns product recommendations based on query parameters
// For practitioners to recommend specific products to patients

import { NextRequest, NextResponse } from "next/server";
import { getPractitionerSession } from "@/lib/practitioner-auth";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  // Note: Products are public data, no auth required for browsing
  // const session = await getPractitionerSession();
  // if (!session) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const ingredient = searchParams.get('ingredient');
  const minScore = parseInt(searchParams.get('minScore') || '60');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  const supabase = getSupabaseServer();
  
  try {
    let query = supabase
      .from('products')
      .select(`
        id,
        brand,
        name,
        category,
        serving_size,
        servings_per_container,
        price_usd,
        status,
        product_ingredients (
          ingredient_name,
          dose,
          unit,
          form,
          bioavailability
        ),
        certifications (
          type,
          verified
        ),
        product_scores (
          integrity_score,
          formulation_score,
          transparency_score,
          tier,
          is_current
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }
    
    // Filter by ingredient if provided
    if (ingredient) {
      const { data: productsWithIngredient } = await supabase
        .from('product_ingredients')
        .select('product_id')
        .ilike('ingredient_name', `%${ingredient}%`);
      
      if (productsWithIngredient) {
        const productIds = productsWithIngredient.map(p => p.product_id);
        query = query.in('id', productIds);
      }
    }
    
    query = query.limit(limit);
    
    const { data: products, error } = await query;
    
    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
    
    // Filter by score and format response
    const recommendations = (products || [])
      .map((product: any) => {
        const currentScore = product.product_scores?.find((s: any) => s.is_current);
        
        return {
          id: product.id,
          brand: product.brand,
          name: product.name,
          category: product.category,
          serving_size: product.serving_size,
          servings_per_container: product.servings_per_container,
          price_usd: product.price_usd,
          
          ingredients: product.product_ingredients || [],
          certifications: product.certifications || [],
          
          score: currentScore ? {
            integrity: currentScore.integrity_score,
            formulation: currentScore.formulation_score,
            transparency: currentScore.transparency_score,
            tier: currentScore.tier,
          } : null,
        };
      })
      .filter((p: any) => !p.score || p.score.integrity >= minScore)
      .sort((a: any, b: any) => {
        const scoreA = a.score?.integrity || 0;
        const scoreB = b.score?.integrity || 0;
        return scoreB - scoreA;
      });
    
    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      filters: {
        category: category || 'all',
        ingredient: ingredient || null,
        minScore,
      },
    });
    
  } catch (error: any) {
    console.error('Recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
