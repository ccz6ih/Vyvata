"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BarChart3, BookOpen, Package, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/practitioner/dashboard", label: "Patients",  Icon: Users },
  { href: "/practitioner/products",  label: "Products",  Icon: Package },
  { href: "/practitioner/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/practitioner/evidence",  label: "Evidence",  Icon: BookOpen },
];

export default function PractitionerNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + close on Escape while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {LINKS.map(({ href, label, Icon }) => {
          const active = isActive(href);
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

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{
          color: open ? "#14B8A6" : "#C9D6DF",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: "rgba(11,31,59,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <nav
            className="absolute top-16 left-4 right-4 rounded-2xl p-2 flex flex-col gap-1"
            style={{
              background: "#0E2A50",
              border: "1px solid rgba(201,214,223,0.12)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {LINKS.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
                  style={{
                    color: active ? "#14B8A6" : "#C9D6DF",
                    background: active ? "rgba(20,184,166,0.08)" : "transparent",
                    border: active ? "1px solid rgba(20,184,166,0.2)" : "1px solid transparent",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
