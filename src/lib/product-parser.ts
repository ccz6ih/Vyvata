/**
 * Product Parser
 * 
 * Extracts product information (brand + product name) from raw user input.
 * Used to query DSLD API for automatic ingredient enrichment.
 * 
 * Patterns recognized:
 * - "Thorne Magnesium Bisglycinate"
 * - "Brand: Thorne, Product: Magnesium"
 * - "NOW Foods Vitamin D-3 5000 IU"
 * - Multi-line product lists
 */

export interface ExtractedProduct {
  brand: string;
  productName: string;
  raw: string;
}

// Common supplement brands to help with extraction
const KNOWN_BRANDS = [
  'Thorne', 'NOW Foods', 'Nature Made', 'Life Extension', 'Jarrow Formulas',
  'Nordic Naturals', 'Garden of Life', 'Pure Encapsulations', 'Solgar',
  'Swanson', 'Vital Nutrients', 'Douglas Laboratories', 'Designs for Health',
  'Integrative Therapeutics', 'Klaire Labs', 'Nutricology', 'Allergy Research',
  'Source Naturals', 'Bluebonnet', 'Country Life', 'Nature\'s Way', 'Gaia Herbs',
  'New Chapter', 'Rainbow Light', 'MegaFood', 'Standard Process', 'Solaray',
  'Carlson', 'Enzymedica', 'Protocol for Life', 'Ortho Molecular', 'Metagenics',
  'Quicksilver Scientific', 'Researched Nutritionals', 'Biotics Research'
];

/**
 * Extract products from raw user input
 * Returns array of {brand, productName, raw}
 */
export function extractProducts(rawInput: string): ExtractedProduct[] {
  if (!rawInput?.trim()) return [];

  const lines = rawInput
    .split(/[\n\r]+/)
    .map(l => l.trim())
    .filter(l => l.length > 3);

  const products: ExtractedProduct[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const extracted = extractProductFromLine(line);
    if (!extracted) continue;

    // Deduplicate by brand + product name
    const key = `${extracted.brand}|${extracted.productName}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    products.push(extracted);
  }

  return products;
}

/**
 * Extract product from a single line
 */
function extractProductFromLine(line: string): ExtractedProduct | null {
  // Clean up noise
  let cleaned = line
    .replace(/^\d+\.\s*/, '') // remove numbering
    .replace(/^[-•*]\s*/, '') // remove bullets
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  // Pattern 1: "Brand: X, Product: Y" or "Brand: X | Product: Y"
  const explicitMatch = cleaned.match(/brand:\s*([^,|]+)[,|]\s*product:\s*(.+)/i);
  if (explicitMatch) {
    return {
      brand: explicitMatch[1].trim(),
      productName: explicitMatch[2].trim(),
      raw: line,
    };
  }

  // Pattern 2: Known brand at start "Thorne Magnesium Bisglycinate"
  for (const brand of KNOWN_BRANDS) {
    const brandPattern = new RegExp(`^${brand}\\s+(.+)`, 'i');
    const match = cleaned.match(brandPattern);
    if (match) {
      const productName = match[1]
        // Remove dose info
        .replace(/\d+\s*(mg|mcg|ug|g|iu|billion\s*cfu)/gi, '')
        // Remove form info in parens
        .replace(/\([^)]*\)/g, '')
        .trim();
      
      if (productName.length > 2) {
        return {
          brand,
          productName,
          raw: line,
        };
      }
    }
  }

  // Pattern 3: Try to split on common patterns
  // "Brand Product Name" where first 1-3 words might be brand
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    // Try first word as brand
    for (let brandWords = 1; brandWords <= Math.min(3, words.length - 1); brandWords++) {
      const possibleBrand = words.slice(0, brandWords).join(' ');
      const possibleProduct = words.slice(brandWords).join(' ')
        .replace(/\d+\s*(mg|mcg|ug|g|iu|billion\s*cfu)/gi, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
      
      // Check if it's a known brand or looks brand-like (capitalized)
      const isKnownBrand = KNOWN_BRANDS.some(b => 
        b.toLowerCase() === possibleBrand.toLowerCase()
      );
      const looksLikeBrand = /^[A-Z]/.test(possibleBrand);
      
      if ((isKnownBrand || looksLikeBrand) && possibleProduct.length > 2) {
        return {
          brand: possibleBrand,
          productName: possibleProduct,
          raw: line,
        };
      }
    }
  }

  return null;
}

/**
 * Check if raw input looks like it contains product information
 * (vs just ingredient lists)
 */
export function hasProductInfo(rawInput: string): boolean {
  if (!rawInput?.trim()) return false;

  // Check for known brands
  const hasKnownBrand = KNOWN_BRANDS.some(brand =>
    rawInput.toLowerCase().includes(brand.toLowerCase())
  );

  // Check for explicit patterns
  const hasExplicitPattern = /brand:/i.test(rawInput) || 
                            /product:/i.test(rawInput);

  // Check for capitalized multi-word patterns (brand-like)
  const hasCapitalizedPattern = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(rawInput);

  return hasKnownBrand || hasExplicitPattern || hasCapitalizedPattern;
}
