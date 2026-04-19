"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

/**
 * Stores the invite token in sessionStorage and forwards the patient into the
 * normal B2C flow. parse-stack reads this key on audit creation and attaches
 * a patient_link to the inviting practitioner.
 */
export const INVITE_TOKEN_KEY = "vv_invite_token";

export default function InviteAccept({ token }: { token: string }) {
  const router = useRouter();

  const accept = (path: string) => {
    try {
      sessionStorage.setItem(INVITE_TOKEN_KEY, token);
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
