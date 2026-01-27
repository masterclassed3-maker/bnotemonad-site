import { formatUnits } from "viem";
import { getPublicClient } from "@/lib/wallet";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";

// Minimal read ABI for global stats
const GLOBAL_STATS_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalShares", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "shareRate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingRewards", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export type BnoteGlobalStats = {
  totalSupplyRaw: bigint;
  totalSharesRaw: bigint;

  // shareRate() interpreted as: bNote per Share (18-dec)
  shareRateRaw: bigint;

  // pendingRewards() may revert on some builds; we treat it as optional
  pendingRewardsRaw: bigint | null;
  pendingRewardsOk: boolean;
  pendingRewardsError?: string;

  // Derived (Estimated)
  activeStakedRaw: bigint;     // estimated bNote staked = totalShares * shareRate / 1e18
  stakedSupplyPct: string;     // estimated percent of total supply staked

  // Display strings
  totalSupply: string;
  totalShares: string;
  shareRate: string;           // bNote per Share
  pendingRewards: string;      // or "Unavailable"
  activeStaked: string;        // estimated bNote staked

  blockNumber: bigint;
  updatedAtMs: number;
};

const ONE_E18 = BigInt("1000000000000000000");

function fmt18(raw: bigint) {
  // bNote uses 18 decimals in your UI. If that ever changes, update here.
  return formatUnits(raw, 18);
}

// trims long decimals like "1.230000000000000000" -> "1.23"
function trimDecimals(s: string, maxDp: number) {
  const [a, b] = s.split(".");
  if (!b) return s;
  const trimmed = b.slice(0, maxDp).replace(/0+$/, "");
  return trimmed.length ? `${a}.${trimmed}` : a;
}

// Format bigint(18dp) into a comma-separated string with limited decimals
function fmt18Pretty(raw: bigint, maxDp: number) {
  const s = trimDecimals(fmt18(raw), maxDp);
  const [whole, frac] = s.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${withCommas}.${frac}` : withCommas;
}

// Percent string with 2 decimals, from ratio = num/den
function fmtPct2(num: bigint, den: bigint) {
  if (den === BigInt(0)) return "—";
  // pctTimes100 = (num/den)*10000  -> percent with 2dp
  const pctTimes100 = (num * BigInt(10000)) / den;
  const whole = pctTimes100 / BigInt(100);
  const frac = pctTimes100 % BigInt(100);
  return `${whole.toString()}.${frac.toString().padStart(2, "0")}%`;
}

export async function readBnoteGlobalStats(): Promise<BnoteGlobalStats> {
  const client = getPublicClient();

  // Read the core values in parallel
  const [totalSupplyRaw, totalSharesRaw, shareRateRaw, blockNumber] = await Promise.all([
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalSupply" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalShares" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "shareRate" }),
    client.getBlockNumber(),
  ]);

  // pendingRewards() can revert — treat as optional so Stats page never breaks
  let pendingRewardsRaw: bigint | null = null;
  let pendingRewardsOk = true;
  let pendingRewardsError: string | undefined;

  try {
    const pr = await client.readContract({
      address: BNOTE_TOKEN,
      abi: GLOBAL_STATS_ABI,
      functionName: "pendingRewards",
    });
    pendingRewardsRaw = pr as bigint;
  } catch (e: any) {
    pendingRewardsOk = false;
    pendingRewardsRaw = null;
    pendingRewardsError =
      e?.shortMessage ??
      e?.message ??
      "pendingRewards() reverted";
  }

  // ✅ Derived: estimated active staked bNote = totalShares * shareRate / 1e18
  // (shareRate is bNote/share with 18dp)
  const activeStakedRaw = (totalSharesRaw * shareRateRaw) / ONE_E18;

  // Display formats:
  const totalSupply = fmt18Pretty(totalSupplyRaw as bigint, 4);
  const totalShares = fmt18Pretty(totalSharesRaw as bigint, 4);

  // Share rate shown as "bNote per Share"
  const shareRate = trimDecimals(fmt18(shareRateRaw as bigint), 6);

  const pendingRewards = pendingRewardsOk && pendingRewardsRaw !== null
    ? fmt18Pretty(pendingRewardsRaw, 4)
    : "Unavailable";

  const activeStaked = fmt18Pretty(activeStakedRaw, 4);

  const stakedSupplyPct = fmtPct2(activeStakedRaw, totalSupplyRaw as bigint);

  return {
    totalSupplyRaw: totalSupplyRaw as bigint,
    totalSharesRaw: totalSharesRaw as bigint,
    shareRateRaw: shareRateRaw as bigint,

    pendingRewardsRaw,
    pendingRewardsOk,
    pendingRewardsError,

    activeStakedRaw,
    stakedSupplyPct,

    totalSupply,
    totalShares,
    shareRate,
    pendingRewards,
    activeStaked,

    blockNumber,
    updatedAtMs: Date.now(),
  };
}
