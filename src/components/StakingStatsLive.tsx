"use client";

import { useEffect, useState } from "react";
import { formatUnits, type Abi } from "viem";
import { getPublicClient } from "@/lib/wallet";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";
import { StakingStats } from "@/components/StakingStats";

type Props = {
  apy: number;
  stakeAppUrl: string; // kept for compatibility; not used for click-to-open here
};

// Minimal read ABI for global stats
const GLOBAL_STATS_ABI = [
  {
    name: "totalShares",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

function formatNumber18(raw: bigint) {
  // turn 18-decimal bigint into a readable string with commas
  const s = formatUnits(raw, 18); // "12345.6789"
  const [whole, frac] = s.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (!frac) return withCommas;
  // keep up to 4 decimals (trim trailing zeros)
  const fracTrim = frac.slice(0, 4).replace(/0+$/, "");
  return fracTrim ? `${withCommas}.${fracTrim}` : withCommas;
}

export function StakingStatsLive({ apy, stakeAppUrl }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [totalShares, setTotalShares] = useState<string>("—");
  const [totalBnote, setTotalBnote] = useState<string>("—");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError("");

      try {
        const client = getPublicClient();

        const [sharesRaw, supplyRaw] = await Promise.all([
          client.readContract({
            address: BNOTE_TOKEN,
            abi: GLOBAL_STATS_ABI,
            functionName: "totalShares",
          }),
          client.readContract({
            address: BNOTE_TOKEN,
            abi: GLOBAL_STATS_ABI,
            functionName: "totalSupply",
          }),
        ]);

        if (cancelled) return;

        setTotalShares(formatNumber18(sharesRaw as bigint));
        setTotalBnote(formatNumber18(supplyRaw as bigint));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.shortMessage ?? e?.message ?? "Failed to load staking stats.");
        setTotalShares("—");
        setTotalBnote("—");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <StakingStats
        apy={apy}
        totalStaked={totalShares}   // now used as Total Shares (per StakingStats.tsx update)
        yourStake={totalBnote}      // now used as Total bNote (per StakingStats.tsx update)
        isLoading={isLoading}
        isConnected={true}
      />

      {error ? (
        <div className="mt-3 text-xs text-red-200/80">{error}</div>
      ) : (
        <div className="mt-3 text-xs text-white/55">
          Global metrics pulled directly from the bNote contract.
        </div>
      )}
    </div>
  );
}
