"use client";

import { useState } from "react";

const faqs = [
  { q: "What is bNote?", a: "bNote is a community-driven protocol experience built on the Monad network, designed to be simple to access and easy to participate in." },
  { q: "How do I buy?", a: "Get MON on the Monad network, then swap for bNote on Uniswap (Monad). Always verify the contract address before swapping." },
  { q: "How do I stake?", a: "Use the staking interface in the App section. Connect your wallet, review details, then stake your bNote." },
  { q: "Is this financial advice?", a: "No. This site is for informational purposes only. Always do your own research and understand the risks." },
  { q: "How do I stay safe?", a: "Admins will never DM you first. Never share your private keys or seed phrase. Verify links and contract addresses." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((f, idx) => {
        const isOpen = open === idx;
        return (
          <div key={f.q} className="rounded-2xl border border-white/10 bg-white/5">
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpen(isOpen ? null : idx)}
            >
              <div className="font-semibold">{f.q}</div>
              <div className="text-white/60">{isOpen ? "–" : "+"}</div>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm text-white/75 leading-relaxed">
                {f.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
