import { NextRequest, NextResponse } from 'next/server';
import { syncProductCertifications } from '@/lib/scrapers/certification-sync';
import { hasAdminSession } from '@/lib/admin-auth';
import { getSupabaseServer } from '@/lib/supabase';

export const maxDuration = 300;

/**
 * POST /api/admin/sync-certifications-targeted
 * 
 * Sync only products from brands known to have NSF Sport certifications
 * (Thorne, Nordic Naturals, Garden of Life)
 * 
 * Much faster than syncing all 190 products
 */
export async function POST(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  try {
    // Only sync brands that have NSF Sport certifications
    const TARGET_BRANDS = ['Thorne', 'Nordic Naturals', 'Garden of Life'];

    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, brand, name')
      .in('brand', TARGET_BRANDS)
      .eq('status', 'active');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products found for targeted brands',
        targetedBrands: TARGET_BRANDS
      }, { status: 404 });
    }

    console.log(`[Targeted Cert Sync] Processing ${products.length} products from ${TARGET_BRANDS.join(', ')}`);

    const results = [];
    let synced = 0;
    let errors = 0;

    for (const product of products) {
      try {
        console.log(`\n[Sync] Processing: ${product.brand} ${product.name}`);

        const result = await syncProductCertifications(
          product.id,
          product.brand,
          product.name
        );

        results.push(result);

        if (result.certificationsAdded > 0) {
          console.log(`[Sync] ✓ Added ${result.certificationsAdded} certifications`);
          synced++;
        }

        if (result.errors.length > 0) {
          console.error(`[Sync] Errors:`, result.errors);
          errors++;
        }

        // Shorter delay since we're only processing ~20 products
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`[Sync] Failed to sync ${product.brand} ${product.name}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: errors === 0,
      message: `Synced ${synced} products with certifications from ${TARGET_BRANDS.join(', ')}`,
      stats: {
        totalProcessed: products.length,
        productsWithCerts: synced,
        errors,
        targetedBrands: TARGET_BRANDS
      },
      results: results.filter(r => r.certificationsAdded > 0) // Only show products that got certs
    });

  } catch (error: any) {
    console.error('[Targeted Cert Sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
