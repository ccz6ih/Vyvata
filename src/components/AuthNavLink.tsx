"use client";

import { useEffect, useState } from "react";
import { getSupabaseUserBrowser } from "@/lib/supabase-auth-browser";

/**
 * Nav link that flips between "Sign in" (anon) and "My protocols" (signed in).
 * Renders a placeholder on first paint to avoid a visible flip after hydration
 * once the session check resolves.
 */
export default function AuthNavLink() {
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseUserBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return <span className="w-16 h-4 inline-block" aria-hidden />;
  }

  return signedIn ? (
    <a href="/me" className="hover:text-white transition-colors">My protocols</a>
  ) : (
    <a href="/signin" className="hover:text-white transition-colors">Sign in</a>
  );
}
