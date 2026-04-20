import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import { CheckCircle2, Shield, TrendingUp, Users, ArrowRight, FileCheck } from "lucide-react";

export const metadata = {
  title: "Brand Submission Portal | Vyvata",
  description:
    "Unlock Verified scoring, increase discoverability, and demonstrate transparency through our brand submission portal.",
};

export default function SubmitLandingPage() {
  return (
    <main
      className="min-h-dvh"
      style={{ background: "linear-gradient(180deg, #0B1F3B 0%, #051123 100%)", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <VyvataLogo size={24} />
          <span className="text-lg font-bold" style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}>
            Vyvata
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/brand/login"
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ color: "#C9D6DF" }}
          >
            Login
          </Link>
          <Link
            href="/brand/login"
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#14B8A6,#0F766E)", color: "#fff" }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 py-20 max-w-6xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)" }}
        >
          <Shield size={14} style={{ color: "#14B8A6" }} />
          <span className="text-xs font-bold" style={{ color: "#14B8A6" }}>
            TRUSTED BY LEADING BRANDS
          </span>
        </div>
        <h1
          className="text-5xl md:text-6xl font-bold mb-6"
          style={{ color: "#fff", fontFamily: "Montserrat, sans-serif", lineHeight: "1.1" }}
        >
          Unlock <span style={{ color: "#14B8A6" }}>Verified</span> Scoring
          <br />
          for Your Products
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-3xl mx-auto" style={{ color: "#7A90A8" }}>
          Submit detailed documentation about your products to unlock Verified tier scoring, increase
          discoverability, and demonstrate transparency to consumers and practitioners.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/brand/login"
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-base font-bold"
            style={{ background: "linear-gradient(135deg,#14B8A6,#0F766E)", color: "#fff" }}
          >
            Start submission
            <ArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            className="px-6 py-3 rounded-lg text-base font-bold"
            style={{ background: "rgba(255,255,255,0.08)", color: "#C9D6DF" }}
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Benefits */}
      <section
        className="px-5 py-20"
        style={{ background: "rgba(17,32,64,0.4)", borderTop: "1px solid rgba(201,214,223,0.08)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold mb-12 text-center"
            style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
          >
            Why Submit Your Products?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <BenefitCard
              icon={<Shield size={32} style={{ color: "#14B8A6" }} />}
              title="Unlock Verified Scoring"
              description="Move beyond AI-inferred scores. Verified submissions receive full-weight scoring with no caps, unlocking access to high-tier ratings (75–100)."
            />
            <BenefitCard
              icon={<TrendingUp size={32} style={{ color: "#14B8A6" }} />}
              title="Increase Discoverability"
              description="Verified products rank higher in search results and practitioner recommendations. Stand out from competitors with transparent, validated quality."
            />
            <BenefitCard
              icon={<Users size={32} style={{ color: "#14B8A6" }} />}
              title="Qualify for Dispensary Program"
              description="Products with Verified scores of 75+ become eligible for our practitioner dispensary program, unlocking a new revenue channel."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-5 py-20 max-w-6xl mx-auto">
        <h2
          className="text-3xl md:text-4xl font-bold mb-12 text-center"
          style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
        >
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <ProcessStep
            number={1}
            title="Create your brand account"
            description="Sign up with your brand email and provide basic information about your company. Your account will be reviewed and activated by our team."
          />
          <ProcessStep
            number={2}
            title="Submit product documentation"
            description="Fill out our comprehensive submission form covering product identity, manufacturing evidence, clinical studies, and safety transparency."
          />
          <ProcessStep
            number={3}
            title="Expert review"
            description="Our team reviews your submission for completeness and accuracy. We may request additional information or clarification."
          />
          <ProcessStep
            number={4}
            title="Verified score unlocked"
            description="Once approved, your product receives a Verified score with full-weight metrics. Your product is now eligible for practitioner recommendations."
          />
        </div>
      </section>

      {/* Submission sections */}
      <section
        className="px-5 py-20"
        style={{ background: "rgba(17,32,64,0.4)", borderTop: "1px solid rgba(201,214,223,0.08)", borderBottom: "1px solid rgba(201,214,223,0.08)" }}
      >
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold mb-12 text-center"
            style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
          >
            What You'll Submit
          </h2>
          <div className="space-y-6">
            <SubmissionSection
              title="Product Identity"
              items={["Product name, brand, and category", "Complete ingredient list with amounts", "Serving size and container information"]}
            />
            <SubmissionSection
              title="Manufacturing Evidence"
              items={["Third-party certifications (NSF Sport, USP Verified, etc.)", "GMP certification and FDA registration", "Testing frequency and facility details"]}
            />
            <SubmissionSection
              title="Clinical Evidence"
              items={["Primary health outcomes", "Links to clinical studies", "Summary of research findings"]}
            />
            <SubmissionSection
              title="Safety & Transparency"
              items={["Known contraindications and interactions", "Ingredient sourcing information", "Paid endorsement disclosure"]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 max-w-6xl mx-auto text-center">
        <h2
          className="text-3xl md:text-4xl font-bold mb-6"
          style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
        >
          Ready to Get Verified?
        </h2>
        <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: "#7A90A8" }}>
          Join leading supplement brands who have unlocked Verified scoring and increased their visibility on Vyvata.
        </p>
        <Link
          href="/brand/login"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-bold"
          style={{ background: "linear-gradient(135deg,#14B8A6,#0F766E)", color: "#fff" }}
        >
          Start your submission
          <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="px-5 py-8 text-center"
        style={{ borderTop: "1px solid rgba(201,214,223,0.08)" }}
      >
        <p className="text-sm" style={{ color: "#7A90A8" }}>
          © 2026 Vyvata. All rights reserved. |{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
        </p>
      </footer>
    </main>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-6 rounded-lg"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,214,223,0.08)" }}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2" style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: "#7A90A8" }}>
        {description}
      </p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold"
        style={{ background: "linear-gradient(135deg,#14B8A6,#0F766E)", color: "#fff" }}
      >
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold mb-2" style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: "#7A90A8" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function SubmissionSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div
      className="p-6 rounded-lg"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,214,223,0.08)" }}
    >
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "#fff" }}>
        <FileCheck size={20} style={{ color: "#14B8A6" }} />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm" style={{ color: "#C9D6DF" }}>
            <CheckCircle2 size={16} style={{ color: "#14B8A6", marginTop: "2px" }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
