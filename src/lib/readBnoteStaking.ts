// src/lib/readBnoteStaking.ts
import { formatUnits, type Address } from "viem";
import { getPublicClient } from "@/lib/wallet";
import { BNOTE_TOKEN, BNOTE_STAKING_ABI } from "@/lib/bnoteStakingAbi";

export type OnchainStake = {
  idx: number;

  startTimestamp: number;
  lockDays: number;

  amountRaw: bigint;
  sharesRaw: bigint;

  autoRenew: boolean;

  amount: string;
  shares: string;

  startDate: string;
  endDate: string;
};

export type WalletStakesResult = {
  stakeCount: number;
  stakes: OnchainStake[];
};

function toDateString(unixSeconds: number) {
  if (!unixSeconds) return "—";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString();
}

export async function readWalletStakes(user: Address): Promise<WalletStakesResult> {
  const client = getPublicClient();

  // Read decimals (falls back to 18 if something unexpected happens)
  let decimals = 18;
  try {
    const dec = await client.readContract({
      address: BNOTE_TOKEN,
      abi: BNOTE_STAKING_ABI,
      functionName: "decimals",
    });
    // viem returns number for uint8, but we guard anyway
    decimals = Number(dec);
    if (!Number.isFinite(decimals) || decimals <= 0) decimals = 18;
  } catch {
    decimals = 18;
  }

  // Read stakesOf(user)
  // IMPORTANT: viem returns tuples as OBJECTS with named keys (not arrays),
  // so decode using row.startTimestamp, row.lockDays, row.amount, row.shares, row.autoRenew.
  const rows = (await client.readContract({
    address: BNOTE_TOKEN,
    abi: BNOTE_STAKING_ABI,
    functionName: "stakesOf",
    args: [user],
  })) as any[];

  const stakes = (rows ?? [])
    .map((row: any, i: number) => {
      // ✅ Safe tuple decoding (named outputs)
      const startTimestamp = Number(row?.startTimestamp ?? 0);
      const lockDays = Number(row?.lockDays ?? 0);

      const amountRaw = BigInt(row?.amount ?? 0);
      const sharesRaw = BigInt(row?.shares ?? 0);

      const autoRenew = Boolean(row?.autoRenew ?? false);

      const endTs = startTimestamp + lockDays * 24 * 60 * 60;

      return {
        idx: i,
        startTimestamp,
        lockDays,
        amountRaw,
        sharesRaw,
        autoRenew,
        amount: formatUnits(amountRaw, decimals),
        shares: formatUnits(sharesRaw, decimals),
        startDate: toDateString(startTimestamp),
        endDate: toDateString(endTs),
      } satisfies OnchainStake;
    })
    .filter(
      (s) =>
        s.startTimestamp !== 0 ||
        s.amountRaw !== BigInt(0) ||
        s.sharesRaw !== BigInt(0)
    );

  // Newest first
  stakes.sort((a, b) => b.startTimestamp - a.startTimestamp);

  return {
    stakeCount: stakes.length,
    stakes,
  };
}
