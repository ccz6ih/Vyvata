'use client';

import { useState } from 'react';
import { VyvataLogo } from '@/components/VyvataLogo';
import { Button } from '@/components/ui/button';

interface Product {
  brand: string;
  productName: string;
  upc?: string;
}

interface EnrichedIngredient {
  name: string;
  dose?: number;
  unit?: string;
  form?: string;
  percentDV?: number;
}

interface EnrichResult {
  input: Product;
  found: boolean;
  message?: string;
  dsld?: {
    id: number;
    fullName: string;
    brandName: string;
    upc?: string;
    servingSize?: string;
    servingsPerContainer?: string;
    offMarket: boolean;
    ingredients: EnrichedIngredient[];
  };
}

interface EnrichmentSummary {
  total: number;
  found: number;
  notFound: number;
  totalIngredients: number;
}

const EXAMPLE_STACKS = {
  basic: [
    { brand: 'Thorne', productName: 'Magnesium Bisglycinate' },
    { brand: 'NOW Foods', productName: 'Vitamin D-3' },
    { brand: 'Nature Made', productName: 'Fish Oil' }
  ],
  advanced: [
    { brand: 'Life Extension', productName: 'Super K' },
    { brand: 'Jarrow Formulas', productName: 'Methyl B-12' },
    { brand: 'Nordic Naturals', productName: 'Ultimate Omega' }
  ],
  custom: []
};

export default function DSLDDemoPage() {
  const [products, setProducts] = useState<Product[]>(EXAMPLE_STACKS.basic);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EnrichResult[] | null>(null);
  const [summary, setSummary] = useState<EnrichmentSummary | null>(null);

  const addProduct = () => {
    setProducts([...products, { brand: '', productName: '', upc: '' }]);
  };

  const updateProduct = (index: number, field: keyof Product, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const loadExample = (key: keyof typeof EXAMPLE_STACKS) => {
    setProducts(EXAMPLE_STACKS[key].length > 0 ? EXAMPLE_STACKS[key] : [{ brand: '', productName: '' }]);
    setResults(null);
    setSummary(null);
  };

  const enrichStack = async () => {
    setLoading(true);
    setResults(null);
    setSummary(null);

    try {
      const response = await fetch('/api/enrich-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      setResults(data.results);
      setSummary(data.summary);
    } catch (error: any) {
      alert(`Failed to enrich stack: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VyvataLogo size={32} />
              <span className="text-lg font-bold tracking-tight text-gray-900">
                Vyvata
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">
                DSLD API Demo
              </span>
              <a 
                href="/" 
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            Automated Stack Intelligence
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform brand names into structured ingredient data using the NIH DSLD API.
            <br />
            <span className="text-sm text-gray-500 mt-2 block">
              212,642+ supplement labels • Public domain • Zero legal exposure
            </span>
          </p>
        </div>

        {/* Example Buttons */}
        <div className="flex justify-center gap-3 mb-8">
          <Button 
            variant="outline" 
            onClick={() => loadExample('basic')}
            size="sm"
          >
            Basic Stack
          </Button>
          <Button 
            variant="outline" 
            onClick={() => loadExample('advanced')}
            size="sm"
          >
            Advanced Stack
          </Button>
          <Button 
            variant="outline" 
            onClick={() => loadExample('custom')}
            size="sm"
          >
            Start Fresh
          </Button>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Stack</h2>
            <Button onClick={addProduct} variant="outline" size="sm">
              + Add Product
            </Button>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-3 mb-3 px-1">
            <div className="col-span-3 text-sm font-medium text-gray-600">Brand</div>
            <div className="col-span-5 text-sm font-medium text-gray-600">Product Name</div>
            <div className="col-span-3 text-sm font-medium text-gray-600">UPC (optional)</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center">
                <input
                  type="text"
                  placeholder="e.g., Thorne"
                  value={product.brand}
                  onChange={(e) => updateProduct(index, 'brand', e.target.value)}
                  className="col-span-3 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900 placeholder-gray-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="e.g., Magnesium Bisglycinate"
                  value={product.productName}
                  onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                  className="col-span-5 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900 placeholder-gray-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="Barcode"
                  value={product.upc || ''}
                  onChange={(e) => updateProduct(index, 'upc', e.target.value)}
                  className="col-span-3 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-gray-900 placeholder-gray-400 bg-white text-sm"
                />
                <button
                  onClick={() => removeProduct(index)}
                  className="col-span-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-sm font-medium transition-colors"
                  title="Remove product"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <Button 
            onClick={enrichStack} 
            disabled={loading || products.some(p => !p.brand || !p.productName)}
            className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            size="lg"
          >
            {loading ? 'Enriching...' : '✨ Enrich Stack with DSLD'}
          </Button>
        </div>

        {/* Results */}
        {summary && (
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-teal-900 mb-4 text-lg">Enrichment Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
                <div className="text-sm text-gray-600 mt-1">Products</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-green-600">{summary.found}</div>
                <div className="text-sm text-gray-600 mt-1">Found</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{summary.notFound}</div>
                <div className="text-sm text-gray-600 mt-1">Not Found</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-teal-600">{summary.totalIngredients}</div>
                <div className="text-sm text-gray-600 mt-1">Ingredients</div>
              </div>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-xl shadow-md border-2 p-6 ${
                  result.found ? 'border-green-300' : 'border-orange-300'
                }`}
              >
                {/* Product Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        result.found ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {result.found ? '✓ Found in DSLD' : '✗ Not Found'}
                      </span>
                      {result.dsld?.offMarket && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Off Market
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {result.input.brand} {result.input.productName}
                    </h3>
                  </div>
                  {result.dsld && (
                    <div className="text-right text-sm text-gray-600 font-medium">
                      <div>DSLD ID: <span className="text-teal-600">{result.dsld.id}</span></div>
                      {result.dsld.upc && <div className="text-gray-500">UPC: {result.dsld.upc}</div>}
                    </div>
                  )}
                </div>

                {result.found && result.dsld ? (
                  <>
                    {/* Product Info */}
                    <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Official Name</div>
                        <div className="font-medium text-gray-900">{result.dsld.fullName}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Serving Size</div>
                        <div className="font-medium text-gray-900">{result.dsld.servingSize || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Servings/Container</div>
                        <div className="font-medium text-gray-900">{result.dsld.servingsPerContainer || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Ingredients */}
                    {result.dsld.ingredients.length > 0 ? (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs">
                            {result.dsld.ingredients.length}
                          </span>
                          Ingredients
                        </h4>
                        <div className="space-y-2">
                          {result.dsld.ingredients.map((ing, i) => (
                            <div 
                              key={i} 
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{ing.name}</div>
                                {ing.form && (
                                  <div className="text-sm text-teal-600 mt-1 font-medium">
                                    Form: {ing.form}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-teal-600">
                                  {ing.dose}{ing.unit}
                                </div>
                                {ing.percentDV && (
                                  <div className="text-xs text-gray-500 font-medium">
                                    {ing.percentDV}% DV
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                        No ingredient data available
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-600 py-8 bg-orange-50 rounded-lg font-medium">
                    {result.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 p-8 bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-100">
          <h3 className="font-bold text-xl text-gray-900 mb-6 text-center">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8 text-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                1
              </div>
              <div className="font-semibold text-gray-900 mb-2">Receipt OCR</div>
              <div className="text-gray-600 leading-relaxed">
                User uploads receipt photo → Vision AI extracts brand + product names
              </div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                2
              </div>
              <div className="font-semibold text-gray-900 mb-2">DSLD Enrichment</div>
              <div className="text-gray-600 leading-relaxed">
                Query NIH DSLD API → Get structured ingredient data with forms, doses, and bioavailability markers
              </div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                3
              </div>
              <div className="font-semibold text-gray-900 mb-2">VSF Scoring</div>
              <div className="text-gray-600 leading-relaxed">
                Score each ingredient on Evidence Quality, Safety, Optimization, and Value dimensions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
