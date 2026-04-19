"use client";

// Admin submissions queue client. Renders the list from the server
// component and wires the three review actions (approve / reject /
// request-revision). All three POST to /api/admin/submissions/[id]/<action>
// and then refetch the current page via router.refresh().

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, Clock, ExternalLink, RefreshCw,
} from "lucide-react";
import { VyvataLogo } from "@/components/VyvataLogo";
import { productUrl } from "@/lib/urls";

export interface SubmissionRow {
  id: string;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected" | "needs_revision";
  submitted_at: string | null;
  review_started_at: string | null;
  decided_at: string | null;
  reviewer_notes: string | null;
  claimed_brand: string | null;
  claimed_product_name: string | null;
  claimed_sku: string | null;
  submission_data: Record<string, unknown>;
  file_references: Array<{ kind: string; path: string; size?: number; uploaded_at?: string }>;
  created_at: string;
  updated_at: string;
  brand: { id: string; email: string; company_name: string; status: string }
    | Array<{ id: string; email: string; company_name: string; status: string }>
    | null;
  product: { id: string; slug: string | null; brand: string; name: string }
    | Array<{ id: string; slug: string | null; brand: string; name: string }>
    | null;
}

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

const STATUS_COLOR: Record<string, string> = {
  submitted: "#60a5fa",
  reviewing: "#F59E0B",
  approved: "#34D399",
  rejected: "#F87171",
  needs_revision: "#F59E0B",
};

function firstOrSelf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function AdminSubmissionsClient({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = rows.filter((r) => r.status === "submitted" || r.status === "reviewing").length;

  async function act(id: string, action: "approve" | "reject" | "request-revision", notes?: string) {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_notes: notes ?? null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Action failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
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
            Submissions
          </span>
        </div>
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.05)", color: "#7A90A8" }}
        >
          <RefreshCw size={12} className={pending ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-widest" style={{ color: "#14B8A6" }}>
            BRAND PORTAL · REVIEW QUEUE
          </p>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Submissions
          </h1>
          <p className="text-sm" style={{ color: "#C9D6DF" }}>
            {pendingCount} awaiting review · {rows.length} total
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

        {rows.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center space-y-3"
            style={{
              background: "rgba(17,32,64,0.4)",
              border: "1px dashed rgba(201,214,223,0.12)",
            }}
          >
            <FileText size={32} className="mx-auto" style={{ color: "#14B8A6" }} />
            <p className="text-sm font-semibold text-white">No submissions yet</p>
            <p className="text-xs" style={{ color: "#7A90A8" }}>
              Submissions land here once a brand clicks &quot;Submit&quot; from
              /brand/dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const brand = firstOrSelf(r.brand);
              const product = firstOrSelf(r.product);
              const color = STATUS_COLOR[r.status] ?? "#7A90A8";
              const label = STATUS_LABEL[r.status] ?? r.status;
              const isActive = r.status === "submitted" || r.status === "reviewing" || r.status === "needs_revision";
              const actingThis = actingId === r.id;
              const fileCount = Array.isArray(r.file_references) ? r.file_references.length : 0;

              return (
                <div
                  key={r.id}
                  className="rounded-xl px-4 py-4 space-y-3"
                  style={{
                    background: "rgba(17,32,64,0.6)",
                    border: "1px solid rgba(201,214,223,0.08)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        background: `${color}18`,
                        color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      {label}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p
                        className="text-sm font-semibold text-white truncate"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {brand?.company_name ?? r.claimed_brand ?? "—"}
                        {" · "}
                        {product?.name ?? r.claimed_product_name ?? "Untitled"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "#7A90A8" }}>
                        {brand?.email}
                        {r.submitted_at && ` · submitted ${formatDate(r.submitted_at)}`}
                        {fileCount > 0 && ` · ${fileCount} file${fileCount === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    {product && (
                      <Link
                        href={productUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-xs"
                        style={{ color: "#14B8A6" }}
                      >
                        <ExternalLink size={11} />
                        Scorecard
                      </Link>
                    )}
                  </div>

                  {r.reviewer_notes && (
                    <p
                      className="text-xs px-3 py-2 rounded-lg"
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        color: "#FCD34D",
                      }}
                    >
                      <strong>Reviewer notes:</strong> {r.reviewer_notes}
                    </p>
                  )}

                  {isActive && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => act(r.id, "approve")}
                        disabled={actingThis || pending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                        style={{
                          background: "rgba(52,211,153,0.12)",
                          border: "1px solid rgba(52,211,153,0.3)",
                          color: "#34D399",
                          fontFamily: "Montserrat, sans-serif",
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt("What needs to change? (shown to the brand)");
                          if (notes) act(r.id, "request-revision", notes);
                        }}
                        disabled={actingThis || pending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                        style={{
                          background: "rgba(245,158,11,0.12)",
                          border: "1px solid rgba(245,158,11,0.3)",
                          color: "#F59E0B",
                          fontFamily: "Montserrat, sans-serif",
                        }}
                      >
                        <AlertCircle size={12} />
                        Request revision
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt("Reason for rejection (shown to the brand)");
                          if (notes) act(r.id, "reject", notes);
                        }}
                        disabled={actingThis || pending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                        style={{
                          background: "rgba(248,113,113,0.12)",
                          border: "1px solid rgba(248,113,113,0.3)",
                          color: "#F87171",
                          fontFamily: "Montserrat, sans-serif",
                        }}
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                      {actingThis && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#7A90A8" }}>
                          <Clock size={11} />
                          Working…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
