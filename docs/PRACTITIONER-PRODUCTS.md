# Practitioner Product Recommendations

## ✅ Status: Complete

Practitioners can now view product information, scores, and ingredients through the new recommendations API.

## 📍 API Endpoint

**GET** `/api/practitioner/products/recommendations`

### Authentication
Requires valid practitioner session (checked via `hasValidPractitionerSession()`)

### Query Parameters
- `category` (optional): Filter by product category (e.g., "magnesium", "vitamin-d", "omega-3")
- `ingredient` (optional): Filter by specific ingredient name (fuzzy match)
- `minScore` (optional): Minimum VSF integrity score (default: 60)
- `limit` (optional): Number of results to return (default: 10)

### Example Requests
```bash
# Get all high-quality magnesium products
GET /api/practitioner/products/recommendations?category=magnesium&minScore=70

# Find products with methylcobalamin
GET /api/practitioner/products/recommendations?ingredient=methylcobalamin

# Top 20 products overall
GET /api/practitioner/products/recommendations?limit=20&minScore=65
```

## 📊 Response Format

```json
{
  "recommendations": [
    {
      "id": "uuid",
      "brand": "Thorne",
      "name": "Magnesium Bisglycinate",
      "category": "magnesium",
      "serving_size": "1 capsule",
      "servings_per_container": 90,
      "price_usd": 19.00,
      
      "ingredients": [
        {
          "ingredient_name": "Magnesium (as Bisglycinate)",
          "dose": "200",
          "unit": "mg",
          "form": "bisglycinate",
          "bioavailability": "high"
        }
      ],
      
      "certifications": [
        {
          "type": "nsf_sport",
          "verified": true
        }
      ],
      
      "score": {
        "integrity": 85,
        "formulation": 88,
        "transparency": 90,
        "certification": 100,
        "tier": "diamond"
      }
    }
  ],
  "count": 15,
  "filters": {
    "category": "magnesium",
    "ingredient": null,
    "minScore": 70
  }
}
```

## 🎨 UI Integration

### Option 1: Add to Dashboard Sidebar
Update [src/app/practitioner/dashboard/DashboardClient.tsx](src/app/practitioner/dashboard/DashboardClient.tsx) to include product recommendations link:

```tsx
<nav className="space-y-1">
  {/* Existing nav items */}
  <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100">
    <Package className="w-5 h-5" />
    <span>Product Recommendations</span>
  </button>
</nav>
```

### Option 2: Patient Detail View
Add product suggestions to [src/app/practitioner/patients/[id]/PatientDetailClient.tsx](src/app/practitioner/patients/[id]/PatientDetailClient.tsx):

```tsx
// Fetch based on patient's protocol/stack
const { data } = await fetch(
  `/api/practitioner/products/recommendations?category=${patientCategory}&minScore=70`
).then(r => r.json());

// Display as cards
<div className="grid grid-cols-3 gap-4">
  {data.recommendations.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

### Option 3: Dedicated Products Page
Create [src/app/practitioner/products/page.tsx](src/app/practitioner/products/page.tsx):

```tsx
'use client';
import { useState } from 'react';

export default function ProductsPage() {
  const [category, setCategory] = useState('all');
  const [minScore, setMinScore] = useState(60);
  
  // Fetch and display recommendations
}
```

## 🔍 What Practitioners Can See

### ✅ Product Information
- Brand and product name
- Category (magnesium, omega-3, etc.)
- Serving size and container size
- Price in USD
- Source attribution: "Data from NIH ODS DSLD"

### ✅ VSF Scores
- **Integrity Score** (0-100): Overall quality
- **Formulation Score** (0-100): Bioavailability of ingredients
- **Transparency Score** (0-100): Label clarity
- **Certification Score** (0-100): Third-party verification
- **Tier**: Diamond/Gold/Silver based on score

### ✅ Ingredients
- Full ingredient list
- Dosage and units
- Form (bisglycinate, citrate, etc.)
- Bioavailability rating (high/medium/low)

### ✅ Certifications
- NSF Sport Certified
- NSF GMP Certified
- USP Verified
- Informed Choice
- BSCG Certified

## 🚀 Next Steps

### Immediate (Optional)
- [ ] Add product cards component to dashboard
- [ ] Create dedicated products page
- [ ] Add "Recommend Product" button to patient detail view
- [ ] Email product recommendations to patients

### Future Enhancements
- [ ] Save practitioner's favorite products
- [ ] Patient-specific recommendations based on quiz responses
- [ ] Product comparison tool (side-by-side)
- [ ] Integration with affiliate links (ethical disclosure)
- [ ] Track which products patients are actually taking

## 📚 Related Documentation
- [Auto-Import Agent](.agents/product-auto-import-agent.md): How products are discovered and imported
- [Cron Tasks](cron/README.md): Automated daily/weekly data refresh
- [VSF Scoring](src/lib/product-scoring.ts): How integrity scores are calculated
