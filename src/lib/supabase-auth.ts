import { createServerClient, createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side Supabase client for Route Handlers and Server Components. */
export async function getSupabaseUserServer() {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components can't set cookies — middleware handles refresh.
        }
      },
    },
  });
}

/** Middleware-scoped client that can mutate cookies on the response. */
export function getSupabaseUserMiddleware(req: NextRequest, res: NextResponse) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

/** Browser client for client components ("use client"). */
export function getSupabaseUserBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Convenience: returns the authenticated user or null. */
export async function getCurrentUser() {
  const supabase = await getSupabaseUserServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
