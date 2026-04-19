// GET /api/og/invite/[token]
// Dynamic OG image for practitioner invite links. Renders a 1200x630 card
// with the inviting practitioner's name + credential + org so the link
// unfurls as a trust-heavy preview in iMessage, Slack, Twitter, etc.

import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

interface PractitionerRow {
  name: string;
  credential: string | null;
  specialty: string | null;
  organization: string | null;
  is_active: boolean;
}

async function loadPractitioner(token: string): Promise<PractitionerRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: invite } = await supabase
    .from("practitioner_invites")
    .select("practitioner_id, revoked_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return null;
  const inv = invite as { practitioner_id: string; revoked_at: string | null; expires_at: string | null };
  if (inv.revoked_at) return null;
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return null;

  const { data: prac } = await supabase
    .from("practitioners")
    .select("name, credential, specialty, organization, is_active")
    .eq("id", inv.practitioner_id)
    .maybeSingle();

  const p = prac as PractitionerRow | null;
  if (!p || !p.is_active) return null;
  return p;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const prac = await loadPractitioner(token);

  const displayName = prac
    ? (prac.credential ? `${prac.name}, ${prac.credential}` : prac.name)
    : "Your practitioner";

  const subtitle = prac
    ? [prac.organization, prac.specialty].filter(Boolean).join(" · ")
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0B1F3B 0%, #0d3040 60%, #0d3d38 100%)",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
        }}
      >
        {/* Top row: wordmark + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#14B8A6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0B1F3B",
              fontWeight: 900,
              fontSize: 24,
              fontFamily: "sans-serif",
            }}
          >
            V
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 6,
              color: "#14B8A6",
            }}
          >
            VYVATA
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(20,184,166,0.08)",
              border: "1px solid rgba(20,184,166,0.3)",
              color: "#14B8A6",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Practitioner invite
          </div>
        </div>

        {/* Center: invitation */}
        <div
          style={{
            marginTop: 80,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ fontSize: 32, color: "#7A90A8", fontWeight: 500 }}>
            You&rsquo;ve been invited to Vyvata by
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#E8F0F5",
            }}
          >
            {displayName}
          </div>
          {subtitle && (
            <div style={{ fontSize: 28, color: "#C9D6DF", fontWeight: 500 }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom: subtitle */}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            fontSize: 22,
            color: "#7A90A8",
          }}
        >
          <div>Your personalized supplement protocol. 60 seconds. Free.</div>
          <div
            style={{
              padding: "14px 28px",
              borderRadius: 14,
              background: "#14B8A6",
              color: "#0B1F3B",
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: 1,
            }}
          >
            vyvata.com →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
