"use client";

import { useEffect, useState } from "react";
import {
  UserPlus, Copy, Check, Mail, Link as LinkIcon,
  X, RefreshCw, Trash2, Calendar,
} from "lucide-react";

interface InviteRow {
  id: string;
  token: string;
  label: string | null;
  notes: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  last_used_at: string | null;
  joined_count?: number;
  unlocked_count?: number;
}

function isActive(inv: InviteRow): boolean {
  if (inv.revoked_at) return false;
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return false;
  if (inv.max_uses != null && inv.use_count >= inv.max_uses) return false;
  return true;
}

export default function InvitePatientButton() {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/practitioner/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (token: string) => `${origin}/invite/${token}`;

  const createInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/practitioner/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 90 }),
      });
      if (res.ok) await load();
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this invite? Anyone who hasn't used it yet will get an error.")) return;
    const res = await fetch(`/api/practitioner/invites/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {}
  };

  const emailShare = (token: string) => {
    const subject = encodeURIComponent("I'd like you to try Vyvata");
    const body = encodeURIComponent(
      `Hi,\n\nI use Vyvata to build evidence-graded supplement protocols for my patients. I've invited you to try it — the protocol you generate will be shared with my practice automatically.\n\nIt takes about a minute and is free:\n\n${linkFor(token)}\n\nTalk soon,`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const active = invites.filter(isActive);
  const inactive = invites.filter((i) => !isActive(i));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold btn-teal"
        style={{ fontFamily: "Montserrat, sans-serif" }}
        data-testid="button-invite-patient"
      >
        <UserPlus size={14} />
        Invite Patient
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{
              background: "#0E2A50",
              border: "1px solid rgba(201,214,223,0.12)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Invite a patient
                </h3>
                <p className="text-xs mt-1" style={{ color: "#7A90A8" }}>
                  Share a link. Anyone who uses it auto-joins your panel with their protocol attached.
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#7A90A8" }} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <button
              onClick={createInvite}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{
                background: "rgba(20,184,166,0.12)",
                border: "1px solid rgba(20,184,166,0.3)",
                color: "#14B8A6",
              }}
            >
              {creating ? <RefreshCw size={13} className="animate-spin" /> : <LinkIcon size={13} />}
              Create new invite link
            </button>

            {loading ? (
              <p className="text-xs text-center py-4" style={{ color: "#7A90A8" }}>Loading…</p>
            ) : active.length === 0 && inactive.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#7A90A8" }}>
                No invites yet. Create one above.
              </p>
            ) : (
              <div className="space-y-3">
                {active.length > 0 && (
                  <InviteList
                    title="Active"
                    items={active}
                    linkFor={linkFor}
                    copiedToken={copiedToken}
                    onCopy={copy}
                    onEmail={emailShare}
                    onRevoke={revoke}
                  />
                )}
                {inactive.length > 0 && (
                  <InviteList
                    title="Inactive"
                    items={inactive}
                    linkFor={linkFor}
                    copiedToken={copiedToken}
                    onCopy={copy}
                    onEmail={emailShare}
                    onRevoke={revoke}
                    muted
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function InviteList({
  title, items, linkFor, copiedToken, onCopy, onEmail, onRevoke, muted,
}: {
  title: string;
  items: InviteRow[];
  linkFor: (t: string) => string;
  copiedToken: string | null;
  onCopy: (t: string) => void;
  onEmail: (t: string) => void;
  onRevoke: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#7A90A8" }}>
        {title}
      </p>
      {items.map((inv) => (
        <div
          key={inv.id}
          className="rounded-xl p-3 space-y-2.5"
          style={{
            background: muted ? "rgba(11,31,59,0.4)" : "rgba(11,31,59,0.7)",
            border: "1px solid rgba(201,214,223,0.08)",
            opacity: muted ? 0.7 : 1,
          }}
        >
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <code
              className="px-2 py-1 rounded"
              style={{ background: "rgba(20,184,166,0.08)", color: "#14B8A6", fontFamily: "monospace" }}
            >
              {linkFor(inv.token).replace(/^https?:\/\//, "")}
            </code>
            <span style={{ color: "#7A90A8" }}>
              {inv.joined_count ?? inv.use_count} joined
              {typeof inv.unlocked_count === "number" && (
                <span>
                  {" · "}
                  <span style={{ color: "#14B8A6" }}>{inv.unlocked_count} unlocked</span>
                </span>
              )}
              {inv.max_uses ? ` · cap ${inv.max_uses}` : ""}
            </span>
            {inv.expires_at && (
              <span className="inline-flex items-center gap-1" style={{ color: "#7A90A8" }}>
                <Calendar size={10} />
                expires {new Date(inv.expires_at).toLocaleDateString()}
              </span>
            )}
            {inv.revoked_at && (
              <span style={{ color: "#F87171" }}>revoked</span>
            )}
          </div>
          {!muted && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCopy(inv.token)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(20,184,166,0.08)",
                  border: "1px solid rgba(20,184,166,0.25)",
                  color: "#14B8A6",
                }}
              >
                {copiedToken === inv.token ? <Check size={11} /> : <Copy size={11} />}
                {copiedToken === inv.token ? "Copied" : "Copy link"}
              </button>
              <button
                onClick={() => onEmail(inv.token)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(201,214,223,0.12)",
                  color: "#C9D6DF",
                }}
              >
                <Mail size={11} />
                Email
              </button>
              <button
                onClick={() => onRevoke(inv.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto"
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "#F87171",
                }}
              >
                <Trash2 size={11} />
                Revoke
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
