"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Box, RefreshCw, Sparkles, Zap } from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import { TIER_COLOR as SHARED_TIER_COLOR } from "@/lib/tokens";

interface ScoreRow {
  id: string;
  integrity_score: number;
  tier: "rejected" | "standard" | "verified" | "elite";
  is_current: boolean;
  scored_at: string;
  version: string;
}

interface ProductRow {
  id: string;
  brand: string;
  name: string;
  category: string;
  status: string;
  price_usd: number | null;
  price_per_serving: number | null;
  product_ingredients: Array<{
    id: string;
    ingredient_name: string;
    dose: number;
    unit: string;
    form: string | null;
    bioavailability: string | null;
  }>;
  certifications: Array<{ id: string; type: string; verified: boolean }>;
  current_score: ScoreRow | null;
}

const TIER_COLOR: Record<string, string> = SHARED_TIER_COLOR;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminProductsClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoringAll, setScoringAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to load products");
      const json = await res.json();
      setProducts(json.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const scoreOne = async (id: string) => {
    setScoringId(id);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/admin/products/${id}/score`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");

      if (data.rescored === 0 && data.skipped === 1) {
        setSyncResult("No change — score identical to current row.");
      } else if (data.tierChange) {
        const tc = data.tierChange as { previousTier: string | null; newTier: string; previousScore: number | null; newScore: number };
        const emails = data.notifications?.emailsSent ?? 0;
        setSyncResult(
          `Tier: ${tc.previousTier ?? "—"} → ${tc.newTier.toUpperCase()} (${tc.previousScore ?? "—"} → ${tc.newScore})${emails > 0 ? ` · ${emails} practitioner email${emails === 1 ? "" : "s"} sent` : ""}`
        );
      } else {
        setSyncResult("Rescored. Score changed but tier held.");
      }
      await fetchProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setScoringId(null);
    }
  };

  const scoreAllUnscored = async () => {
    const unscored = products.filter((p) => !p.current_score);
    if (unscored.length === 0) return;
    setScoringAll(true);
    for (const p of unscored) {
      try {
        await fetch(`/api/admin/products/${p.id}/score`, { method: "POST" });
      } catch {}
    }
    setScoringAll(false);
    await fetchProducts();
  };

  const rescoreAll = async () => {
    if (products.length === 0) return;
    if (!confirm(`Rescore all ${products.length} products? Existing scores stay in history; a new current row is inserted per product.`)) return;
    setScoringAll(true);
    for (const p of products) {
      try {
        await fetch(`/api/admin/products/${p.id}/score`, { method: "POST" });
      } catch {}
    }
    setScoringAll(false);
    await fetchProducts();
  };

  const syncCerts = async (p: ProductRow) => {
    setSyncingId(p.id);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, brand: p.brand, productName: p.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncResult(
        `${p.brand} · ${p.name}: ${data.certificationsAdded ?? 0} added, ${data.certificationsFound ?? 0} found`
      );
      await fetchProducts();
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const syncAllCerts = async () => {
    if (!confirm(`Sync certifications for all ${products.length} products? This hits third-party certification directories.`)) return;
    setSyncingAll(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-certifications", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncResult(data.message ?? `Synced ${data.synced} products, ${data.errors} errors`);
      await fetchProducts();
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingAll(false);
    }
  };

  const syncTargetedCerts = async () => {
    if (!confirm("Sync certifications for Thorne, Nordic Naturals, and Garden of Life? (Much faster than full sync)")) return;
    setSyncingAll(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-certifications-targeted", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Targeted sync failed");
      setSyncResult(data.message ?? `Synced ${data.stats?.productsWithCerts || 0} products with certifications`);
      await fetchProducts();
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : "Targeted sync failed");
    } finally {
      setSyncingAll(false);
    }
  };

  const quickImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/products/quick-import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult(
        `${data.message} · ${data.stats.currentTotal} total products`
      );
      await fetchProducts();
    } catch (e) {
      setImportResult(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const cleanupEmpty = async () => {
    if (!confirm('Delete all products without ingredients? They can be re-imported with proper data.')) return;
    setCleaning(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/products/cleanup-empty", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cleanup failed");
      setImportResult(
        `Deleted ${data.deleted} empty products · ${data.remaining} remaining`
      );
      await fetchProducts();
    } catch (e) {
      setImportResult(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  };

  const seedCertifications = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/manufacturers/seed-certifications', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seeding failed');
      setSeedResult(
        `✓ ${data.message}. Created: ${data.stats.created}, Updated: ${data.stats.updated}, Skipped: ${data.stats.skipped}`
      );
    } catch (e) {
      setSeedResult(e instanceof Error ? e.message : 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const unscoredCount = products.filter((p) => !p.current_score).length;

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <header
        className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs" style={{ color: "#7A90A8" }}>
            <ArrowLeft size={12} /> Admin
          </Link>
          <span style={{ color: "#4a6080" }}>·</span>
          <VyvataLogo size={18} />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
          >
            VYVATA
          </span>
          <span className="text-xs" style={{ color: "#4a6080" }}>
            Products
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cleanupEmpty}
            disabled={cleaning || products.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#FCA5A5",
            }}
          >
            {cleaning ? <RefreshCw size={12} className="animate-spin" /> : <Box size={12} />}
            Cleanup Empty
          </button>
          <button
            onClick={quickImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#A855F7",
            }}
          >
            {importing ? <RefreshCw size={12} className="animate-spin" /> : <Box size={12} />}
            Quick Import (~20 products)
          </button>
          <button
            onClick={seedCertifications}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "#FBBF24",
            }}
          >
            {seeding ? <RefreshCw size={12} className="animate-spin" /> : <Award size={12} />}
            Seed Certifications
          </button>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.05)", color: "#7A90A8" }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {unscoredCount > 0 && (
            <button
              onClick={scoreAllUnscored}
              disabled={scoringAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{
                background: "rgba(20,184,166,0.12)",
                border: "1px solid rgba(20,184,166,0.3)",
                color: "#14B8A6",
              }}
            >
              <Zap size={12} />
              Score all unscored ({unscoredCount})
            </button>
          )}
          {products.length > 0 && (
            <button
              onClick={rescoreAll}
              disabled={scoringAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(201,214,223,0.15)",
                color: "#C9D6DF",
              }}
            >
              {scoringAll ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Rescore all ({products.length})
            </button>
          )}
          <button
            onClick={syncTargetedCerts}
            disabled={syncingAll || products.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22C55E",
            }}
            title="Sync certifications for premium brands (Thorne, Nordic Naturals, Garden of Life)"
          >
            {syncingAll ? <RefreshCw size={12} className="animate-spin" /> : <Award size={12} />}
            Sync Premium Certs
          </button>
          <button
            onClick={syncAllCerts}
            disabled={syncingAll || products.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(129,140,248,0.1)",
              border: "1px solid rgba(129,140,248,0.3)",
              color: "#818CF8",
            }}
            title="Sync all products (slow, may timeout)"
          >
            {syncingAll ? <RefreshCw size={12} className="animate-spin" /> : <Award size={12} />}
            Sync All Certs
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            VSF PRODUCTS
          </p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Product catalogue
          </h1>
          <p className="text-sm" style={{ color: "#C9D6DF" }}>
            Run VSF integrity scoring on any product. Scores persist to{" "}
            <span className="font-mono text-xs">product_scores</span> with version tracking.
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#FCA5A5",
            }}
          >
            {error}
          </div>
        )}

        {syncResult && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
            style={{
              background: "rgba(129,140,248,0.08)",
              border: "1px solid rgba(129,140,248,0.25)",
              color: "#C7D2FE",
            }}
          >
            <span>{syncResult}</span>
            <button onClick={() => setSyncResult(null)} style={{ color: "#818CF8" }}>
              Dismiss
            </button>
          </div>
        )}

        {importResult && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
            style={{
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.25)",
              color: "#E9D5FF",
            }}
          >
            <span>{importResult}</span>
            <button onClick={() => setImportResult(null)} style={{ color: "#A855F7" }}>
              Dismiss
            </button>
          </div>
        )}

        {seedResult && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#FDE68A",
            }}
          >
            <span>{seedResult}</span>
            <button onClick={() => setSeedResult(null)} style={{ color: "#FBBF24" }}>
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-center py-12" style={{ color: "#7A90A8" }}>
            Loading…
          </p>
        ) : products.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center space-y-3"
            style={{ background: "rgba(17,32,64,0.4)", border: "1px dashed rgba(201,214,223,0.12)" }}
          >
            <Box size={32} style={{ color: "#14B8A6" }} className="mx-auto" />
            <p className="text-sm font-semibold text-white">No products yet</p>
            <p className="text-xs" style={{ color: "#7A90A8" }}>
              Products land here once they're inserted into the <code>products</code> table.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {products.map((p) => {
              const score = p.current_score;
              const tierColor = score ? TIER_COLOR[score.tier] : "#4a6080";
              const certs = p.certifications.filter((c) => c.verified).length;
              return (
                <div
                  key={p.id}
                  className="rounded-xl px-4 py-4 flex items-center gap-4"
                  style={{ background: "rgba(17,32,64,0.6)", border: "1px solid rgba(201,214,223,0.08)" }}
                >
                  {/* Score tile */}
                  <div
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{
                      background: score ? `${tierColor}18` : "rgba(201,214,223,0.04)",
                      border: `1px solid ${tierColor}40`,
                    }}
                  >
                    {score ? (
                      <>
                        <span
                          className="text-2xl font-black leading-none"
                          style={{ color: tierColor, fontFamily: "Montserrat, sans-serif" }}
                        >
                          {score.integrity_score}
                        </span>
                        <span
                          className="text-[9px] uppercase tracking-widest mt-0.5"
                          style={{ color: tierColor }}
                        >
                          {score.tier}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: "#4a6080" }}>
                        —
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      {p.brand} · {p.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>
                      {p.category}
                      {p.price_per_serving != null && ` · $${Number(p.price_per_serving).toFixed(2)}/serving`}
                      {` · ${p.product_ingredients.length} ingredient${p.product_ingredients.length === 1 ? "" : "s"}`}
                      {certs > 0 && ` · ${certs} cert${certs === 1 ? "" : "s"}`}
                    </p>
                    {score && (
                      <p className="text-[11px] mt-1" style={{ color: "#4a6080" }}>
                        Scored {formatDate(score.scored_at)} · {score.version}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => scoreOne(p.id)}
                      disabled={scoringId === p.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{
                        background: score ? "rgba(255,255,255,0.05)" : "rgba(20,184,166,0.12)",
                        border: score ? "1px solid rgba(201,214,223,0.1)" : "1px solid rgba(20,184,166,0.3)",
                        color: score ? "#C9D6DF" : "#14B8A6",
                      }}
                    >
                      {scoringId === p.id ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" /> Scoring…
                        </>
                      ) : score ? (
                        <>
                          <RefreshCw size={12} /> Rescore
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> Score
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => syncCerts(p)}
                      disabled={syncingId === p.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{
                        background: "rgba(129,140,248,0.1)",
                        border: "1px solid rgba(129,140,248,0.25)",
                        color: "#818CF8",
                      }}
                    >
                      {syncingId === p.id ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" /> Syncing…
                        </>
                      ) : (
                        <>
                          <Award size={12} /> Sync certs
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-center pt-4" style={{ color: "#4a6080" }}>
          Tiers: <span style={{ color: TIER_COLOR.elite }}>elite (90+)</span> ·{" "}
          <span style={{ color: TIER_COLOR.verified }}>verified (75-89)</span> ·{" "}
          <span style={{ color: TIER_COLOR.standard }}>standard (60-74)</span> ·{" "}
          <span style={{ color: TIER_COLOR.rejected }}>rejected (&lt;60)</span>
        </p>
      </div>
    </main>
  );
}
