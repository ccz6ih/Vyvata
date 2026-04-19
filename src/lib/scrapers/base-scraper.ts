/**
 * Base Scraper Class
 * 
 * Provides common functionality for all certification scrapers:
 * - Rate limiting
 * - Error handling
 * - Retry logic
 * - User agent management
 * - Response validation
 */

import { RateLimiter, retryWithBackoff } from './rate-limiter';

export interface ScraperConfig {
  userAgent?: string;
  timeout?: number;
  maxRetries?: number;
  validateSsl?: boolean;
}

export interface ScraperResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  scrapedAt: string;
}

export abstract class BaseScraper {
  protected rateLimiter: RateLimiter;
  protected userAgent: string;
  protected timeout: number;
  protected maxRetries: number;
  protected validateSsl: boolean;

  constructor(
    rateLimiter: RateLimiter,
    config: ScraperConfig = {}
  ) {
    this.rateLimiter = rateLimiter;
    this.userAgent = config.userAgent || 'VyvataStandardsBot/1.0 (+https://vyvata.com/bot)';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.maxRetries = config.maxRetries || 3;
    this.validateSsl = config.validateSsl ?? true;
  }

  /**
   * Make a rate-limited HTTP request
   */
  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    await this.rateLimiter.throttle();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': this.userAgent,
            ...options.headers
          },
          signal: controller.signal
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
      }, this.maxRetries);

      return response;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Log scraper activity
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.constructor.name}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Create a successful result
   */
  protected success<T>(data: T, source: string): ScraperResult<T> {
    return {
      success: true,
      data,
      source,
      scrapedAt: new Date().toISOString()
    };
  }

  /**
   * Create an error result
   */
  protected failure<T>(error: string, source: string): ScraperResult<T> {
    return {
      success: false,
      error,
      source,
      scrapedAt: new Date().toISOString()
    };
  }

  /**
   * Abstract method: implement in child classes
   */
  abstract scrape(...args: any[]): Promise<ScraperResult<any>>;
}

/**
 * Common certification result interface
 */
export interface CertificationResult {
  brand: string;
  productName: string;
  certificationType: string;
  certificationNumber?: string;
  issuedDate?: string;
  expirationDate?: string;
  batchNumber?: string;
  verificationUrl: string;
  rawData?: any;
}

/**
 * Normalize product names for comparison
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Check if two product names match (fuzzy matching)
 */
export function productsMatch(
  searchName: string,
  resultName: string,
  threshold: number = 0.7
): boolean {
  const normalized1 = normalizeProductName(searchName);
  const normalized2 = normalizeProductName(resultName);

  // Exact match
  if (normalized1 === normalized2) return true;

  // Contains match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  // Fuzzy similarity (simple word overlap)
  const words1 = normalized1.split(' ');
  const words2 = normalized2.split(' ');
  
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  
  return (commonWords / totalWords) >= threshold;
}
