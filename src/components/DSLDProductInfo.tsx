/**
 * DSLD Product Info Component
 * 
 * Displays enriched product information from NIH DSLD database
 * Shows brand, product name, official DSLD data, and detailed ingredient breakdown
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Package } from "lucide-react";

interface DSLDIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  ingredientForm?: string;
  percentDailyValue?: number;
}

interface DSLDProduct {
  id: number;
  fullName: string;
  brandName: string;
  upc?: string;
  servingSize?: string;
  servingsPerContainer?: string;
  offMarket: boolean;
  ingredients: DSLDIngredient[];
}

interface DSLDEnrichmentResult {
  input: {
    brand: string;
    productName: string;
  };
  found: boolean;
  message?: string;
  dsld?: DSLDProduct;
}

interface DSLDProductInfoProps {
  products: DSLDEnrichmentResult[];
}

export function DSLDProductInfo({ products }: DSLDProductInfoProps) {
  if (!products || products.length === 0) return null;

  const foundProducts = products.filter(p => p.found);
  if (foundProducts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Package size={18} style={{ color: "#14B8A6" }} />
        <h3
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "#14B8A6", fontFamily: "Inter, sans-serif" }}
        >
          Verified Products ({foundProducts.length})
        </h3>
        <Badge 
          variant="outline" 
          className="text-xs"
          style={{ 
            background: "rgba(20,184,166,0.1)", 
            border: "1px solid rgba(20,184,166,0.3)",
            color: "#14B8A6" 
          }}
        >
          NIH DSLD Database
        </Badge>
      </div>

      <div className="space-y-3">
        {foundProducts.map((result, idx) => {
          const product = result.dsld!;
          return (
            <div
              key={idx}
              className="rounded-lg p-4 space-y-3"
              style={{
                background: "rgba(20,184,166,0.05)",
                border: "1px solid rgba(20,184,166,0.15)",
              }}
            >
              {/* Product Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={14} style={{ color: "#34D399" }} />
                    <span
                      className="font-semibold text-sm"
                      style={{ color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}
                    >
                      {result.input.brand} — {result.input.productName}
                    </span>
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                  >
                    Official Name: {product.fullName}
                  </div>
                </div>
                <a
                  href={`https://dsld.od.nih.gov/label/${product.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: "#14B8A6" }}
                >
                  DSLD #{product.id}
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {product.upc && (
                  <div>
                    <div style={{ color: "#7A90A8" }}>UPC</div>
                    <div style={{ color: "#C9D6DF", fontFamily: "monospace" }}>
                      {product.upc}
                    </div>
                  </div>
                )}
                {product.servingSize && (
                  <div>
                    <div style={{ color: "#7A90A8" }}>Serving Size</div>
                    <div style={{ color: "#C9D6DF" }}>
                      {product.servingSize}
                    </div>
                  </div>
                )}
                {product.servingsPerContainer && (
                  <div>
                    <div style={{ color: "#7A90A8" }}>Servings/Container</div>
                    <div style={{ color: "#C9D6DF" }}>
                      {product.servingsPerContainer}
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredients */}
              {product.ingredients.length > 0 && (
                <div>
                  <div
                    className="text-xs font-semibold mb-2"
                    style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}
                  >
                    Ingredients ({product.ingredients.length})
                  </div>
                  <div className="space-y-1.5">
                    {product.ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs py-2 px-3 rounded"
                        style={{
                          background: "rgba(17,32,64,0.4)",
                          border: "1px solid rgba(201,214,223,0.08)",
                        }}
                      >
                        <div className="flex-1">
                          <span
                            className="font-medium"
                            style={{ color: "#FFFFFF" }}
                          >
                            {ing.name}
                          </span>
                          {ing.ingredientForm && (
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: "#14B8A6" }}
                            >
                              Form: {ing.ingredientForm}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className="font-semibold"
                            style={{ color: "#14B8A6" }}
                          >
                            {ing.quantity}{ing.unit}
                          </div>
                          {ing.percentDailyValue && (
                            <div style={{ color: "#7A90A8" }}>
                              {ing.percentDailyValue}% DV
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div
        className="text-xs p-3 rounded-lg"
        style={{
          background: "rgba(20,184,166,0.05)",
          border: "1px solid rgba(20,184,166,0.1)",
          color: "#7A90A8",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <span style={{ color: "#14B8A6" }}>✓ Verified:</span> Product data from
        NIH Dietary Supplement Label Database (DSLD) — official supplement label
        information including bioavailable forms and exact doses.
      </div>
    </div>
  );
}
