# Product Import Contract

Endpoint for the product-scraping agent to feed products + ingredients +
certifications into Vyvata's VSF system.

- **URL:** `POST /api/admin/products/import`
- **Auth:** admin cookie (same as `/admin`). The agent should either (a) run
  server-side with access to `SUPABASE_SERVICE_ROLE_KEY` and write directly
  to Supabase, or (b) authenticate to `/api/admin/auth` first to get a
  session cookie, then POST here.
- **Idempotent:** products are upserted by `(brand, name)`. Ingredients and
  certifications are *replaced* on each import (full-row replacement, not
  merged), so pass the complete set each time.

---

## Request shape

Either a single product:

```json
{
  "brand": "Thorne",
  "name": "Magnesium Bisglycinate",
  "category": "magnesium",
  "score": true,
  ...
}
```

Or a batch:

```json
{
  "products": [
    { "brand": "...", "name": "...", ... },
    { "brand": "...", "name": "...", ... }
  ],
  "score": true
}
```

`score: true` runs the VSF scorer on each product after upsert and persists
a new current row in `product_scores`. Omit it if the scraper should stage
data for a human/agent to review before scoring.

Max **500 products per batch**.

### Product object

| Field | Type | Required | Notes |
|---|---|---|---|
| `brand` | string | ✅ | "Thorne", "NOW Foods", "Life Extension" |
| `name` | string | ✅ | "Magnesium Bisglycinate" (no brand prefix) |
| `category` | string | ✅ | e.g. `magnesium`, `omega-3`, `multivitamin` |
| `product_url` | URL | — | Manufacturer product page |
| `image_url` | URL | — | |
| `serving_size` | string | — | "1 capsule", "2 softgels" |
| `servings_per_container` | int | — | |
| `price_usd` | number | — | Dollars; `price_per_serving` auto-calculated by trigger |
| `status` | enum | — | `active` (default), `discontinued`, `pending_review` |
| `manufacturer` | object | — | See below |
| `ingredients` | array | — | See below. Defaults to `[]`. |
| `certifications` | array | — | See below. Defaults to `[]`. |

### `manufacturer`

Manufacturers are deduped by `name`. If a row with that name already exists,
it is **updated** with the new values; otherwise created.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required. "Thorne Research" — note this is the legal manufacturer, which may differ from `product.brand` |
| `website` | URL | |
| `country` | string | "USA", "Canada", etc. |
| `gmp_certified` | boolean | Feeds manufacturing score |
| `fda_registered` | boolean | Feeds manufacturing score |
| `third_party_tested` | boolean | Feeds manufacturing score |
| `nsf_gmp_url` | URL | Deep link to NSF directory entry |

### `ingredients[]`

Replaced on each import (not merged). Order matters: either pass
`display_order` explicitly or the array index will be used.

| Field | Type | Required | Notes |
|---|---|---|---|
| `ingredient_name` | string | ✅ | Should match an entry in `ingredients-db.ts` for evidence scoring. Case-insensitive match with aliases. |
| `dose` | number | ✅ | |
| `unit` | string | ✅ | "mg", "mcg", "g", "IU", "billion CFU" |
| `form` | string | — | "bisglycinate", "citrate", "oxide", "methylcobalamin", "D3" |
| `bioavailability` | enum | — | `high` / `medium` / `low`. Feeds formulation score. |
| `daily_value_percentage` | number | — | % of RDA/DRI |
| `is_proprietary_blend` | boolean | — | Penalised heavily in transparency and formulation scores |
| `display_order` | int | — | |

**Bioavailability rules of thumb** (for the scraper):
- **high** — chelated (glycinate, bisglycinate, picolinate), methylated (methylcobalamin, methylfolate), active forms (D3, K2-MK7)
- **medium** — citrate, malate, ascorbate, gluconate, standard B-vitamins
- **low** — oxide, carbonate, sulfate, cyanocobalamin, D2, folic acid

### `certifications[]`

Replaced on each import.

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | enum | ✅ | One of: `nsf_sport`, `nsf_gmp`, `usp_verified`, `informed_sport`, `informed_choice`, `non_gmo`, `organic_usda`, `vegan`, `gluten_free`, `kosher`, `halal` |
| `verified` | boolean | — | Default `false`. Only **verified** certs contribute to scoring and show on public product pages. |
| `verification_url` | URL | — | Deep link to NSF / USP / Informed directory |
| `certificate_number` | string | — | |
| `issued_date` | ISO date | — | |
| `expiration_date` | ISO date | — | Flags rescoring when it expires |
| `notes` | string | — | |

The VSF scorer gives:
- **+10pt bonus** for each verified premium cert (nsf_*, usp_verified, informed_*), capped at +15 total
- **+3pt bonus** for each verified lifestyle cert (non_gmo, vegan, etc.)

---

## Response

```json
{
  "ok": true,
  "counts": { "total": 2, "created": 1, "updated": 1, "errors": 0 },
  "results": [
    {
      "brand": "Thorne",
      "name": "Magnesium Bisglycinate",
      "product_id": "uuid-here",
      "action": "updated",
      "scored": { "integrity": 94, "tier": "elite" }
    },
    ...
  ],
  "errors": []
}
```

Per-item errors don't fail the whole batch — they're collected in `errors[]`
with `{ brand, name, error }`. Clients can retry just the failed ones.

---

## Minimum viable product record

Smallest useful shape for triggering a score:

```json
{
  "brand": "NOW Foods",
  "name": "Magnesium Oxide 400mg",
  "category": "magnesium",
  "ingredients": [
    { "ingredient_name": "Magnesium", "dose": 400, "unit": "mg", "form": "oxide", "bioavailability": "low" }
  ],
  "score": true
}
```

Without a manufacturer row, the manufacturing score defaults to 50 (unknown).
Without certifications, there's no cert bonus. Add them on a subsequent
import as data is scraped — the product_id stays stable across imports.

---

## End-to-end example

```bash
curl -X POST http://localhost:3000/api/admin/products/import \
  -H "Content-Type: application/json" \
  -H "Cookie: vv_admin_session=<your-admin-secret>" \
  -d '{
    "score": true,
    "products": [
      {
        "brand": "Thorne",
        "name": "Magnesium Bisglycinate",
        "category": "magnesium",
        "product_url": "https://www.thorne.com/products/dp/magnesium-bisglycinate",
        "serving_size": "1 capsule",
        "servings_per_container": 90,
        "price_usd": 22.00,
        "manufacturer": {
          "name": "Thorne Research",
          "gmp_certified": true,
          "third_party_tested": true,
          "fda_registered": true,
          "country": "USA"
        },
        "ingredients": [
          {
            "ingredient_name": "Magnesium",
            "dose": 200,
            "unit": "mg",
            "form": "bisglycinate",
            "bioavailability": "high"
          }
        ],
        "certifications": [
          {
            "type": "nsf_sport",
            "verified": true,
            "verification_url": "https://www.nsfsport.com/listings/"
          }
        ]
      }
    ]
  }'
```

Expected response: `scored.integrity` ~94, `scored.tier: "elite"`.

---

## What NOT to send

- **Don't send ingredient objects that aren't in `ingredients-db.ts`** without
  coordinating first. Evidence scoring falls back to `none` (10pt) for
  unknown names, which tanks the evidence dimension. Either (a) add the
  ingredient to the master DB first, or (b) flag the import for review with
  `status: "pending_review"`.
- **Don't scrape marketing claims into `notes` fields**. The product record
  is facts; subjective claims live elsewhere (future marketing_claims table).
- **Don't set `verified: true` on certifications you haven't actually verified
  against the issuing body's directory.** The public `/products/[id]` page
  links the `verification_url`, and an unverifiable cert makes Vyvata look
  worse than a missing cert.
