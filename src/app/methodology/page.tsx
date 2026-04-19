import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import {
  Shield,
  Eye,
  Beaker,
  Factory,
  Microscope,
  Leaf,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Metadata } from "next";
import {
  DIMENSION_CAPS,
  AI_INFERRED_MAX,
  VERIFIED_MAX,
  TOTAL_INTAKE_BONUS,
  type DimensionId,
} from "@/lib/scoring/dimension-caps";

export const metadata: Metadata = {
  title: "Methodology — How Vyvata Calculates the Integrity Score",
  description:
    "The Vyvata Standards Framework (VSF) grades every supplement on six weighted dimensions. This page documents the sources, weights, tier thresholds, and limitations of the methodology.",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#0B1F3B] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 mb-6">
            <VyvataLogo size={32} />
            <span className="font-semibold">Back to Home</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Methodology</h1>
          <p className="text-lg text-gray-300">
            How Vyvata calculates the Integrity Score
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300">
            The Vyvata Standards Framework (VSF) grades every supplement on six weighted dimensions.
            This page documents the sources, weights, tier thresholds, and limitations of the methodology.
          </p>
          
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-teal-400" />
              Coming Soon
            </h2>
            <p className="text-gray-300">
              Detailed methodology documentation is under development.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
