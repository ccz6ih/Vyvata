/**
 * Rate Limiter for Certification Scrapers
 * 
 * Implements respectful rate limiting to avoid overwhelming certification databases
 * and to comply with fair use policies.
 */

export class RateLimiter {
  private lastRequest: number = 0;
  private minInterval: number;
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private maxRequestsPerWindow: number;
  private windowDuration: number;

  /**
   * @param requestsPerSecond Maximum requests per second (default: 1)
   * @param maxRequestsPerWindow Maximum requests per time window (default: 100)
   * @param windowDurationMs Time window in milliseconds (default: 60000 = 1 minute)
   */
  constructor(
    requestsPerSecond: number = 1,
    maxRequestsPerWindow: number = 100,
    windowDurationMs: number = 60000
  ) {
    this.minInterval = 1000 / requestsPerSecond;
    this.maxRequestsPerWindow = maxRequestsPerWindow;
    this.windowDuration = windowDurationMs;
  }

  /**
   * Throttle the next request based on rate limits
   * Throws error if window limit exceeded
   */
  async throttle(): Promise<void> {
    const now = Date.now();

    // Check if we've exceeded window limit
    if (now - this.windowStart > this.windowDuration) {
      // Reset window
      this.windowStart = now;
      this.requestCount = 0;
    }

    if (this.requestCount >= this.maxRequestsPerWindow) {
      const waitTime = this.windowDuration - (now - this.windowStart);
      throw new Error(
        `Rate limit exceeded: ${this.maxRequestsPerWindow} requests per ${this.windowDuration}ms. ` +
        `Wait ${Math.ceil(waitTime / 1000)}s before retrying.`
      );
    }

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
    this.requestCount++;
  }

  /**
   * Get current rate limit status
   */
  getStatus() {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;
    const windowRemaining = Math.max(0, this.windowDuration - windowElapsed);

    return {
      requestsInCurrentWindow: this.requestCount,
      maxRequestsPerWindow: this.maxRequestsPerWindow,
      windowRemaining: Math.ceil(windowRemaining / 1000),
      requestsRemaining: Math.max(0, this.maxRequestsPerWindow - this.requestCount)
    };
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.lastRequest = 0;
    this.requestCount = 0;
    this.windowStart = Date.now();
  }
}

// Pre-configured rate limiters for different services
export const nsfRateLimiter = new RateLimiter(
  0.5,  // 1 request per 2 seconds
  30,   // Max 30 requests per window
  60000 // 1 minute window
);

export const uspRateLimiter = new RateLimiter(
  0.5,
  30,
  60000
);

export const informedSportRateLimiter = new RateLimiter(
  0.25, // 1 request per 4 seconds (very conservative)
  15,   // Max 15 requests per window
  60000
);

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message?.includes('Rate limit exceeded')) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
