"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BarChart3 } from "lucide-react";

const LINKS = [
  { href: "/practitioner/dashboard", label: "Patients",  Icon: Users },
  { href: "/practitioner/analytics", label: "Analytics", Icon: BarChart3 },
];

export default function PractitionerNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: active ? "#14B8A6" : "#7A90A8",
              background: active ? "rgba(20,184,166,0.08)" : "transparent",
              border: active ? "1px solid rgba(20,184,166,0.2)" : "1px solid transparent",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Icon size={12} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
