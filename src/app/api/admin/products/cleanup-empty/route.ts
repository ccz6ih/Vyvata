/**
 * Admin endpoint: Cleanup products without ingredients
 * 
 * Deletes all products that have 0 ingredients
 * This allows them to be re-imported with proper ingredient data
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminSession } from "@/lib/admin-auth";

// Bypass RLS with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  // Check admin auth
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log('🧹 Starting cleanup of products without ingredients...');
    
    // Get all products
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select(`
        id,
        brand,
        name,
        product_ingredients (id)
      `);
    
    if (fetchError) {
      throw fetchError;
    }
    
    // Find products with 0 ingredients
    const emptyProducts = (allProducts || []).filter(
      (p: any) => !p.product_ingredients || p.product_ingredients.length === 0
    );
    
    console.log(`Found ${emptyProducts.length} products without ingredients`);
    
    if (emptyProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products to clean up',
        deleted: 0,
      });
    }
    
    // Delete products without ingredients
    const productIds = emptyProducts.map((p: any) => p.id);
    
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .in('id', productIds);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // Get updated count
    const { count: remainingCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Deleted ${emptyProducts.length} products without ingredients`);
    console.log(`   Remaining products: ${remainingCount}`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${emptyProducts.length} products without ingredients`,
      deleted: emptyProducts.length,
      remaining: remainingCount,
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Cleanup failed',
    }, { status: 500 });
  }
}
