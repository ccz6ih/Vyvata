import { NextRequest, NextResponse } from 'next/server';
import { syncAllProductCertifications, syncProductCertifications } from '@/lib/scrapers/certification-sync';
import { hasAdminSession } from '@/lib/admin-auth';

// 165 products × real NSF registry fetch + per-product match comfortably
// fits in ~60s once USP/Informed stubs are short-circuited. Raising to
// Vercel Pro's 300s ceiling in case the catalogue keeps growing.
export const maxDuration = 300;

/**
 * POST /api/admin/sync-certifications
 *
 * Manually trigger certification sync for all products or a specific product
 *
 * Body (optional):
 * {
 *   "productId": "uuid",     // Sync specific product only
 *   "brand": "Thorne",       // Required if productId provided
 *   "productName": "Magnesium Bisglycinate"  // Required if productId provided
 * }
 */
export async function POST(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Sync specific product
    if (body.productId) {
      if (!body.brand || !body.productName) {
        return NextResponse.json({
          success: false,
          error: 'brand and productName required when syncing specific product'
        }, { status: 400 });
      }

      const result = await syncProductCertifications(
        body.productId,
        body.brand,
        body.productName
      );

      return NextResponse.json({
        success: result.errors.length === 0,
        productId: result.productId,
        brand: result.brand,
        productName: result.productName,
        certificationsFound: result.certificationsFound,
        certificationsAdded: result.certificationsAdded,
        errors: result.errors
      });
    }

    // Sync all products
    const result = await syncAllProductCertifications();

    return NextResponse.json({
      success: result.errors === 0,
      synced: result.synced,
      errors: result.errors,
      totalProducts: result.results.length,
      message: `Synced ${result.synced} products, ${result.errors} errors`,
      results: result.results
    });

  } catch (error: any) {
    console.error('[API] Certification sync error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/sync-certifications
 * 
 * Get certification sync status
 */
export async function GET(_req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { getCertificationSyncStatus } = await import('@/lib/scrapers/certification-sync');
    const status = await getCertificationSyncStatus();

    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    console.error('[API] Get sync status error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
