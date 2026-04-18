"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50"
      style={{ color: "#7A90A8" }}
    >
      {children}
    </button>
  );
}
