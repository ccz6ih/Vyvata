/**
 * NSF Certified for Sport scraper.
 *
 * NSF's product search page is server-rendered — all 2,600+ certified
 * products live on a single /certified-products/search-results.php page
 * (~2 MB). Instead of hitting the site 165 times during a catalog sync,
 * we fetch the full listing ONCE per scraper instance and match against
 * an in-memory registry. Brand+name matching is fuzzy (case-insensitive
 * substring both ways) because NSF lists products with brand+flavor+form
 * mashed into the name field while our DB stores just brand + product.
 *
 * The HTML shape (verified via the site's network inspector):
 *
 *   <li class="listng-results__item lazyload  {tags...}">
 *     <a href="/certified-products/listing-detail.php?id=1780300">
 *       <img class="results__image" ...>
 *       <div class="listing__product-text">
 *         <p class="results__product-name">10X Health Amino Blend Fruit Punch</p>
 *         <p class="results__company-name">10X Health</p>
 *       </div>
 *     </a>
 *   </li>
 *
 * Note: the list item class really is misspelled `listng-results__item`.
 */

import { BaseScraper, CertificationResult, ScraperResult } from "./base-scraper";
import { nsfRateLimiter } from "./rate-limiter";
import * as cheerio from "cheerio";

const NSF_SEARCH_URL = "https://www.nsfsport.com/certified-products/search-results.php";
const NSF_DETAIL_BASE = "https://www.nsfsport.com";

// How long a scraped registry stays valid in-process. NSF adds certs at
// most a few times per week; an hour is plenty and keeps back-to-back
// admin clicks off the wire.
const REGISTRY_TTL_MS = 60 * 60 * 1000;

export interface NSFSportListing {
  brand: string;
  productName: string;
  detailUrl: string;
  listingId: string | null;
}

export interface NSFSportResult extends CertificationResult {
  certificationType: "nsf_sport";
  listingId?: string;
}

interface CachedRegistry {
  listings: NSFSportListing[];
  fetchedAt: number;
}

export class NSFSportScraper extends BaseScraper {
  private cache: CachedRegistry | null = null;

  constructor() {
    super(nsfRateLimiter, {
      userAgent: "VyvataStandardsBot/1.0 (+https://vyvata.com/contact)",
      timeout: 60000,
      maxRetries: 2,
    });
  }

  /**
   * Fetch + parse the full NSF certified-for-sport registry. Cached for
   * REGISTRY_TTL_MS per scraper instance so repeated lookups in the same
   * sync share one HTTP round-trip.
   */
  async loadRegistry(force = false): Promise<NSFSportListing[]> {
    if (!force && this.cache && Date.now() - this.cache.fetchedAt < REGISTRY_TTL_MS) {
      return this.cache.listings;
    }

    this.log(`Loading NSF Sport registry from ${NSF_SEARCH_URL}`);
    const response = await this.fetch(NSF_SEARCH_URL);
    const html = await response.text();

    const $ = cheerio.load(html);
    const listings: NSFSportListing[] = [];
    $("li.listng-results__item").each((_, elem) => {
      const $elem = $(elem);
      const productName = $elem.find(".results__product-name").first().text().trim();
      const brand = $elem.find(".results__company-name").first().text().trim();
      const href = $elem.find("a").first().attr("href") ?? "";
      if (!productName || !brand) return;
      const idMatch = href.match(/id=(\d+)/);
      listings.push({
        brand,
        productName,
        detailUrl: href.startsWith("http") ? href : `${NSF_DETAIL_BASE}${href}`,
        listingId: idMatch?.[1] ?? null,
      });
    });

    this.log(`Parsed ${listings.length} NSF Sport listings`);
    this.cache = { listings, fetchedAt: Date.now() };
    return listings;
  }

  /**
   * Find NSF Sport listings matching a given (brand, productName). Returns
   * every listing where the brand matches exactly (case-insensitive after
   * stripping punctuation/whitespace) AND the product name overlaps either
   * way as a substring.
   */
  async findMatches(brand: string, productName: string): Promise<NSFSportListing[]> {
    const listings = await this.loadRegistry();
    const brandKey = normalize(brand);
    const nameKey = normalize(productName);
    if (!brandKey || !nameKey) return [];

    return listings.filter((l) => {
      const lBrand = normalize(l.brand);
      if (lBrand !== brandKey) return false;
      const lName = normalize(l.productName);
      return lName.includes(nameKey) || nameKey.includes(lName);
    });
  }

  /**
   * BaseScraper-compatible interface. `searchQuery` is expected to be
   * `${brand} ${productName}` — we split on the first word boundary that
   * lets brand+name match. Best path forward is for callers to use
   * findMatches() directly with structured inputs; this wrapper exists so
   * the orchestrator can keep calling `.scrape()` uniformly.
   */
  async scrape(searchQuery: string): Promise<ScraperResult<NSFSportResult[]>> {
    try {
      const listings = await this.loadRegistry();
      const q = normalize(searchQuery);
      const matches = listings.filter((l) => {
        const text = `${normalize(l.brand)} ${normalize(l.productName)}`;
        return text.includes(q) || q.includes(normalize(l.brand));
      });

      const results: NSFSportResult[] = matches.map((l) => ({
        brand: l.brand,
        productName: l.productName,
        certificationType: "nsf_sport",
        verificationUrl: l.detailUrl,
        certificationNumber: l.listingId ?? undefined,
        listingId: l.listingId ?? undefined,
      }));

      return this.success(results, NSF_SEARCH_URL);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(`NSF scrape failed: ${msg}`, "error");
      return this.failure(msg, NSF_SEARCH_URL);
    }
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Export singleton instance
export const nsfSportScraper = new NSFSportScraper();
