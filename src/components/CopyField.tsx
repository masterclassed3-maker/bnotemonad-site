"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-white/60">Contract Address</div>
        <div className="truncate font-mono text-sm">{value}</div>
      </div>
      <button
        onClick={copy}
        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 transition"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
