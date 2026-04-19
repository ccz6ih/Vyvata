// Brand portal auth helpers.
//
// Identity layer: Supabase Auth (reuses the existing magic-link flow at
// /api/auth/magic-link). Who-you-are is the auth.users row.
// Authorization layer: brand_accounts row keyed on the same email.
// Who-you-represent (company, contact, status) lives there.
//
// On first login, ensureBrandAccount() lazy-creates a pending row so a
// brand can land on the dashboard and fill in their company details
// without a separate signup step. Admin flips status to 'active' before
// submissions can be created.

import { getSupabaseServer } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";

export interface BrandAccount {
  id: string;
  email: string;
  company_name: string;
  contact_name: string | null;
  contact_role: string | null;
  manufacturer_id: string | null;
  status: "pending" | "active" | "suspended";
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandSession {
  userId: string;
  email: string;
  account: BrandAccount;
}

/**
 * Resolve the current auth user to a brand_accounts row. Returns null if
 * no one is logged in. Lazy-creates a pending row on first call for a
 * given email so a brand doesn't have to do a separate signup step after
 * their first magic-link click.
 */
export async function getBrandSession(): Promise<BrandSession | null> {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from("brand_accounts")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return {
      userId: user.id,
      email,
      account: existing as unknown as BrandAccount,
    };
  }

  // First login — create a pending row. Company name defaults to the
  // email's domain as a best-guess; brand fills it in from the dashboard.
  const domain = email.split("@")[1] ?? "";
  const companyGuess =
    domain
      .replace(/\.(com|org|net|co|io|us)$/, "")
      .replace(/[.-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "New brand";

  const { data: inserted, error } = await supabase
    .from("brand_accounts")
    .insert({
      email,
      company_name: companyGuess,
      status: "pending",
      email_verified_at: user.email_confirmed_at ?? null,
    })
    .select("*")
    .single();

  if (error || !inserted) return null;

  return {
    userId: user.id,
    email,
    account: inserted as unknown as BrandAccount,
  };
}

/**
 * Require an active brand session. Returns the session or throws if the
 * user isn't logged in, or if their account is still pending/suspended.
 * Use in API routes that should only serve active brands.
 */
export async function requireActiveBrand(): Promise<BrandSession> {
  const session = await getBrandSession();
  if (!session) throw new Error("Not authenticated");
  if (session.account.status !== "active") {
    throw new Error(`Brand account status: ${session.account.status}`);
  }
  return session;
}
