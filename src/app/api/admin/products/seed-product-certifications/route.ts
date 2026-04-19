import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { hasAdminSession } from '@/lib/admin-auth';

export const maxDuration = 60;

/**
 * Known product-level certifications from brand websites and public registries
 * 
 * Research sources:
 * - NSF Sport: https://www.nsfsport.com/certified-products/search-results.php
 * - USP Verified: https://www.quality-supplements.org/ (redirects to current site)
 * - Informed Sport: https://sport.wetestyoutrust.com/
 * - Brand websites with certification badges
 * 
 * Format: { brand: { product: [certTypes] } }
 */
const KNOWN_PRODUCT_CERTIFICATIONS: Record<string, Record<string, string[]>> = {
  'Thorne': {
    // Thorne has NSF Sport certifications for athletic products
    // https://www.thorne.com/certifications
    'Amino Complex': ['nsf_sport'],
    'Creatine': ['nsf_sport'],
    'Catalyte': ['nsf_sport'],
    'RecoveryPro': ['nsf_sport'],
    'Super EPA': ['nsf_sport'],
  },
  
  'Pure Encapsulations': {
    // Pure Encapsulations focuses on cGMP but some products have USP verification
    // Note: Most PE products rely on manufacturer certs, not product-level NSF Sport
  },
  
  'Nordic Naturals': {
    // Nordic Naturals omega products often have third-party testing
    // Check their site for specific USP or IFOS certifications
  },
  
  'Life Extension': {
    // Life Extension has some NSF certified products
  },
  
  'Jarrow Formulas': {
    // Jarrow products with certifications
  },
  
  'NOW Foods': {
    // NOW has extensive USP verification
  },
  
  'Garden of Life': {
    // Garden of Life has many organic/non-GMO certifications
    // Plus NSF Sport for athletic products
  },
  
  // Add more brands as you research their certification status
};

/**
 * POST /api/admin/products/seed-product-certifications
 * 
 * Manually seed known product-level certifications based on brand website
 * research and public certification databases.
 * 
 * This is a workaround for the stubbed USP/Informed Sport scrapers.
 */
export async function POST(req: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[]
  };

  try {
    // Fetch all products to match against known certifications
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, brand, name')
      .eq('status', 'active');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products found',
        results
      }, { status: 404 });
    }

    // Process each product
    for (const product of products) {
      const brandCerts = KNOWN_PRODUCT_CERTIFICATIONS[product.brand];
      if (!brandCerts) continue; // No known certs for this brand

      // Match product name (fuzzy matching)
      const productCerts = Object.entries(brandCerts).find(([certProductName]) => {
        const normalizedProduct = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedCert = certProductName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedProduct.includes(normalizedCert) || 
               normalizedCert.includes(normalizedProduct);
      });

      if (!productCerts) continue; // No certs for this specific product

      const [, certTypes] = productCerts;

      // Seed each certification type
      for (const certType of certTypes) {
        try {
          // Check if cert already exists
          const { data: existing } = await supabase
            .from('certifications')
            .select('id')
            .eq('product_id', product.id)
            .eq('type', certType)
            .single();

          if (existing) {
            results.skipped++;
            continue;
          }

          // Insert certification
          const { error: insertError } = await supabase
            .from('certifications')
            .insert({
              product_id: product.id,
              type: certType,
              verified: true,
              verification_url: `Manually seeded from brand website research`,
              notes: `Seeded on ${new Date().toISOString()} from known public certifications`,
              verified_at: new Date().toISOString()
            });

          if (insertError) {
            results.errors.push(`${product.brand} ${product.name} (${certType}): ${insertError.message}`);
          } else {
            results.created++;
            console.log(`✓ Added ${certType} to ${product.brand} ${product.name}`);
          }

        } catch (error: any) {
          results.errors.push(`${product.brand} ${product.name}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      message: `Seeded ${results.created} product certifications`,
      results
    });

  } catch (error: any) {
    console.error('[Seed Product Certs] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 });
  }
}
