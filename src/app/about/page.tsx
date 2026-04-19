import Link from "next/link";
import { VyvataLogo } from "@/components/VyvataLogo";
import { Shield, Database, BarChart3, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Vyvata — Why We Built the Integrity Score for Supplements",
  description:
    "Vyvata is the independent integrity score for what you put in your body. Learn about our mission, principles, and why we built a standard you can actually trust.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen" style={{ background: "#0B1F3B" }}>
      {/* Navigation */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto border-b" style={{ borderColor: "rgba(201,214,223,0.1)" }}>
        <Link href="/" className="flex items-center gap-3">
          <VyvataLogo size={28} />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            Vyvata
          </span>
        </Link>
        <Link 
          href="/"
          className="text-sm hover:text-white transition-colors"
          style={{ color: "#C9D6DF" }}
        >
          ← Back to Home
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 mb-16">
            <h1
              className="text-5xl md:text-6xl font-black leading-tight"
              style={{ 
                color: "#FFFFFF", 
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: "-0.02em"
              }}
            >
              The integrity score for what you put in your body.
            </h1>
            <p
              className="text-xl md:text-2xl leading-relaxed max-w-3xl"
              style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}
            >
              Evidence-graded. Compliance-checked. Accountable to you, not the brands being scored.
            </p>
          </div>

          {/* Why Vyvata */}
          <div className="space-y-8 mb-20">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              Why Vyvata
            </h2>
            <div className="space-y-6" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
              <p className="text-lg leading-relaxed">
                In Ayurveda, <em style={{ color: "#14B8A6" }}>vata</em> is the vital force — breath, circulation, 
                the current that moves through the body and carries everything else with it. It's one of the oldest 
                ideas in human medicine: that clarity of movement is the foundation of health.
              </p>
              <p className="text-lg leading-relaxed">
                We didn't take the name from a dictionary. We built it — evoking that older idea, because modern 
                supplement wellness has drifted so far from it that the word for what we do didn't really exist yet. 
                An independent voice. A clear current through a murky industry. A standard you can actually trust.
              </p>
              <p className="text-lg leading-relaxed font-semibold" style={{ color: "#FFFFFF" }}>
                Vyvata is the integrity score for what you put in your body. Evidence-graded. Compliance-checked. 
                Accountable to you — not to the brands being scored.
              </p>
            </div>
          </div>

          {/* The Six Principles */}
          <div className="space-y-8 mb-20">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              What Vyvata Stands For
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
              Six principles govern how Vyvata operates — the Vyvata Standards:
            </p>
            
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  number: "1",
                  title: "Verify what's claimed",
                  desc: "Every claim checked against evidence."
                },
                {
                  number: "2",
                  title: "Yield nothing to opacity",
                  desc: "Missing data scores zero, not neutral."
                },
                {
                  number: "3",
                  title: "Validate against evidence",
                  desc: "PubMed, FDA, NSF, USP — not marketing copy."
                },
                {
                  number: "4",
                  title: "Audit continuously",
                  desc: "Scores are living documents. When evidence changes, scores change."
                },
                {
                  number: "5",
                  title: "Trust, earned — not given",
                  desc: "No pay-to-play. No sponsored rankings."
                },
                {
                  number: "6",
                  title: "Accountability to the consumer, always",
                  desc: "Vyvata's customer is the person reading the score, not the brand being scored."
                }
              ].map((principle) => (
                <div
                  key={principle.number}
                  className="p-6 rounded-xl"
                  style={{
                    background: "rgba(20, 184, 166, 0.05)",
                    border: "1px solid rgba(20, 184, 166, 0.2)"
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                      style={{
                        background: "#14B8A6",
                        color: "#0B1F3B",
                        fontFamily: "Montserrat, sans-serif"
                      }}
                    >
                      {principle.number}
                    </div>
                    <div className="space-y-2">
                      <h3
                        className="text-lg font-bold"
                        style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}
                      >
                        {principle.title}
                      </h3>
                      <p style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
                        {principle.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How We Work */}
          <div className="space-y-8 mb-20">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              How We Work
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Database,
                  title: "NIH-Sourced Products",
                  desc: "69+ products from the NIH Dietary Supplement Label Database (DSLD), with daily data refresh."
                },
                {
                  icon: BarChart3,
                  title: "VSF Integrity Scoring",
                  desc: "Evidence quality, formulation integrity, bioavailability, transparency, and certifications rated 0-100."
                },
                {
                  icon: Shield,
                  title: "Compliance-First",
                  desc: "Structure/function claims only. No disease claims. No legal exposure for you or your practitioners."
                }
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl text-center space-y-4"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(201, 214, 223, 0.1)"
                  }}
                >
                  <div className="flex justify-center">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(20, 184, 166, 0.15)" }}
                    >
                      <feature.icon size={24} style={{ color: "#14B8A6" }} />
                    </div>
                  </div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Voice & Tone */}
          <div className="space-y-8 mb-20">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
            >
              Our Voice
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
              Vyvata writes like a reviewer, not a marketer. Declarative sentences. Evidence-forward, never hype-forward. 
              Present tense. Concrete over abstract. We respect the reader — practitioners and informed consumers are our audience.
            </p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div
                className="p-6 rounded-xl space-y-3"
                style={{
                  background: "rgba(20, 184, 166, 0.05)",
                  border: "1px solid rgba(20, 184, 166, 0.2)"
                }}
              >
                <h3
                  className="font-bold flex items-center gap-2"
                  style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
                >
                  <CheckCircle2 size={18} />
                  Words We Use
                </h3>
                <p style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
                  Integrity. Evidence. Verification. Independence. Transparency. Accountability. Standard. Audit.
                </p>
              </div>

              <div
                className="p-6 rounded-xl space-y-3"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(201, 214, 223, 0.1)"
                }}
              >
                <h3
                  className="font-bold flex items-center gap-2"
                  style={{ color: "#C9D6DF", fontFamily: "Montserrat, sans-serif" }}
                >
                  <Zap size={18} />
                  Words We Avoid
                </h3>
                <p style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
                  Clean, pure, natural (unqualified), revolutionary, proprietary (except in criticism), 
                  synergy (unless clinically justified), optimize, biohack.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div
            className="p-10 rounded-2xl text-center space-y-6"
            style={{
              background: "linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(20, 184, 166, 0.02) 100%)",
              border: "1px solid rgba(20, 184, 166, 0.25)"
            }}
          >
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}
            >
              Ready to Get Started?
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#C9D6DF", fontFamily: "Inter, sans-serif" }}>
              Build your personalized wellness protocol in 60 seconds. Evidence-graded products, 
              bioavailability-scored, compliance-first.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all hover:shadow-lg"
              style={{
                background: "#14B8A6",
                fontFamily: "Montserrat, sans-serif"
              }}
            >
              Get Your Protocol
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t" style={{ borderColor: "rgba(201,214,223,0.1)" }}>
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <VyvataLogo size={24} />
            <span
              className="text-base font-bold"
              style={{ color: "#FFFFFF", fontFamily: "Montserrat, sans-serif" }}
            >
              Vyvata
            </span>
          </div>
          <p className="text-sm max-w-2xl mx-auto" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            The independent integrity score for what you put in your body.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs" style={{ color: "#7A90A8" }}>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/products" className="hover:text-white transition-colors">Products</Link>
            <Link href="/practitioner" className="hover:text-white transition-colors">For Practitioners</Link>
          </div>
          <p className="text-xs pt-4" style={{ color: "#7A90A8", fontFamily: "Inter, sans-serif" }}>
            © {new Date().getFullYear()} Vyvata. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
