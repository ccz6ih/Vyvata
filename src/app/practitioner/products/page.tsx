"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Search, Filter, Award, Database, ExternalLink, ChevronDown, FileSearch } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import PractitionerNav from "@/components/PractitionerNav";
import { productUrl } from "@/lib/urls";

interface ProductIngredient {
  ingredient_name: string;
  dose: string;
  unit: string;
  form: string;
  bioavailability: string;
}

interface ProductCertification {
  type: string;
  verified: boolean;
}

interface ProductScore {
  integrity: number;
  formulation: number;
  transparency: number;
  certification: number;
  tier: string;
}

interface Product {
  id: string;
  slug?: string | null;
  brand: string;
  name: string;
  category: string;
  serving_size: string;
  servings_per_container: number;
  price_usd: number;
  ingredients: ProductIngredient[];
  certifications: ProductCertification[];
  score: ProductScore | null;
}

interface RecommendationsResponse {
  recommendations: Product[];
  count: number;
  filters: {
    category: string;
    ingredient: string | null;
    minScore: number;
  };
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "magnesium", label: "Magnesium" },
  { value: "vitamin-d", label: "Vitamin D" },
  { value: "omega-3", label: "Omega-3" },
  { value: "b-complex", label: "B-Complex" },
  { value: "probiotic", label: "Probiotics" },
  { value: "multivitamin", label: "Multivitamins" },
];

const TIER_COLORS: Record<string, string> = {
  diamond: "#14B8A6",
  gold: "#F59E0B",
  silver: "#94A3B8",
};

const TIER_LABELS: Record<string, string> = {
  diamond: "Diamond",
  gold: "Gold",
  silver: "Silver",
};

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] || "#7A90A8";
  const label = TIER_LABELS[tier] || tier;
  
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
        color,
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      <Award size={12} />
      {label}
    </div>
  );
}

function BioavailabilityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "#34D399",
    medium: "#F59E0B",
    low: "#F87171",
  };
  
  const color = colors[level.toLowerCase()] || "#7A90A8";
  
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{
        background: `${color}15`,
        color,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {level.toUpperCase()}
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div
      className="rounded-xl p-5 space-y-4 hover-elevate transition-all"
      style={{
        background: "rgba(17,32,64,0.6)",
        border: "1px solid rgba(201,214,223,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3
              className="text-base font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {product.brand}
            </h3>
            {product.score && <TierBadge tier={product.score.tier} />}
          </div>
          <p className="text-sm" style={{ color: "#C9D6DF" }}>
            {product.name}
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: "#7A90A8" }}>
            <span className="px-2 py-0.5 rounded" style={{ background: "rgba(20,184,166,0.08)", color: "#14B8A6" }}>
              {product.category}
            </span>
            <span>•</span>
            <span>{product.servings_per_container} servings</span>
            {product.price_usd > 0 && (
              <>
                <span>•</span>
                <span>${product.price_usd.toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* VSF Score */}
      {product.score && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>VSF Integrity Score</span>
            <span
              className="font-bold"
              style={{
                color: product.score.integrity >= 80 ? "#34D399" : product.score.integrity >= 60 ? "#F59E0B" : "#F87171",
                fontFamily: "Montserrat, sans-serif",
                fontSize: "14px",
              }}
            >
              {product.score.integrity}/100
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "rgba(201,214,223,0.08)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${product.score.integrity}%`,
                background: product.score.integrity >= 80 ? "#34D399" : product.score.integrity >= 60 ? "#F59E0B" : "#F87171",
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: "Formulation", value: product.score.formulation },
              { label: "Transparency", value: product.score.transparency },
              { label: "Certification", value: product.score.certification },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="font-bold" style={{ color: "#C9D6DF" }}>{metric.value}</div>
                <div style={{ color: "#7A90A8", fontSize: "10px" }}>{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients Preview */}
      <div className="space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-semibold"
          style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
        >
          <span>Ingredients ({product.ingredients.length})</span>
          <ChevronDown
            size={14}
            className="transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        
        {expanded && (
          <div className="space-y-2 pt-2">
            {product.ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2 rounded"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-white">{ing.ingredient_name}</span>
                  <span style={{ color: "#7A90A8", fontSize: "11px" }}>
                    Form: {ing.form || "Standard"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#C9D6DF" }}>
                    {ing.dose} {ing.unit}
                  </span>
                  <BioavailabilityBadge level={ing.bioavailability} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      {product.certifications.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.certifications.map((cert, idx) => (
            <span
              key={idx}
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                background: cert.verified ? "rgba(52,211,153,0.1)" : "rgba(201,214,223,0.08)",
                color: cert.verified ? "#34D399" : "#7A90A8",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {cert.type.replace(/_/g, " ").toUpperCase()}
              {cert.verified && " ✓"}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: "#14B8A6",
            color: "#FFFFFF",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Recommend to Patient
        </button>
        <Link
          href={productUrl(product)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{
            background: "rgba(20,184,166,0.1)",
            border: "1px solid rgba(20,184,166,0.3)",
            color: "#14B8A6",
            fontFamily: "Montserrat, sans-serif",
          }}
          title="Open public scorecard in new tab"
        >
          <FileSearch size={14} />
          Scorecard
          <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(0); // Default to 0 to show all products including unscored ones
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useEffect triggered - fetching products');
    fetchProducts();
  }, [category, minScore]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    console.log('fetchProducts called');
    try {
      const params = new URLSearchParams({
        limit: "50",
        minScore: minScore.toString(),
      });
      
      if (category !== "all") {
        params.set("category", category);
      }
      
      if (searchTerm.trim()) {
        params.set("ingredient", searchTerm.trim());
      }

      const url = `/api/practitioner/products/recommendations?${params}`;
      console.log('Fetching from:', url);
      const res = await fetch(url);
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data: RecommendationsResponse = await res.json();
      console.log('Products received:', data.recommendations.length);
      setProducts(data.recommendations);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)" }}
          >
            <Package size={24} color="#14B8A6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <VyvataLogo size={14} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
                VYVATA
              </span>
            </div>
            <p className="text-xs" style={{ color: "#7A90A8" }}>Product Database</p>
          </div>
        </div>

        <PractitionerNav />
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1
            className="text-2xl font-black text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Product Database
          </h1>
          <p className="text-sm" style={{ color: "#7A90A8" }}>
            {products.length} curated products from NIH ODS DSLD · VSF scored · Daily refresh
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div
              className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg"
              style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
            >
              <Search size={16} color="#7A90A8" />
              <input
                type="text"
                placeholder="Search by ingredient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-0 text-white text-sm placeholder:text-[#7A90A8] focus:outline-none"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: "#14B8A6",
                color: "#FFFFFF",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} color="#7A90A8" />
              <span className="text-xs font-semibold" style={{ color: "#7A90A8" }}>Category:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{
                  background: "rgba(17,32,64,0.6)",
                  border: "1px solid rgba(201,214,223,0.08)",
                  color: "#C9D6DF",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min score filter */}
            <div className="flex items-center gap-2">
              <Award size={14} color="#7A90A8" />
              <span className="text-xs font-semibold" style={{ color: "#7A90A8" }}>Min Score:</span>
              <select
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{
                  background: "rgba(17,32,64,0.6)",
                  border: "1px solid rgba(201,214,223,0.08)",
                  color: "#C9D6DF",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <option value="0">All (0+)</option>
                <option value="50">Good (50+)</option>
                <option value="60">Very Good (60+)</option>
                <option value="70">Excellent (70+)</option>
                <option value="80">Outstanding (80+)</option>
              </select>
            </div>

            {/* Data source badge */}
            <div className="ml-auto">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: "rgba(20,184,166,0.05)",
                  border: "1px solid rgba(20,184,166,0.2)",
                  color: "#14B8A6",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Database size={12} />
                Source: NIH ODS DSLD
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {error && (
          <div className="rounded-xl p-6 mb-6 text-center" style={{ 
            background: "rgba(239,68,68,0.1)", 
            border: "1px solid rgba(239,68,68,0.3)" 
          }}>
            <p className="text-sm font-semibold" style={{ color: "#FCA5A5" }}>
              Error: {error}
            </p>
            <button
              onClick={() => fetchProducts()}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: "rgba(239,68,68,0.2)", color: "#FCA5A5" }}
            >
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm" style={{ color: "#7A90A8" }}>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} color="#7A90A8" className="mx-auto mb-4 opacity-50" />
            <p className="text-sm" style={{ color: "#7A90A8" }}>
              No products found matching your criteria
            </p>
            <button
              onClick={() => { setCategory('all'); setMinScore(0); setSearchTerm(''); }}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-medium"
              style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6" }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
