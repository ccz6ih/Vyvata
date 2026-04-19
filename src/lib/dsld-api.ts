/**
 * NIH DSLD (Dietary Supplement Label Database) API Integration
 * 
 * Official US government database of supplement product labels
 * - Public domain, free API, zero legal exposure
 * - Structured ingredient data for every US supplement product
 * - UPC/GTIN codes for product linkage
 * - THIS IS THE STACK PARSER'S BEST FRIEND
 * 
 * API Documentation: https://dsld.od.nih.gov/api-guide
 * Rate Limits: 1,000 req/hour without key, 10,000 req/hour with free API key
 */

import { nsfRateLimiter } from './scrapers/rate-limiter'; // Reuse existing rate limiter

export interface DSLDProduct {
  id: number;
  fullName: string;
  brandName: string;
  
  // Product identifiers
  upcSku?: string;
  nhanesId?: string;
  
  // Label information
  servingSizes?: Array<{
    order: number;
    minQuantity: number;
    maxQuantity: number;
    unit: string;
  }>;
  servingsPerContainer?: string;
  netContents?: Array<{
    order: number;
    quantity: number;
    unit: string;
    display: string;
  }>;
  
  // Ingredients (parsed from ingredientRows)
  ingredients?: DSLDIngredient[];
  ingredientRows?: Array<{
    order: number;
    name: string;
    category: string;
    ingredientGroup: string;
    quantity?: Array<{
      quantity: number;
      unit: string;
      dailyValueTargetGroup?: Array<{
        operator: string;
        percent?: number;
      }>;
    }>;
    forms?: Array<{
      name: string;
      category: string;
    }>;
    notes?: string;
  }>;
  
  // Product info
  physicalState?: {
    langualCode: string;
    langualCodeDescription: string;
  };
  productType?: {
    langualCode: string;
    langualCodeDescription: string;
  };
  
  // Label claims
  claims?: string;
  userGroups?: string;
  
  // Metadata
  entryDate?: string;
  offMarket?: number; // 0 = on market, 1 = off market
}

export interface DSLDIngredient {
  name: string;
  quantity?: number;
  quantityMax?: number;
  unit?: string;
  percentDailyValue?: number;
  ingredientForm?: string;
  source?: string;
}

export interface DSLDSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  products: DSLDProduct[];
}

/**
 * Search DSLD by product name or brand
 */
export async function searchDSLD(
  query: string,
  options: {
    page?: number;
    perPage?: number;
    filterByBrand?: string;
  } = {}
): Promise<DSLDSearchResult> {
  // Official DSLD API v9 endpoint
  const baseUrl = 'https://api.ods.od.nih.gov/dsld/v9/search-filter';
  
  const params = new URLSearchParams({
    q: query
  });
  
  // If brand filter specified, combine with query
  if (options.filterByBrand) {
    params.set('q', `${options.filterByBrand} ${query}`);
  }
  
  const url = `${baseUrl}?${params.toString()}`;
  
  // Rate limit: 1,000 req/hour = ~0.28 req/sec (well within our limits)
  await nsfRateLimiter.throttle();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DSLD API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map DSLD API response structure: { hits: [...], stats: { count } }
    const hits = data.hits || [];
    const products = hits.map((hit: any) => ({
      id: parseInt(hit._id),
      fullName: hit._source.fullName,
      brandName: hit._source.brandName,
      upcSku: hit._source.upcSku,
      servingsPerContainer: hit._source.servingsPerContainer,
      physicalState: hit._source.physicalState,
      productType: hit._source.productType,
      entryDate: hit._source.entryDate,
      offMarket: hit._source.offMarket,
      claims: hit._source.claims,
      userGroups: hit._source.userGroups
    }));
    
    return {
      total_results: data.stats?.count || 0,
      page: options.page || 1,
      per_page: options.perPage || 20,
      products
    };
    
  } catch (error: any) {
    console.error('[DSLD] Search error:', error.message);
    throw error;
  }
}

/**
 * Get product by UPC/GTIN (most reliable lookup)
 * 
 * DSLD API requires wrapping UPC in quotes for exact match
 */
export async function getDSLDProductByUPC(upc: string): Promise<DSLDProduct | null> {
  // Use search-filter endpoint with quoted UPC for exact match
  const baseUrl = 'https://api.ods.od.nih.gov/dsld/v9/search-filter';
  
  // Wrap UPC in quotes (%22) for exact barcode search
  const encodedUpc = encodeURIComponent(`"${upc}"`);
  const url = `${baseUrl}?q=${encodedUpc}`;
  
  await nsfRateLimiter.throttle();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 404) {
      return null; // Product not found
    }
    
    if (!response.ok) {
      throw new Error(`DSLD API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Parse search results: { hits: [...] }
    const hits = data.hits || [];
    if (hits.length > 0) {
      // Search only returns basic info - fetch full label for complete details including ingredients
      const productId = hits[0]._id;
      return await getDSLDProductById(productId);
    }
    
    return null;
    
  } catch (error: any) {
    console.error('[DSLD] UPC lookup error:', error.message);
    throw error;
  }
}

/**
 * Extract ingredient form from notes field
 * Example: "Strontium (Form: from Strontium Citrate)" → "Strontium Citrate"
 */
function extractFormFromNotes(notes?: string): string | null {
  if (!notes) return null;
  
  const formMatch = notes.match(/Form:\s*from\s+([^)]+)\)/i) || notes.match(/\(([^)]+)\)/);
  return formMatch ? formMatch[1].trim() : null;
}

/**
 * Get product by DSLD ID
 */
export async function getDSLDProductById(dsldId: string): Promise<DSLDProduct | null> {
  // Official DSLD API v9 label endpoint
  const baseUrl = 'https://api.ods.od.nih.gov/dsld/v9/label';
  const url = `${baseUrl}/${dsldId}`;
  
  await nsfRateLimiter.throttle();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`DSLD API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Parse ingredients from ingredientRows if present
    if (data.ingredientRows && Array.isArray(data.ingredientRows)) {
      data.ingredients = data.ingredientRows.map((row: any) => {
        const quantity = row.quantity?.[0];
        const form = row.forms?.[0]?.name || extractFormFromNotes(row.notes);
        
        return {
          name: row.name,
          quantity: quantity?.quantity,
          unit: quantity?.unit,
          percentDailyValue: quantity?.dailyValueTargetGroup?.[0]?.percent,
          ingredientForm: form,
          source: row.ingredientGroup
        };
      });
    }
    
    // Label endpoint returns product directly (not nested)
    return data;
    
  } catch (error: any) {
    console.error('[DSLD] Product lookup error:', error.message);
    throw error;
  }
}

/**
 * Parse stack receipt using DSLD
 * 
 * This is the KILLER FEATURE - replaces manual OCR parsing!
 * 
 * Usage:
 * 1. User uploads receipt photo
 * 2. OCR extracts product names + brands
 * 3. DSLD API enriches with structured ingredient data
 * 4. No need to manually parse "Magnesium (as Magnesium Citrate) 200mg"
 */
export async function enrichStackFromDSLD(
  products: Array<{ brand: string; productName: string; upc?: string }>
): Promise<Array<DSLDProduct | null>> {
  const enrichedProducts: Array<DSLDProduct | null> = [];
  
  for (const product of products) {
    try {
      let dsldProduct: DSLDProduct | null = null;
      
      // Try UPC lookup first (most accurate)
      if (product.upc) {
        dsldProduct = await getDSLDProductByUPC(product.upc);
      }
      
      // Fallback to search by brand + product name
      if (!dsldProduct) {
        const searchResults = await searchDSLD(
          `${product.brand} ${product.productName}`,
          { filterByBrand: product.brand, perPage: 1 }
        );
        
        if (searchResults.products.length > 0) {
          // Search results only have basic info - fetch full label for ingredients
          const productId = searchResults.products[0].id.toString();
          dsldProduct = await getDSLDProductById(productId);
        }
      }
      
      enrichedProducts.push(dsldProduct);
      
      // Rate limiting between products
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`[DSLD] Failed to enrich ${product.brand} ${product.productName}:`, error.message);
      enrichedProducts.push(null);
    }
  }
  
  return enrichedProducts;
}

/**
 * Map DSLD ingredient to our ingredients database
 * 
 * This bridges DSLD data to our bioavailability scoring
 */
export function mapDSLDIngredientToOurs(dsldIngredient: DSLDIngredient): {
  name: string;
  dose: number;
  unit: string;
  form: string | null;
} {
  // Extract form from ingredientForm or source fields
  let form: string | null = dsldIngredient.ingredientForm || dsldIngredient.source || null;
  
  // Clean ingredient name
  const cleanName = dsldIngredient.name.trim();
  
  return {
    name: cleanName,
    dose: dsldIngredient.quantity || 0,
    unit: dsldIngredient.unit || 'mg',
    form
  };
}

/**
 * Check if DSLD API is available (health check)
 */
export async function checkDSLDAvailability(): Promise<boolean> {
  try {
    // Test with a simple search query
    const response = await fetch('https://api.ods.od.nih.gov/dsld/v9/search-filter?q=vitamin', {
      headers: {
        'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('[DSLD] Health check failed:', error);
    return false;
  }
}

/**
 * Sync product to database from DSLD
 */
export async function syncProductFromDSLD(
  dsldProduct: DSLDProduct,
  supabase: any
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    // Check if product already exists by UPC
    let existingProduct = null;
    if (dsldProduct.upcSku) {
      const { data } = await supabase
        .from('products')
        .select('id')
        .eq('upc', dsldProduct.upcSku)
        .single();
      existingProduct = data;
    }
    
    // Extract serving size from servingSizes array
    const servingSize = dsldProduct.servingSizes?.[0]
      ? `${dsldProduct.servingSizes[0].minQuantity} ${dsldProduct.servingSizes[0].unit}`
      : null;
    
    // Upsert product
    const productData = {
      brand: dsldProduct.brandName,
      name: dsldProduct.fullName,
      upc: dsldProduct.upcSku || null,
      serving_size: servingSize,
      servings_per_container: dsldProduct.servingsPerContainer ? parseInt(dsldProduct.servingsPerContainer) : null,
      status: dsldProduct.offMarket === 1 ? 'discontinued' : 'active',
      data_source: 'dsld',
      dsld_id: dsldProduct.id.toString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: product, error: productError } = existingProduct
      ? await supabase.from('products').update(productData).eq('id', existingProduct.id).select().single()
      : await supabase.from('products').insert(productData).select().single();
    
    if (productError) {
      return { success: false, error: productError.message };
    }
    
    // Sync ingredients
    if (dsldProduct.ingredients) {
      for (const ingredient of dsldProduct.ingredients) {
        const mapped = mapDSLDIngredientToOurs(ingredient);
        
        // Find ingredient in our database
        const { data: ourIngredient } = await supabase
          .from('ingredients') // Assuming we have an ingredients table
          .select('id')
          .ilike('name', mapped.name)
          .single();
        
        if (ourIngredient) {
          // Link to product_ingredients
          await supabase.from('product_ingredients').upsert({
            product_id: product.id,
            ingredient_id: ourIngredient.id,
            amount: mapped.dose,
            unit: mapped.unit,
            form: mapped.form,
            data_source: 'dsld'
          }, {
            onConflict: 'product_id,ingredient_id'
          });
        }
      }
    }
    
    return { success: true, productId: product.id };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
