"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { readBnoteGlobalStats, type BnoteGlobalStats } from "@/lib/readBnoteGlobalStats";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";

const EXPLORER_ADDR = (addr: string) => `https://monadscan.com/address/${addr}`;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {sub ? <div className="mt-2 text-xs text-white/55">{sub}</div> : null}
    </div>
  );
}

export function GlobalStats() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState<BnoteGlobalStats | null>(null);

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const s = await readBnoteGlobalStats();
      setStats(s);
    } catch (e: any) {
      setStats(null);
      setErr(e?.shortMessage ?? e?.message ?? "Failed to load stats.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatedText = useMemo(() => {
    if (!stats) return "—";
    return new Date(stats.updatedAtMs).toLocaleString();
  }, [stats]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-white/70">bNote Contract</div>
          <a
            href={EXPLORER_ADDR(BNOTE_TOKEN)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block font-semibold hover:underline"
          >
            {BNOTE_TOKEN}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={load} variant="secondary">
            {busy ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-red-200/85">
          {err}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Shares"
          value={stats ? stats.totalShares : "…"}
          sub="All shares currently existing in the contract."
        />
        <StatCard
          label="Total bNote"
          value={stats ? stats.totalSupply : "…"}
          sub="Total token supply reported by the contract."
        />
        <StatCard
          label="Share Rate"
          value={stats ? stats.shareRate : "…"}
          sub="Displayed as bNote per share (18-decimal formatted)."
        />
        <StatCard
          label="Pending Rewards"
          value={stats ? stats.pendingRewards : "…"}
          sub="Direct read from pendingRewards()."
        />
      </div>

      <div className="mt-4 flex flex-col gap-1 text-xs text-white/55">
        <div>Block: {stats ? stats.blockNumber.toString() : "—"}</div>
        <div>Last updated: {updatedText}</div>
      </div>
    </div>
  );
}
