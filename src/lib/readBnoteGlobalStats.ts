import { formatUnits } from "viem";
import { getPublicClient } from "@/lib/wallet";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";

// -------------------------
// Contracts
// -------------------------
const BNOTE_MON_POOL = "0xF6545a50C7673410f5D88e2417e98531A0EE9A73";

// -------------------------
// ABIs
// -------------------------
const GLOBAL_STATS_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalShares", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "shareRate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "pendingRewards", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const UNISWAP_V3_POOL_ABI = [
  {
    name: "slot0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
] as const;

// -------------------------
// Types
// -------------------------
export type BnoteGlobalStats = {
  totalSupply: string;
  totalShares: string;
  shareRate: string;
  pendingRewards: string;

  priceMon?: string;

  blockNumber: bigint;
  updatedAtMs: number;
};

// -------------------------
// Helpers
// -------------------------
function trimDecimals(value: string, maxDp: number) {
  const [a, b] = value.split(".");
  if (!b) return value;
  const trimmed = b.slice(0, maxDp).replace(/0+$/, "");
  return trimmed ? `${a}.${trimmed}` : a;
}

// price = (sqrtPriceX96^2 / 2^192)
function priceFromSqrtPriceX96(sqrtPriceX96: bigint) {
  const numerator = sqrtPriceX96 * sqrtPriceX96;
  const denominator = 1n << 192n;
  return Number(numerator) / Number(denominator);
}

// -------------------------
// Main reader
// -------------------------
export async function readBnoteGlobalStats(): Promise<BnoteGlobalStats> {
  const client = getPublicClient();

  const [
    totalSupplyRaw,
    totalSharesRaw,
    shareRateRaw,
    pendingRewardsRaw,
    slot0,
    blockNumber,
  ] = await Promise.all([
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalSupply" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalShares" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "shareRate" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "pendingRewards" }),
    client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "slot0" }),
    client.getBlockNumber(),
  ]);

  let priceMon: string | undefined;
  try {
    const sqrtPriceX96 = slot0[0] as bigint;
    const price = priceFromSqrtPriceX96(sqrtPriceX96);
    priceMon = trimDecimals(price.toString(), 6);
  } catch {
    priceMon = undefined;
  }

  return {
    totalSupply: trimDecimals(formatUnits(totalSupplyRaw, 18), 4),
    totalShares: trimDecimals(formatUnits(totalSharesRaw, 18), 4),
    shareRate: trimDecimals(formatUnits(shareRateRaw, 18), 6),
    pendingRewards: trimDecimals(formatUnits(pendingRewardsRaw, 18), 4),

    priceMon,

    blockNumber,
    updatedAtMs: Date.now(),
  };
}
