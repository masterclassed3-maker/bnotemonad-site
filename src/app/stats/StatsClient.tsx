"use client";

import dynamic from "next/dynamic";

const GlobalStats = dynamic(() => import("@/components/GlobalStats"), {
  ssr: false,
  loading: () => (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-black/50 p-6 text-white/70">
        Loading stats…
      </div>
    </main>
  ),
});

export default function StatsClient() {
  return <GlobalStats />;
}
