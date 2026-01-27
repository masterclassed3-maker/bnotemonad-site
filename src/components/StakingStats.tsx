"use client";

import { useMemo } from "react";

type Props = {
  apy?: number; // percent
  totalStaked?: string; // formatted string (we'll use this to display Total Shares)
  yourStake?: string; // formatted string (we'll use this to display Total bNote)
  isConnected?: boolean; // kept for compatibility, not used for global stats display
  isLoading?: boolean;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

export function StakingStats({
  apy,
  totalStaked,
  yourStake,
  isLoading,
}: Props) {
  const apyText = useMemo(() => {
    if (isLoading) return "…";
    if (typeof apy !== "number") return "—";
    return `${apy.toFixed(2)}%`;
  }, [apy, isLoading]);

  // Global: Total Shares
  const totalSharesText = useMemo(() => {
    if (isLoading) return "…";
    return totalStaked ?? "—";
  }, [totalStaked, isLoading]);

  // Global: Total bNote in the contract
  const totalBnoteText = useMemo(() => {
    if (isLoading) return "…";
    return yourStake ?? "—";
  }, [yourStake, isLoading]);

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <StatCard label="APY" value={apyText} />
      <StatCard label="Total Shares" value={totalSharesText} />
      <StatCard label="Total bNote" value={totalBnoteText} />
    </div>
  );
}
