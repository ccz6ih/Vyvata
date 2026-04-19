import { NextRequest, NextResponse } from 'next/server';
import { nsfSportScraper } from '@/lib/scrapers/nsf-sport';
import { hasAdminSession } from '@/lib/admin-auth';

export const maxDuration = 60;

/**
 * GET /api/admin/test-nsf-match?brand=Thorne&product=Magnesium
 * 
 * Test NSF Sport matching for a specific brand/product to diagnose why
 * certifications aren't being found
 */
export async function GET(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const brand = searchParams.get('brand');
  const product = searchParams.get('product');

  if (!brand || !product) {
    return NextResponse.json({
      error: 'Missing required params: brand and product',
      example: '/api/admin/test-nsf-match?brand=Thorne&product=Magnesium'
    }, { status: 400 });
  }

  try {
    // Load full NSF registry
    const registry = await nsfSportScraper.loadRegistry();
    
    // Find exact matches using the same logic as cert sync
    const matches = await nsfSportScraper.findMatches(brand, product);

    // Find partial brand matches (to see if brand name format is wrong)
    const brandLower = brand.toLowerCase();
    const partialBrandMatches = registry.filter(l => 
      l.brand.toLowerCase().includes(brandLower) ||
      brandLower.includes(l.brand.toLowerCase())
    );

    // Find partial product matches for this brand
    const productLower = product.toLowerCase();
    const partialProductMatches = registry.filter(l => 
      l.brand.toLowerCase() === brandLower &&
      (l.productName.toLowerCase().includes(productLower) ||
       productLower.includes(l.productName.toLowerCase()))
    );

    return NextResponse.json({
      success: true,
      query: { brand, product },
      registrySize: registry.length,
      exactMatches: matches.length,
      matches: matches.slice(0, 10), // Limit to first 10
      diagnostics: {
        partialBrandMatches: partialBrandMatches.length,
        sampleBrandMatches: partialBrandMatches.slice(0, 5),
        partialProductMatches: partialProductMatches.length,
        sampleProductMatches: partialProductMatches.slice(0, 5)
      }
    });

  } catch (error: any) {
    console.error('[Test NSF Match] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
