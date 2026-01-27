"use client";

import { useEffect, useState } from "react";
import { readBnoteGlobalStats, type BnoteGlobalStats } from "@/lib/readBnoteGlobalStats";

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {sublabel ? <div className="mt-1 text-xs text-white/50">{sublabel}</div> : null}
    </div>
  );
}

export function GlobalStats() {
  const [stats, setStats] = useState<BnoteGlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const s = await readBnoteGlobalStats();
      setStats(s);
    } catch (e: any) {
      setStats(null);
      setError(e?.shortMessage ?? e?.message ?? "Failed to load stats.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const s = await readBnoteGlobalStats();
        if (!cancelled) setStats(s);
      } catch (e: any) {
        if (!cancelled) {
          setStats(null);
          setError(e?.shortMessage ?? e?.message ?? "Failed to load stats.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const id = setInterval(() => {
      if (!cancelled) load();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadingText = isLoading ? "…" : "—";

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Supply"
          value={stats?.totalSupply ?? loadingText}
          sublabel="Total bNote supply (18 decimals)"
        />
        <StatCard
          label="Total Shares"
          value={stats?.totalShares ?? loadingText}
          sublabel="Total shares currently issued"
        />
        <StatCard
          label="Share Rate"
          value={stats?.shareRate ?? loadingText}
          sublabel="Current share rate (contract read)"
        />
        <StatCard
          label="Pending Rewards"
          value={stats?.pendingRewards ?? loadingText}
          sublabel="Protocol pending rewards"
        />
      </div>

      {/* Price (MON) */}
      {stats?.priceMon ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/60">bNote Price (MON)</div>
          <div className="mt-1 text-lg font-bold">{stats.priceMon} MON</div>
          <div className="mt-1 text-xs text-white/50">
            Derived from Uniswap V3 pool slot0 (handles token order).
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={load}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 transition"
        >
          Refresh
        </button>

        {stats?.blockNumber ? (
          <div className="text-xs text-white/55">
            Block: <span className="text-white/75">{stats.blockNumber.toString()}</span>
          </div>
        ) : null}

        {stats?.updatedAtMs ? (
          <div className="text-xs text-white/55">
            Updated:{" "}
            <span className="text-white/75">
              {new Date(stats.updatedAtMs).toLocaleTimeString()}
            </span>
          </div>
        ) : null}
      </div>

      {error ? <div className="mt-3 text-xs text-red-200/80">{error}</div> : null}
    </div>
  );
}
