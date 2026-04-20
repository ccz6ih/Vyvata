"use client";

// Multi-step submission form editor. Four sections:
// 1. Product Identity
// 2. Manufacturing Evidence
// 3. Clinical Evidence
// 4. Safety & Transparency

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VyvataLogo } from "@/components/VyvataLogo";
import { IngredientEditor } from "@/components/IngredientEditor";
import type { Ingredient } from "@/components/IngredientEditor";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  FileText,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { SubmissionData } from "@/lib/brand-submission/schemas";

interface SubmissionEditorProps {
  submission: {
    id: string;
    status: string;
    claimed_brand: string | null;
    claimed_product_name: string | null;
    claimed_sku: string | null;
    submission_data: unknown;
    file_references: unknown[];
    submitted_at: string | null;
    decided_at: string | null;
    reviewer_notes: string | null;
    created_at: string;
    updated_at: string;
    product: { id: string; slug: string; brand: string; name: string; category: string } | null;
  };
}

const STEPS = [
  { id: 1, label: "Product Identity", icon: FileText },
  { id: 2, label: "Manufacturing", icon: CheckCircle2 },
  { id: 3, label: "Clinical Evidence", icon: FileText },
  { id: 4, label: "Safety", icon: AlertCircle },
];

export default function SubmissionEditor({ submission }: SubmissionEditorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SubmissionData>(
    (submission.submission_data as SubmissionData) || {
      product_identity: { product_name: "", brand_name: "", category: "", ingredients: [] },
      manufacturing_evidence: {
        nsf_sport: false,
        usp_verified: false,
        informed_sport: false,
        informed_choice: false,
        bscg_certified: false,
        non_gmo: false,
        organic_usda: false,
        vegan: false,
        gluten_free: false,
        kosher: false,
        halal: false,
        gmp_certified: false,
        fda_registered: false,
      },
      clinical_evidence: { clinical_study_urls: [] },
      safety_transparency: {},
    }
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = ["draft", "needs_revision"].includes(submission.status);
  const isReadOnly = !canEdit;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_data: formData }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    // Validate legal attestation
    if (!formData.safety_transparency.legal_attestation) {
      setError("Please check the legal attestation box before submitting.");
      setCurrentStep(4); // Go to Safety section
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/brand/submissions/${submission.id}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submit failed");
      }
      router.push("/brand/dashboard?submitted=true");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(section: keyof SubmissionData, field: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }

  return (
    <main className="min-h-dvh" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between"
        style={{
          background: "rgba(11,31,59,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,214,223,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/brand/dashboard")}
            className="p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: "#7A90A8" }}
          >
            <ArrowLeft size={16} />
          </button>
          <VyvataLogo size={18} />
          <span className="text-xs" style={{ color: "#7A90A8" }}>
            {isReadOnly ? "View submission" : "Edit submission"}
          </span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.08)", color: "#C9D6DF" }}
            >
              <Save size={12} />
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#14B8A6,#0F766E)", color: "#fff" }}
            >
              <Send size={12} />
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        )}
      </header>

      {/* Progress stepper */}
      <div
        className="px-5 py-6"
        style={{ background: "rgba(17,32,64,0.4)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className="flex items-center gap-2"
                  disabled={isReadOnly}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg,#14B8A6,#0F766E)"
                        : isComplete
                        ? "rgba(20,184,166,0.3)"
                        : "rgba(255,255,255,0.05)",
                      border: isActive ? "2px solid #14B8A6" : "1px solid rgba(201,214,223,0.12)",
                    }}
                  >
                    <Icon size={14} style={{ color: isActive || isComplete ? "#fff" : "#7A90A8" }} />
                  </div>
                  <span
                    className="text-xs font-semibold hidden md:inline"
                    style={{ color: isActive ? "#14B8A6" : isComplete ? "#C9D6DF" : "#7A90A8" }}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px mx-3"
                    style={{ background: isComplete ? "#14B8A6" : "rgba(201,214,223,0.12)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status banner */}
      {submission.status === "needs_revision" && submission.reviewer_notes && (
        <div
          className="max-w-3xl mx-auto mt-6 px-5"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "16px" }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: "#F59E0B" }}>
            Needs revision
          </p>
          <p className="text-xs" style={{ color: "#C9D6DF" }}>
            {submission.reviewer_notes}
          </p>
        </div>
      )}

      {error && (
        <div
          className="max-w-3xl mx-auto mt-6 px-5"
          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "12px", padding: "16px" }}
        >
          <p className="text-sm" style={{ color: "#F87171" }}>
            {error}
          </p>
        </div>
      )}

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        {currentStep === 1 && (
          <ProductIdentitySection
            data={formData.product_identity}
            onChange={(field, value) => updateField("product_identity", field, value)}
            readOnly={isReadOnly}
          />
        )}
        {currentStep === 2 && (
          <ManufacturingSection
            data={formData.manufacturing_evidence}
            onChange={(field, value) => updateField("manufacturing_evidence", field, value)}
            readOnly={isReadOnly}
          />
        )}
        {currentStep === 3 && (
          <ClinicalSection
            data={formData.clinical_evidence}
            onChange={(field, value) => updateField("clinical_evidence", field, value)}
            readOnly={isReadOnly}
          />
        )}
        {currentStep === 4 && (
          <SafetySection
            data={formData.safety_transparency}
            onChange={(field, value) => updateField("safety_transparency", field, value)}
            readOnly={isReadOnly}
          />
        )}
      </div>

      {/* Navigation buttons */}
      {!isReadOnly && (
        <div
          className="sticky bottom-0 px-5 py-4 flex items-center justify-between"
          style={{
            background: "rgba(11,31,59,0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(201,214,223,0.08)",
          }}
        >
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.08)", color: "#C9D6DF" }}
          >
            <ArrowLeft size={14} />
            Previous
          </button>
          <button
            onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
            disabled={currentStep === STEPS.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-30"
            style={{ background: "linear-gradient(135deg,#14B8A6,#0F766E)", color: "#fff" }}
          >
            Next
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </main>
  );
}

// Form sections (simplified placeholders - expand as needed)

function ProductIdentitySection({
  data,
  onChange,
  readOnly,
}: {
  data: SubmissionData["product_identity"];
  onChange: (field: string, value: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Product Identity
      </h2>
      <FormField label="Product name" required>
        <input
          type="text"
          value={data.product_name}
          onChange={(e) => onChange("product_name", e.target.value)}
          disabled={readOnly}
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
      <FormField label="Brand name" required>
        <input
          type="text"
          value={data.brand_name}
          onChange={(e) => onChange("brand_name", e.target.value)}
          disabled={readOnly}
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
      <FormField label="Category" required>
        <input
          type="text"
          value={data.category}
          onChange={(e) => onChange("category", e.target.value)}
          disabled={readOnly}
          placeholder="e.g., omega-3, magnesium, multivitamin"
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
      
      <IngredientEditor
        // Shape mismatch: the Zod schema stores ingredient.amount as a
        // free-text string ("500mg"), IngredientEditor wants (number |
        // null) + unit. Tracked in
        // approve-submission.ts::parseDose — cast through unknown for
        // now, plumb the editor-native shape through the schema next
        // iteration to keep user input consistent end-to-end.
        ingredients={(data.ingredients ?? []) as unknown as Ingredient[]}
        onChange={(ingredients) => onChange("ingredients", ingredients)}
        readOnly={readOnly}
        minIngredients={1}
        maxIngredients={50}
      />
    </div>
  );
}

function ManufacturingSection({
  data,
  onChange,
  readOnly,
}: {
  data: SubmissionData["manufacturing_evidence"];
  onChange: (field: string, value: unknown) => void;
  readOnly: boolean;
}) {
  const certs = [
    { id: "nsf_sport", label: "NSF Sport" },
    { id: "usp_verified", label: "USP Verified" },
    { id: "informed_sport", label: "Informed Sport" },
    { id: "informed_choice", label: "Informed Choice" },
    { id: "bscg_certified", label: "BSCG Certified" },
    { id: "non_gmo", label: "Non-GMO" },
    { id: "organic_usda", label: "USDA Organic" },
    { id: "vegan", label: "Vegan" },
    { id: "gluten_free", label: "Gluten Free" },
    { id: "kosher", label: "Kosher" },
    { id: "halal", label: "Halal" },
    { id: "gmp_certified", label: "GMP Certified" },
    { id: "fda_registered", label: "FDA Registered" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Manufacturing Evidence
      </h2>
      <FormField label="Third-party certifications">
        <div className="grid grid-cols-2 gap-2">
          {certs.map((cert) => (
            <label
              key={cert.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <input
                type="checkbox"
                checked={data[cert.id as keyof typeof data] as boolean}
                onChange={(e) => onChange(cert.id, e.target.checked)}
                disabled={readOnly}
                className="accent-teal-500"
              />
              <span className="text-sm" style={{ color: "#C9D6DF" }}>
                {cert.label}
              </span>
            </label>
          ))}
        </div>
      </FormField>
    </div>
  );
}

function ClinicalSection({
  data,
  onChange,
  readOnly,
}: {
  data: SubmissionData["clinical_evidence"];
  onChange: (field: string, value: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Clinical Evidence
      </h2>
      <FormField label="Primary health outcome">
        <textarea
          value={data.primary_health_outcome ?? ""}
          onChange={(e) => onChange("primary_health_outcome", e.target.value)}
          disabled={readOnly}
          placeholder="e.g., Supports cardiovascular health and reduces inflammation"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
      <FormField label="Study summary">
        <textarea
          value={data.study_summary ?? ""}
          onChange={(e) => onChange("study_summary", e.target.value)}
          disabled={readOnly}
          placeholder="Summarize key clinical findings..."
          rows={5}
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
    </div>
  );
}

function SafetySection({
  data,
  onChange,
  readOnly,
}: {
  data: SubmissionData["safety_transparency"];
  onChange: (field: string, value: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Safety & Transparency
      </h2>
      <FormField label="Known contraindications">
        <textarea
          value={data.contraindications ?? ""}
          onChange={(e) => onChange("contraindications", e.target.value)}
          disabled={readOnly}
          placeholder="e.g., Not recommended for individuals on blood thinners"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
      <FormField label="Known interactions">
        <textarea
          value={data.known_interactions ?? ""}
          onChange={(e) => onChange("known_interactions", e.target.value)}
          disabled={readOnly}
          placeholder="e.g., May interact with warfarin"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50"
          style={{ borderColor: "rgba(201,214,223,0.12)" }}
        />
      </FormField>
      
      {/* Legal Attestation */}
      <div
        className="p-4 rounded-lg"
        style={{
          background: "rgba(20,184,166,0.05)",
          border: "1px solid rgba(20,184,166,0.2)",
        }}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.legal_attestation ?? false}
            onChange={(e) => onChange("legal_attestation", e.target.checked)}
            disabled={readOnly}
            className="mt-1 accent-teal-500"
          />
          <div className="flex-1">
            <p className="text-sm font-bold mb-1" style={{ color: "#14B8A6" }}>
              Legal Attestation *
            </p>
            <p className="text-xs" style={{ color: "#C9D6DF" }}>
              I attest that all information provided in this submission is accurate and complete to the best of my knowledge. I understand that false or misleading information may result in disqualification from the Vyvata platform and potential legal consequences.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
        {label} {required && <span style={{ color: "#F87171" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
