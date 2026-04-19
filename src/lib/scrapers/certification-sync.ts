/**
 * Certification Sync Orchestrator
 * 
 * Coordinates all certification scrapers and syncs results to Supabase database
 */

import { nsfSportScraper } from './nsf-sport';
import { uspVerifiedScraper } from './usp-verified';
import { informedSportScraper } from './informed-sport';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ProductCertifications {
  brand: string;
  productName: string;
  certifications: {
    nsf_sport: boolean;
    usp_verified: boolean;
    informed_sport: boolean;
  };
  details: any[];
  syncedAt: string;
}

export interface SyncResult {
  productId: string;
  brand: string;
  productName: string;
  certificationsFound: string[];
  certificationsAdded: number;
  errors: string[];
}

/**
 * Check all certification databases for a specific product
 */
export async function checkAllCertifications(
  brand: string,
  productName: string
): Promise<ProductCertifications> {
  console.log(`[CertSync] Checking certifications for: ${brand} ${productName}`);

  const certifications = {
    nsf_sport: false,
    usp_verified: false,
    informed_sport: false
  };
  const details: any[] = [];

  // Check NSF Sport
  try {
    const nsfResult = await nsfSportScraper.scrape(`${brand} ${productName}`);
    if (nsfResult.success && nsfResult.data && nsfResult.data.length > 0) {
      certifications.nsf_sport = true;
      details.push(...nsfResult.data.map(d => ({ source: 'nsf_sport', ...d })));
      console.log(`[CertSync] ✓ NSF Sport certified`);
    } else {
      console.log(`[CertSync] ✗ NSF Sport: ${nsfResult.error || 'Not found'}`);
    }
  } catch (error: any) {
    console.error(`[CertSync] NSF Sport error:`, error.message);
  }

  // Check USP Verified
  try {
    const uspResult = await uspVerifiedScraper.scrape(`${brand} ${productName}`);
    if (uspResult.success && uspResult.data && uspResult.data.length > 0) {
      certifications.usp_verified = true;
      details.push(...uspResult.data.map(d => ({ source: 'usp_verified', ...d })));
      console.log(`[CertSync] ✓ USP Verified`);
    } else {
      console.log(`[CertSync] ✗ USP Verified: ${uspResult.error || 'Not found'}`);
    }
  } catch (error: any) {
    console.error(`[CertSync] USP Verified error:`, error.message);
  }

  // Check Informed Sport
  try {
    const informedResult = await informedSportScraper.scrape(`${brand} ${productName}`);
    if (informedResult.success && informedResult.data && informedResult.data.length > 0) {
      certifications.informed_sport = true;
      details.push(...informedResult.data.map(d => ({ source: 'informed_sport', ...d })));
      console.log(`[CertSync] ✓ Informed Sport certified`);
    } else {
      console.log(`[CertSync] ✗ Informed Sport: ${informedResult.error || 'Not found'}`);
    }
  } catch (error: any) {
    console.error(`[CertSync] Informed Sport error:`, error.message);
  }

  return {
    brand,
    productName,
    certifications,
    details,
    syncedAt: new Date().toISOString()
  };
}

/**
 * Sync certifications for a single product to database
 */
export async function syncProductCertifications(
  productId: string,
  brand: string,
  productName: string
): Promise<SyncResult> {
  const result: SyncResult = {
    productId,
    brand,
    productName,
    certificationsFound: [],
    certificationsAdded: 0,
    errors: []
  };

  try {
    // Check all certification sources
    const certData = await checkAllCertifications(brand, productName);

    // Upsert certifications to database
    for (const [certType, isVerified] of Object.entries(certData.certifications)) {
      if (isVerified) {
        const detail = certData.details.find(d => d.source === certType);
        
        if (detail) {
          try {
            const { error } = await supabase
              .from('certifications')
              .upsert({
                product_id: productId,
                type: certType,
                verified: true,
                verification_url: detail.verificationUrl || '',
                certificate_number: detail.certificationNumber || detail.batchNumber || null,
                issued_date: detail.issuedDate || detail.testDate || null,
                expiration_date: detail.expirationDate || null,
                verified_at: new Date().toISOString(),
                notes: `Auto-synced via certification scraper on ${new Date().toLocaleDateString()}`
              }, {
                onConflict: 'product_id,type'
              });

            if (error) {
              result.errors.push(`Failed to save ${certType}: ${error.message}`);
            } else {
              result.certificationsFound.push(certType);
              result.certificationsAdded++;
            }
          } catch (error: any) {
            result.errors.push(`Database error for ${certType}: ${error.message}`);
          }
        }
      }
    }

    return result;

  } catch (error: any) {
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Sync all products in database
 */
export async function syncAllProductCertifications() {
  console.log('[CertSync] Starting full certification sync...');

  // Fetch all active products
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, brand, name')
    .eq('status', 'active')
    .order('brand', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch products: ${fetchError.message}`);
  }

  if (!products || products.length === 0) {
    console.log('[CertSync] No products found to sync');
    return { synced: 0, errors: 0, results: [] };
  }

  console.log(`[CertSync] Found ${products.length} products to sync`);

  const results: SyncResult[] = [];
  let synced = 0;
  let errors = 0;

  for (const product of products) {
    try {
      console.log(`\n[CertSync] Processing: ${product.brand} ${product.name}`);

      const result = await syncProductCertifications(
        product.id,
        product.brand,
        product.name
      );

      results.push(result);

      if (result.certificationsAdded > 0) {
        console.log(`[CertSync] ✓ Added ${result.certificationsAdded} certifications`);
        synced++;
      } else {
        console.log(`[CertSync] ○ No certifications found`);
      }

      if (result.errors.length > 0) {
        console.error(`[CertSync] Errors:`, result.errors);
        errors++;
      }

      // Rate limiting between products (5 seconds = ~3 scrapers * rate limiter)
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error: any) {
      console.error(`[CertSync] Failed to sync ${product.brand} ${product.name}:`, error);
      errors++;
    }
  }

  console.log('\n[CertSync] ===== SYNC COMPLETE =====');
  console.log(`[CertSync] Total products: ${products.length}`);
  console.log(`[CertSync] Products with certs: ${synced}`);
  console.log(`[CertSync] Errors: ${errors}`);

  return { synced, errors, results };
}

/**
 * Get certification sync status
 */
export async function getCertificationSyncStatus() {
  const { data, error } = await supabase
    .from('certifications')
    .select(`
      id,
      type,
      verified,
      verified_at,
      product:products(brand, name)
    `)
    .eq('verified', true)
    .order('verified_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  // Group by certification type
  const summary = {
    nsf_sport: 0,
    usp_verified: 0,
    informed_sport: 0,
    total: data?.length || 0,
    lastSync: data?.[0]?.verified_at || null
  };

  data?.forEach(cert => {
    if (cert.type in summary) {
      summary[cert.type as keyof typeof summary]++;
    }
  });

  return {
    summary,
    recentCertifications: data
  };
}
