import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Stethoscope, ShieldCheck, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { VyvataLogo } from "@/components/VyvataLogo";
import InviteAccept from "./InviteAccept";

interface PageProps {
  params: Promise<{ token: string }>;
}

interface InviteData {
  valid: boolean;
  reason?: "not_found" | "revoked" | "expired" | "exhausted" | "practitioner_inactive";
  invite?: { token: string; label: string | null; notes: string | null };
  practitioner?: {
    name: string;
    credential: string | null;
    specialty: string | null;
    organization: string | null;
  };
}

async function loadInvite(token: string): Promise<InviteData> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  try {
    const res = await fetch(`${origin}/api/invites/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    return (await res.json()) as InviteData;
  } catch {
    return { valid: false, reason: "not_found" };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await loadInvite(token);
  if (!data.valid || !data.practitioner) {
    return { title: "Invite · Vyvata" };
  }
  const who = data.practitioner.credential
    ? `${data.practitioner.name}, ${data.practitioner.credential}`
    : data.practitioner.name;
  return {
    title: `${who} invited you to Vyvata`,
    description: "Your practitioner has invited you to build a personalized supplement protocol. Free, takes 60 seconds.",
  };
}

export default async function InviteLandingPage({ params }: PageProps) {
  const { token } = await params;
  const data = await loadInvite(token);

  if (!data.valid) {
    return <InviteInvalid reason={data.reason ?? "not_found"} />;
  }

  const { practitioner, invite } = data;
  if (!practitioner || !invite) return <InviteInvalid reason="not_found" />;

  const displayName = practitioner.credential
    ? `${practitioner.name}, ${practitioner.credential}`
    : practitioner.name;

  return (
    <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <VyvataLogo size={40} />
          <span className="text-xs font-bold tracking-widest" style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}>
            VYVATA
          </span>
        </div>

        {/* Hero card */}
        <div
          className="rounded-2xl p-8 space-y-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(17,32,64,0.8) 0%, rgba(13,61,56,0.4) 100%)",
            border: "1px solid rgba(20,184,166,0.2)",
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", color: "#14B8A6" }}
            >
              <Stethoscope size={24} strokeWidth={1.5} />
            </div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#14B8A6" }}>
              Practitioner Invitation
            </p>
            <h1 className="text-2xl font-black leading-tight text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {displayName}
              <br />
              <span style={{ color: "#C9D6DF" }}>invited you to Vyvata</span>
            </h1>
            {practitioner.organization && (
              <p className="text-sm" style={{ color: "#7A90A8" }}>
                {practitioner.organization}
                {practitioner.specialty ? ` · ${practitioner.specialty}` : ""}
              </p>
            )}
          </div>

          <div
            className="rounded-xl p-4 space-y-3 text-left"
            style={{ background: "rgba(11,31,59,0.5)", border: "1px solid rgba(201,214,223,0.08)" }}
          >
            <p className="text-sm" style={{ color: "#C9D6DF" }}>
              Build a personalized supplement protocol in 60 seconds — evidence-graded,
              goal-aligned, compliance-first.
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#14B8A6" }}>
              <ShieldCheck size={12} strokeWidth={2} />
              <span>Your protocol is shared with {displayName.split(",")[0]}&rsquo;s practice automatically.</span>
            </div>
          </div>

          <InviteAccept token={invite.token} />

          <p className="text-xs" style={{ color: "#4a6080" }}>
            Free. No account required. Takes about one minute.
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#4a6080" }}>
          <Sparkles size={10} className="inline mr-1" style={{ color: "#14B8A6" }} />
          Structure/function observations only. Not medical advice.
        </p>
      </div>
    </main>
  );
}

function InviteInvalid({ reason }: { reason: string }) {
  const message = {
    not_found: "This invite link doesn&rsquo;t exist. Double-check the URL your practitioner sent.",
    revoked: "This invite has been revoked. Ask your practitioner for a fresh link.",
    expired: "This invite expired. Ask your practitioner for a fresh link.",
    exhausted: "This invite has reached its use limit. Ask your practitioner for a fresh link.",
    practitioner_inactive: "The inviting practitioner&rsquo;s account is not active. Please contact them directly.",
  }[reason] ?? "This invite can&rsquo;t be used right now.";

  return (
    <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: "#0B1F3B", fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm text-center space-y-6">
        <VyvataLogo size={36} />
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Invite unavailable
        </h1>
        <p className="text-sm" style={{ color: "#C9D6DF" }}>
          <span dangerouslySetInnerHTML={{ __html: message }} />
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: "#14B8A6", fontFamily: "Montserrat, sans-serif" }}
        >
          Go to Vyvata <ArrowRight size={13} />
        </Link>
      </div>
    </main>
  );
}
