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
  // NOTE: pendingRewards may revert (you hit this already). We read it safely below.
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
  { name: "token0", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "token1", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

// -------------------------
// Types
// -------------------------
export type BnoteGlobalStats = {
  totalSupply: string;
  totalShares: string;
  shareRate: string;
  pendingRewards: string;

  // bNote price in MON (WMON) if derivable
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

function lowerAddr(a: string) {
  return (a || "").toLowerCase();
}

// Compute price with bigint math, return as 1e18 fixed (E18).
// For Uniswap V3: price = token1/token0 = (sqrtP^2 / 2^192)
function priceE18FromSqrtPriceX96(sqrtPriceX96: bigint) {
  const ONE = BigInt(1);
  const Q192 = ONE << BigInt(192);
  const E18 = BigInt("1000000000000000000"); // 1e18

  const num = sqrtPriceX96 * sqrtPriceX96 * E18;
  return num / Q192; // E18 fixed
}

function invertE18(priceE18: bigint) {
  // inv = 1 / price (in E18) => (1e36 / priceE18)
  const E36 = BigInt("1000000000000000000000000000000000000"); // 1e36
  if (priceE18 === BigInt(0)) return BigInt(0);
  return E36 / priceE18;
}

// -------------------------
// Main reader
// -------------------------
export async function readBnoteGlobalStats(): Promise<BnoteGlobalStats> {
  const client = getPublicClient();

  const [totalSupplyRaw, totalSharesRaw, shareRateRaw, blockNumber] = await Promise.all([
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalSupply" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalShares" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "shareRate" }),
    client.getBlockNumber(),
  ]);

  // pendingRewards can revert — read safely so it never breaks builds/SSR.
  let pendingRewardsRaw: bigint = BigInt(0);
  try {
    pendingRewardsRaw = (await client.readContract({
      address: BNOTE_TOKEN,
      abi: GLOBAL_STATS_ABI,
      functionName: "pendingRewards",
    })) as bigint;
  } catch {
    pendingRewardsRaw = BigInt(0);
  }

  // Price (bNote in MON) from Uniswap V3 pool
  let priceMon: string | undefined;
  try {
    const [slot0, token0, token1] = await Promise.all([
      client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "slot0" }),
      client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "token0" }),
      client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "token1" }),
    ]);

    const sqrtPriceX96 = (slot0 as any)[0] as bigint;

    // priceE18 = token1 per token0
    let pE18 = priceE18FromSqrtPriceX96(sqrtPriceX96);

    // We want: MON per bNOTE. If token0 isn't bNOTE, invert.
    const bnoteAddr = lowerAddr(BNOTE_TOKEN);
    const t0 = lowerAddr(token0 as string);
    const t1 = lowerAddr(token1 as string);

    // If neither side is bNote, we can’t label it “bNote in MON” reliably.
    if (t0 !== bnoteAddr && t1 !== bnoteAddr) {
      priceMon = undefined;
    } else {
      if (t0 !== bnoteAddr) {
        pE18 = invertE18(pE18);
      }
      priceMon = trimDecimals(formatUnits(pE18, 18), 6);
    }
  } catch {
    priceMon = undefined;
  }

  return {
    totalSupply: trimDecimals(formatUnits(totalSupplyRaw as bigint, 18), 4),
    totalShares: trimDecimals(formatUnits(totalSharesRaw as bigint, 18), 4),
    shareRate: trimDecimals(formatUnits(shareRateRaw as bigint, 18), 6),
    pendingRewards: trimDecimals(formatUnits(pendingRewardsRaw, 18), 4),

    priceMon,

    blockNumber,
    updatedAtMs: Date.now(),
  };
}
