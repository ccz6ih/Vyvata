"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { INVITED_BY_KEY } from "@/components/InvitedByBanner";

/**
 * Stores the invite token + practitioner display info in sessionStorage and
 * forwards the patient into the normal B2C flow. parse-stack reads the token
 * on audit creation to attach a patient_link to the inviting practitioner;
 * InvitedByBanner reads the display info to render a persistent "connected
 * to Dr. X" banner across the flow.
 */
export const INVITE_TOKEN_KEY = "vv_invite_token";

export default function InviteAccept({
  token,
  practitioner,
}: {
  token: string;
  practitioner: {
    name: string;
    credential: string | null;
    specialty: string | null;
    organization: string | null;
  };
}) {
  const router = useRouter();

  const accept = (path: string) => {
    try {
      sessionStorage.setItem(INVITE_TOKEN_KEY, token);
      sessionStorage.setItem(
        INVITED_BY_KEY,
        JSON.stringify({
          name: practitioner.name,
          credential: practitioner.credential,
          organization: practitioner.organization,
        })
      );
    } catch {
      // sessionStorage disabled — pass as query param fallback
      return router.push(`${path}?invite=${encodeURIComponent(token)}`);
    }
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => accept("/quiz")}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm btn-teal"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Take the guided quiz
        <ArrowRight size={14} />
      </button>
      <button
        onClick={() => accept("/")}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm"
        style={{
          background: "rgba(20,184,166,0.08)",
          border: "1px solid rgba(20,184,166,0.25)",
          color: "#14B8A6",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Or paste your current stack
      </button>
    </div>
  );
}
