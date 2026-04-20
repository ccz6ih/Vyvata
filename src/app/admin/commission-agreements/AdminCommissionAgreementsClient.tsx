"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import { ArrowLeft, Plus, Building2, CheckCircle2, XCircle, AlertCircle, Edit, Trash2 } from "lucide-react";
import type { ManufacturerRow } from "./page";

export default function AdminCommissionAgreementsClient({
  manufacturers,
}: {
  manufacturers: ManufacturerRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    manufacturer_id: "",
    consumer_rate: "10.00",
    practitioner_rate: "19.00",
    elite_rate: "23.50",
    practitioner_channel_enabled: true,
    notes: "",
  });

  const withAgreements = manufacturers.filter(
    (m) => m.agreements && m.agreements.length > 0 && m.agreements[0]?.status === "active"
  );
  const withoutAgreements = manufacturers.filter(
    (m) => !m.agreements || m.agreements.length === 0 || m.agreements[0]?.status !== "active"
  );

  function handleCreateNew() {
    setEditingId(null);
    setFormData({
      manufacturer_id: "",
      consumer_rate: "10.00",
      practitioner_rate: "19.00",
      elite_rate: "23.50",
      practitioner_channel_enabled: true,
      notes: "",
    });
    setShowForm(true);
    setError(null);
  }

  function handleEdit(mfg: ManufacturerRow) {
    const agreement = mfg.agreements?.[0];
    if (!agreement) return;
    
    setEditingId(agreement.id);
    setFormData({
      manufacturer_id: mfg.id,
      consumer_rate: agreement.consumer_rate.toFixed(2),
      practitioner_rate: agreement.practitioner_rate.toFixed(2),
      elite_rate: agreement.elite_rate.toFixed(2),
      practitioner_channel_enabled: agreement.practitioner_channel_enabled,
      notes: agreement.notes || "",
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.manufacturer_id) {
      setError("Please select a manufacturer");
      return;
    }

    startTransition(async () => {
      try {
        const endpoint = editingId
          ? `/api/admin/commission-agreements/${editingId}`
          : "/api/admin/commission-agreements";
        const method = editingId ? "PATCH" : "POST";

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save agreement");
        }

        setShowForm(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  async function handleToggleChannel(agreementId: string, currentValue: boolean) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/commission-agreements/${agreementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practitioner_channel_enabled: !currentValue,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to toggle channel");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  async function handleTerminate(agreementId: string) {
    if (!confirm("Are you sure you want to terminate this agreement? This will immediately disable all practitioner commissions for this brand's products.")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/commission-agreements/${agreementId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to terminate agreement");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

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
            Commission Agreements
          </span>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
          style={{
            background: "rgba(20,184,166,0.12)",
            border: "1px solid rgba(20,184,166,0.3)",
            color: "#14B8A6",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          <Plus size={12} />
          New Agreement
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-8 space-y-8">
        {error && (
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#F87171", marginTop: "2px" }} />
            <p className="text-sm" style={{ color: "#F87171" }}>
              {error}
            </p>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-6 space-y-6"
            style={{
              background: "rgba(17,32,64,0.6)",
              border: "1px solid rgba(201,214,223,0.1)",
            }}
          >
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {editingId ? "Edit Commission Agreement" : "New Commission Agreement"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#C9D6DF" }}>
                  Manufacturer
                </label>
                <select
                  value={formData.manufacturer_id}
                  onChange={(e) => setFormData({ ...formData, manufacturer_id: e.target.value })}
                  disabled={!!editingId || pending}
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                  style={{
                    background: "rgba(11,31,59,0.8)",
                    border: "1px solid rgba(201,214,223,0.2)",
                    color: "#fff",
                  }}
                >
                  <option value="">Select a manufacturer...</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#C9D6DF" }}>
                    Consumer Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="8"
                    max="12"
                    value={formData.consumer_rate}
                    onChange={(e) => setFormData({ ...formData, consumer_rate: e.target.value })}
                    disabled={pending}
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                    style={{
                      background: "rgba(11,31,59,0.8)",
                      border: "1px solid rgba(201,214,223,0.2)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#C9D6DF" }}>
                    Practitioner Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="18"
                    max="20"
                    value={formData.practitioner_rate}
                    onChange={(e) => setFormData({ ...formData, practitioner_rate: e.target.value })}
                    disabled={pending}
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                    style={{
                      background: "rgba(11,31,59,0.8)",
                      border: "1px solid rgba(201,214,223,0.2)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#C9D6DF" }}>
                    Elite Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="22"
                    max="25"
                    value={formData.elite_rate}
                    onChange={(e) => setFormData({ ...formData, elite_rate: e.target.value })}
                    disabled={pending}
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                    style={{
                      background: "rgba(11,31,59,0.8)",
                      border: "1px solid rgba(201,214,223,0.2)",
                      color: "#fff",
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.practitioner_channel_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, practitioner_channel_enabled: e.target.checked })
                    }
                    disabled={pending}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: "#C9D6DF" }}>
                    Enable Practitioner Channel
                  </span>
                </label>
                <p className="text-xs mt-1" style={{ color: "#7A90A8" }}>
                  When disabled, products from this brand will not be eligible for practitioner commissions even with
                  verified scores.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#C9D6DF" }}>
                  Internal Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={pending}
                  rows={3}
                  placeholder="e.g., Negotiated higher rate due to premium brand status..."
                  className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50 resize-none"
                  style={{
                    background: "rgba(11,31,59,0.8)",
                    border: "1px solid rgba(201,214,223,0.2)",
                    color: "#fff",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{
                  background: "#14B8A6",
                  color: "#0B1F3B",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {pending ? "Saving..." : editingId ? "Update Agreement" : "Create Agreement"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                style={{
                  border: "1px solid rgba(201,214,223,0.2)",
                  color: "#C9D6DF",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          <h3
            className="text-sm font-bold text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Active Agreements ({withAgreements.length})
          </h3>

          {withAgreements.length === 0 ? (
            <div
              className="rounded-xl px-4 py-8 text-center"
              style={{
                background: "rgba(17,32,64,0.4)",
                border: "1px dashed rgba(201,214,223,0.12)",
              }}
            >
              <Building2 size={32} className="mx-auto mb-3" style={{ color: "#7A90A8" }} />
              <p className="text-sm" style={{ color: "#7A90A8" }}>
                No active commission agreements yet. Create one to enable the practitioner channel for a brand.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {withAgreements.map((mfg) => {
                const agreement = mfg.agreements![0]!;
                return (
                  <div
                    key={mfg.id}
                    className="rounded-xl p-5"
                    style={{
                      background: "rgba(17,32,64,0.6)",
                      border: "1px solid rgba(201,214,223,0.08)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4
                          className="text-base font-bold text-white mb-1"
                          style={{ fontFamily: "Montserrat, sans-serif" }}
                        >
                          {mfg.name}
                        </h4>
                        <p className="text-xs" style={{ color: "#7A90A8" }}>
                          {mfg.product_count || 0} products · {mfg.eligible_product_count || 0} dispensary-eligible
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(mfg)}
                          disabled={pending}
                          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50"
                          title="Edit agreement"
                        >
                          <Edit size={14} style={{ color: "#7A90A8" }} />
                        </button>
                        <button
                          onClick={() => handleTerminate(agreement.id)}
                          disabled={pending}
                          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50"
                          title="Terminate agreement"
                        >
                          <Trash2 size={14} style={{ color: "#F87171" }} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: "#7A90A8" }}>
                          Consumer Rate
                        </p>
                        <p className="text-sm font-bold" style={{ color: "#14B8A6" }}>
                          {agreement.consumer_rate.toFixed(2)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: "#7A90A8" }}>
                          Practitioner Rate
                        </p>
                        <p className="text-sm font-bold" style={{ color: "#14B8A6" }}>
                          {agreement.practitioner_rate.toFixed(2)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: "#7A90A8" }}>
                          Elite Rate
                        </p>
                        <p className="text-sm font-bold" style={{ color: "#14B8A6" }}>
                          {agreement.elite_rate.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {agreement.practitioner_channel_enabled ? (
                          <CheckCircle2 size={14} style={{ color: "#34D399" }} />
                        ) : (
                          <XCircle size={14} style={{ color: "#F87171" }} />
                        )}
                        <span className="text-xs" style={{ color: "#C9D6DF" }}>
                          Practitioner Channel {agreement.practitioner_channel_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleChannel(agreement.id, agreement.practitioner_channel_enabled)}
                        disabled={pending}
                        className="px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                        style={{
                          border: "1px solid rgba(201,214,223,0.2)",
                          color: "#C9D6DF",
                        }}
                      >
                        {agreement.practitioner_channel_enabled ? "Disable" : "Enable"}
                      </button>
                    </div>

                    {agreement.notes && (
                      <p className="text-xs mt-3 pt-3 border-t border-white/5" style={{ color: "#7A90A8" }}>
                        <span className="font-semibold">Notes:</span> {agreement.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3
            className="text-sm font-bold text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Manufacturers Without Agreements ({withoutAgreements.length})
          </h3>

          {withoutAgreements.length > 0 && (
            <div className="space-y-2">
              {withoutAgreements.map((mfg) => (
                <div
                  key={mfg.id}
                  className="rounded-lg px-4 py-3 flex items-center justify-between"
                  style={{
                    background: "rgba(17,32,64,0.3)",
                    border: "1px solid rgba(201,214,223,0.05)",
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{mfg.name}</p>
                    <p className="text-xs" style={{ color: "#7A90A8" }}>
                      {mfg.product_count || 0} products
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({ ...formData, manufacturer_id: mfg.id });
                      handleCreateNew();
                    }}
                    disabled={pending}
                    className="text-xs font-bold disabled:opacity-50"
                    style={{ color: "#14B8A6" }}
                  >
                    Create Agreement
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
