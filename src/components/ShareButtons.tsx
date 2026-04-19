"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export default function ShareButtons({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith("http")
    ? url
    : typeof window !== "undefined"
    ? window.location.origin + url
    : url;

  const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    label
  )}&url=${encodeURIComponent(fullUrl)}`;
  const linkedinIntent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    fullUrl
  )}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ fontFamily: "Inter, sans-serif" }}>
      <a
        href={tweetIntent}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(20,184,166,0.2)",
          color: "#C9D6DF",
        }}
      >
        <Share2 size={12} style={{ color: "#14B8A6" }} />
        Tweet
      </a>
      <a
        href={linkedinIntent}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(20,184,166,0.2)",
          color: "#C9D6DF",
        }}
      >
        <Share2 size={12} style={{ color: "#14B8A6" }} />
        LinkedIn
      </a>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(20,184,166,0.2)",
          color: "#C9D6DF",
        }}
      >
        {copied ? <Check size={12} style={{ color: "#34D399" }} /> : <Copy size={12} style={{ color: "#14B8A6" }} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
