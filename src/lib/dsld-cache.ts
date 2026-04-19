/**
 * Cached DSLD API Client
 * 
 * Implements aggressive caching as recommended:
 * - Daily refresh for active products
 * - Quarterly refresh for reference data
 * - All responses cached in Supabase
 * - Users hit our cache, not NIH servers
 * 
 * Rate limiting:
 * - 1,000 req/hour free tier (with backoff)
 * - 10,000 req/hour with API key (register at api.data.gov)
 */

import { createClient } from '@supabase/supabase-js';
import { nsfRateLimiter } from './scrapers/rate-limiter';

const DSLD_API_BASE = 'https://api.ods.od.nih.gov/dsld/v9';

// Cache expiration strategy
const CACHE_TTL = {
  ACTIVE_PRODUCT: 24 * 60 * 60 * 1000,      // 1 day - products in our DB
  SEARCH_RESULTS: 7 * 24 * 60 * 60 * 1000,  // 7 days - search results
  REFERENCE_DATA: 90 * 24 * 60 * 60 * 1000, // 90 days - fact sheets, static data
};

// Exponential backoff configuration
const BACKOFF_CONFIG = {
  initialDelay: 1000,    // 1 second
  maxDelay: 32000,       // 32 seconds
  maxRetries: 5,
  multiplier: 2,
};

export interface CachedResponse<T> {
  data: T;
  fromCache: boolean;
  fetchedAt: Date;
  cacheHit: boolean;
}

interface DsldCacheRow {
  id: string;
  cache_key: string;
  endpoint: string;
  response_data: unknown;
  fetched_at: string;
  expires_at: string;
  hit_count?: number;
  last_accessed?: string | null;
  needs_refresh?: boolean;
}

/**
 * Generate cache key from request params
 */
function generateCacheKey(endpoint: string, params?: Record<string, any>): string {
  const sortedParams = params 
    ? Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
    : '';
  return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
}

/**
 * Exponential backoff retry logic
 */
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> {
  try {
    await nsfRateLimiter.throttle();
    
    const response = await fetch(url, options);
    
    // Handle rate limiting and server errors
    if (response.status === 429 || response.status === 503) {
      if (retryCount >= BACKOFF_CONFIG.maxRetries) {
        throw new Error(`Max retries exceeded after ${response.status} errors`);
      }
      
      const delay = Math.min(
        BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, retryCount),
        BACKOFF_CONFIG.maxDelay
      );
      
      console.warn(`[DSLD Cache] Rate limited (${response.status}), backing off ${delay}ms (attempt ${retryCount + 1}/${BACKOFF_CONFIG.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithBackoff(url, options, retryCount + 1);
    }
    
    return response;
    
  } catch (error: any) {
    if (retryCount >= BACKOFF_CONFIG.maxRetries) {
      throw error;
    }
    
    const delay = Math.min(
      BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, retryCount),
      BACKOFF_CONFIG.maxDelay
    );
    
    console.warn(`[DSLD Cache] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${BACKOFF_CONFIG.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithBackoff(url, options, retryCount + 1);
  }
}

/**
 * Cached DSLD API Client
 */
export class CachedDSLDClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any;
  private apiKey?: string;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(supabase: any, apiKey?: string) {
    this.supabase = supabase;
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_DSLD_API_KEY;
    
    if (!this.apiKey) {
      console.warn('[DSLD Cache] No API key configured. Using free tier (1,000 req/hr). Register at api.data.gov for 10,000 req/hr.');
    }
  }
  
  /**
   * Search DSLD with caching
   */
  async search(query: string, options?: {
    perPage?: number;
    filterByBrand?: string;
  }): Promise<CachedResponse<any>> {
    const cacheKey = generateCacheKey('/search-filter', {
      q: query,
      per_page: options?.perPage || 20,
      brand: options?.filterByBrand,
    });
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return {
        data: cached.response_data,
        fromCache: true,
        fetchedAt: new Date(cached.fetched_at),
        cacheHit: true,
      };
    }
    
    // Fetch from API
    const url = new URL(`${DSLD_API_BASE}/search-filter`);
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', String(options?.perPage || 20));
    if (options?.filterByBrand) {
      url.searchParams.set('brand', options.filterByBrand);
    }
    
    const response = await fetchWithBackoff(url.toString(), {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`DSLD API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    await this.saveToCache({
      cacheKey,
      requestType: 'search',
      responseData: data,
      ttl: CACHE_TTL.SEARCH_RESULTS,
    });
    
    return {
      data,
      fromCache: false,
      fetchedAt: new Date(),
      cacheHit: false,
    };
  }
  
  /**
   * Get product label by ID with caching
   */
  async getProduct(dsldId: string, isActiveProduct = false): Promise<CachedResponse<any>> {
    const cacheKey = generateCacheKey(`/label/${dsldId}`);
    
    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      // Update hit count and last accessed
      await this.recordCacheHit(cached.id);
      
      return {
        data: cached.response_data,
        fromCache: true,
        fetchedAt: new Date(cached.fetched_at),
        cacheHit: true,
      };
    }
    
    // Fetch from API
    const url = `${DSLD_API_BASE}/label/${dsldId}`;
    const response = await fetchWithBackoff(url, {
      headers: this.getHeaders(),
    });
    
    if (response.status === 404) {
      return {
        data: null,
        fromCache: false,
        fetchedAt: new Date(),
        cacheHit: false,
      };
    }
    
    if (!response.ok) {
      throw new Error(`DSLD API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    await this.saveToCache({
      cacheKey,
      requestType: 'label',
      dsldId,
      productName: data.fullName,
      brandName: data.brandName,
      responseData: data,
      ttl: isActiveProduct ? CACHE_TTL.ACTIVE_PRODUCT : CACHE_TTL.REFERENCE_DATA,
      isActiveProduct,
    });
    
    return {
      data,
      fromCache: false,
      fetchedAt: new Date(),
      cacheHit: false,
    };
  }
  
  /**
   * Get from cache
   */
  private async getFromCache(cacheKey: string): Promise<DsldCacheRow | null> {
    const { data: raw, error } = await this.supabase
      .from('dsld_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !raw) return null;
    const data = raw as unknown as DsldCacheRow & { is_active_product?: boolean };
    
    // Check if expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Mark as needs refresh but still return (stale data better than no data)
      await this.supabase
        .from('dsld_cache')
        .update({ needs_refresh: true })
        .eq('id', data.id);
      
      // Only return if not too old (within 2x TTL)
      const fetchedAt = new Date(data.fetched_at);
      const age = Date.now() - fetchedAt.getTime();
      const maxStaleAge = data.is_active_product 
        ? CACHE_TTL.ACTIVE_PRODUCT * 2
        : CACHE_TTL.REFERENCE_DATA;
      
      if (age > maxStaleAge) {
        return null; // Too stale, refetch
      }
    }
    
    return data;
  }
  
  /**
   * Save to cache
   */
  private async saveToCache(params: {
    cacheKey: string;
    requestType: string;
    dsldId?: string;
    productName?: string;
    brandName?: string;
    responseData: any;
    ttl: number;
    isActiveProduct?: boolean;
  }) {
    const expiresAt = new Date(Date.now() + params.ttl);
    
    await this.supabase
      .from('dsld_cache')
      .upsert({
        cache_key: params.cacheKey,
        request_type: params.requestType,
        dsld_id: params.dsldId || null,
        product_name: params.productName || null,
        brand_name: params.brandName || null,
        response_data: params.responseData,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active_product: params.isActiveProduct || false,
        needs_refresh: false,
        hit_count: 0,
      }, {
        onConflict: 'cache_key',
      });
  }
  
  /**
   * Record cache hit
   */
  private async recordCacheHit(cacheId: string) {
    await this.supabase.rpc('increment_dsld_cache_hit', { cache_id: cacheId });
  }
  
  /**
   * Get request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)',
    };
    
    // Include API key if available
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }
    
    return headers;
  }
}

/**
 * Helper to create singleton client
 */
let cachedClient: CachedDSLDClient | null = null;

export function getCachedDSLDClient(supabase: ReturnType<typeof createClient>): CachedDSLDClient {
  if (!cachedClient) {
    cachedClient = new CachedDSLDClient(supabase);
  }
  return cachedClient;
}

/**
 * RPC function for incrementing cache hits (add to migration)
 */
export const incrementCacheHitSQL = `
CREATE OR REPLACE FUNCTION increment_dsld_cache_hit(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE dsld_cache
  SET 
    hit_count = hit_count + 1,
    last_accessed_at = NOW()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;
`;
