"use client";

// Dynamic ingredient editor for brand submission forms
// Allows adding, editing, removing ingredients with proper validation

import { useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";

export interface Ingredient {
  name: string;
  amount: number | null;
  unit: string;
}

interface IngredientEditorProps {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
  readOnly?: boolean;
  minIngredients?: number;
  maxIngredients?: number;
}

const COMMON_UNITS = [
  "mg",
  "mcg",
  "g",
  "IU",
  "mL",
  "%",
  "billion CFU",
  "mg DHA",
  "mg EPA",
];

export function IngredientEditor({
  ingredients,
  onChange,
  readOnly = false,
  minIngredients = 1,
  maxIngredients = 50,
}: IngredientEditorProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  function addIngredient() {
    if (ingredients.length >= maxIngredients) return;
    onChange([...ingredients, { name: "", amount: null, unit: "mg" }]);
  }

  function removeIngredient(index: number) {
    if (ingredients.length <= minIngredients) return;
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);
    // Clear error for removed ingredient
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string | number | null) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);

    // Validate on change
    validateIngredient(index, updated[index]);
  }

  function validateIngredient(index: number, ingredient: Ingredient) {
    const newErrors = { ...errors };

    if (!ingredient.name.trim()) {
      newErrors[index] = "Ingredient name is required";
    } else if (ingredient.name.length > 200) {
      newErrors[index] = "Ingredient name too long (max 200 characters)";
    } else if (ingredient.amount !== null && ingredient.amount <= 0) {
      newErrors[index] = "Amount must be positive";
    } else if (ingredient.amount !== null && ingredient.amount > 1000000) {
      newErrors[index] = "Amount too large";
    } else {
      delete newErrors[index];
    }

    setErrors(newErrors);
  }

  const canAdd = ingredients.length < maxIngredients && !readOnly;
  const canRemove = (index: number) =>
    ingredients.length > minIngredients && !readOnly;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "#C9D6DF" }}>
            Ingredients
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#7A90A8" }}>
            List all active ingredients with amounts and units
          </p>
        </div>
        {canAdd && (
          <button
            onClick={addIngredient}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg,#14B8A6,#0F766E)",
              color: "#fff",
            }}
          >
            <Plus size={12} />
            Add ingredient
          </button>
        )}
      </div>

      {/* Empty state */}
      {ingredients.length === 0 && (
        <div
          className="p-6 rounded-lg text-center"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(201,214,223,0.2)",
          }}
        >
          <p className="text-sm" style={{ color: "#7A90A8" }}>
            No ingredients added yet. Click "Add ingredient" to get started.
          </p>
        </div>
      )}

      {/* Ingredient list */}
      {ingredients.length > 0 && (
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className="p-4 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: errors[index]
                  ? "1px solid rgba(248,113,113,0.5)"
                  : "1px solid rgba(201,214,223,0.08)",
              }}
            >
              {/* Ingredient row */}
              <div className="flex items-start gap-3">
                {/* Index badge */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: "rgba(20,184,166,0.2)",
                    color: "#14B8A6",
                  }}
                >
                  {index + 1}
                </div>

                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor={`ingredient-name-${index}`}
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "#7A90A8" }}
                    >
                      Ingredient name *
                    </label>
                    <input
                      id={`ingredient-name-${index}`}
                      type="text"
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(index, "name", e.target.value)
                      }
                      disabled={readOnly}
                      placeholder="e.g., Omega-3 Fish Oil, Vitamin D3"
                      className="w-full px-3 py-2 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      style={{ borderColor: "rgba(201,214,223,0.12)" }}
                    />
                  </div>

                  {/* Amount */}
                  <div className="md:col-span-1">
                    <label
                      htmlFor={`ingredient-amount-${index}`}
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "#7A90A8" }}
                    >
                      Amount
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`ingredient-amount-${index}`}
                        type="number"
                        value={ingredient.amount ?? ""}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            "amount",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        disabled={readOnly}
                        placeholder="1000"
                        min="0"
                        step="any"
                        className="w-full px-3 py-2 rounded-lg bg-transparent border text-white text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        style={{ borderColor: "rgba(201,214,223,0.12)" }}
                      />
                      <select
                        value={ingredient.unit}
                        onChange={(e) =>
                          updateIngredient(index, "unit", e.target.value)
                        }
                        disabled={readOnly}
                        className="px-3 py-2 rounded-lg bg-[#0B1F3B] border text-white text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        style={{ borderColor: "rgba(201,214,223,0.12)" }}
                      >
                        {COMMON_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                {canRemove(index) && (
                  <button
                    onClick={() => removeIngredient(index)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                    style={{ color: "#F87171" }}
                    title="Remove ingredient"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Error message */}
              {errors[index] && (
                <div className="flex items-start gap-2 mt-2 px-2">
                  <AlertCircle size={12} style={{ color: "#F87171", marginTop: "2px" }} />
                  <p className="text-xs" style={{ color: "#F87171" }}>
                    {errors[index]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Validation summary */}
      {hasErrors && (
        <div
          className="p-3 rounded-lg flex items-start gap-2"
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
          }}
        >
          <AlertCircle size={14} style={{ color: "#F87171", marginTop: "2px" }} />
          <div>
            <p className="text-xs font-bold" style={{ color: "#F87171" }}>
              Please fix ingredient errors before submitting
            </p>
          </div>
        </div>
      )}

      {/* Helper text */}
      <div
        className="p-3 rounded-lg"
        style={{
          background: "rgba(122,144,168,0.08)",
          border: "1px solid rgba(122,144,168,0.12)",
        }}
      >
        <p className="text-xs" style={{ color: "#7A90A8" }}>
          <strong>Tip:</strong> List ingredients in descending order by amount (most to least). Include all active ingredients shown on your product label.
        </p>
      </div>
    </div>
  );
}
