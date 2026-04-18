// Practitioner session auth helpers
// Token: a random UUID stored in practitioner_sessions
// Cookie: vv_prac_token (httpOnly, 7 days, set on login)

import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase";

export const COOKIE_NAME = "vv_prac_token";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface PractitionerSession {
  id: string;
  email: string;
  name: string;
  credential: string | null;
  specialty: string | null;
  organization: string | null;
  tier: string;
  patient_count: number;
}

/** Read the practitioner session from the cookie. Returns null if invalid/expired. */
export async function getPractitionerSession(): Promise<PractitionerSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const supabase = getSupabaseServer();

    const { data: session } = await supabase
      .from("practitioner_sessions")
      .select("practitioner_id, expires_at")
      .eq("token", token)
      .single();

    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) return null;

    const { data: prac } = await supabase
      .from("practitioners")
      .select("id, email, name, credential, specialty, organization, tier, patient_count")
      .eq("id", session.practitioner_id)
      .eq("is_active", true)
      .single();

    if (!prac) return null;
    return prac as PractitionerSession;
  } catch {
    return null;
  }
}

export type CreateSessionResult =
  | { token: string; practitioner: PractitionerSession }
  | { error: "pending" | "rejected" | "invalid" };

/** Validate email + access_code, create session token, return token string. */
export async function createPractitionerSession(
  email: string,
  accessCode: string
): Promise<CreateSessionResult> {
  const supabase = getSupabaseServer();

  const { data: prac } = await supabase
    .from("practitioners")
    .select("id, email, name, credential, specialty, organization, tier, patient_count, access_code, is_active, verification_status")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!prac) return { error: "invalid" };

  // Check verification status before anything else
  const status = prac.verification_status as string | null;
  if (status === "pending")  return { error: "pending" };
  if (status === "rejected") return { error: "rejected" };
  if (status !== "approved") return { error: "invalid" };

  if (!prac.is_active) return { error: "invalid" };
  if (!prac.access_code || prac.access_code !== accessCode.trim().toUpperCase()) return { error: "invalid" };

  // Create session
  const { v4: uuidv4 } = await import("uuid");
  const token = uuidv4();

  const { error } = await supabase.from("practitioner_sessions").insert({
    practitioner_id: prac.id,
    token,
    expires_at: new Date(Date.now() + COOKIE_MAX_AGE * 1000).toISOString(),
  });

  if (error) return { error: "invalid" };

  // Update last login
  await supabase
    .from("practitioners")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", prac.id);

  return {
    token,
    practitioner: {
      id: prac.id,
      email: prac.email,
      name: prac.name,
      credential: prac.credential,
      specialty: prac.specialty,
      organization: prac.organization,
      tier: prac.tier,
      patient_count: prac.patient_count,
    },
  };
}

/** Revoke a session token (logout). */
export async function revokePractitionerSession(token: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("practitioner_sessions").delete().eq("token", token);
}
