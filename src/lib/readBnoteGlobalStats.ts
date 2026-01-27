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

  // NOTE: this one is reverting in your build environment
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

  // bNote price in MON
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

function toLowerAddr(x: string) {
  return (x || "").toLowerCase();
}

/**
 * priceX18 = token1PerToken0 scaled by 1e18:
 * price = (sqrtPriceX96^2 / 2^192)
 * BigInt-safe (no bigint literals)
 */
function priceX18FromSqrtPriceX96(sqrtPriceX96: bigint): bigint {
  const SCALE = BigInt("1000000000000000000"); // 1e18
  const two = BigInt(2);
  const Q192 = two ** BigInt(192);

  const num = sqrtPriceX96 * sqrtPriceX96 * SCALE;
  return num / Q192;
}

function invertX18(priceX18: bigint): bigint {
  const ONE_E18 = BigInt("1000000000000000000");
  const ONE_E36 = ONE_E18 * ONE_E18;
  if (priceX18 === BigInt(0)) return BigInt(0);
  return ONE_E36 / priceX18;
}

async function safeReadBigint<TAbi extends readonly any[]>(args: {
  address: `0x${string}`;
  abi: TAbi;
  functionName: string;
}): Promise<bigint> {
  const client = getPublicClient();
  try {
    const v = await client.readContract(args as any);
    return v as bigint;
  } catch {
    return BigInt(0);
  }
}

// -------------------------
// Main reader
// -------------------------
export async function readBnoteGlobalStats(): Promise<BnoteGlobalStats> {
  const client = getPublicClient();

  // Critical reads (these should not revert)
  const [totalSupplyRaw, totalSharesRaw, shareRateRaw, blockNumber] = await Promise.all([
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalSupply" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "totalShares" }),
    client.readContract({ address: BNOTE_TOKEN, abi: GLOBAL_STATS_ABI, functionName: "shareRate" }),
    client.getBlockNumber(),
  ]);

  // Safe read (won't fail build if it reverts)
  const pendingRewardsRaw = await safeReadBigint({
    address: BNOTE_TOKEN,
    abi: GLOBAL_STATS_ABI,
    functionName: "pendingRewards",
  });

  // Price reads (also safe-ish)
  let priceMon: string | undefined;
  try {
    const [slot0, token0, token1] = await Promise.all([
      client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "slot0" }),
      client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "token0" }),
      client.readContract({ address: BNOTE_MON_POOL, abi: UNISWAP_V3_POOL_ABI, functionName: "token1" }),
    ]);

    const sqrtPriceX96 = (slot0 as any)[0] as bigint;
    const rawPriceX18 = priceX18FromSqrtPriceX96(sqrtPriceX96);

    // We want MON per bNote
    const bnoteAddr = toLowerAddr(BNOTE_TOKEN);
    const t0 = toLowerAddr(token0 as string);
    const t1 = toLowerAddr(token1 as string);

    let monPerBnoteX18 = rawPriceX18;
    if (t1 === bnoteAddr && t0 !== bnoteAddr) {
      monPerBnoteX18 = invertX18(rawPriceX18);
    }

    priceMon = trimDecimals(formatUnits(monPerBnoteX18, 18), 6);
  } catch {
    priceMon = undefined;
  }

  return {
    totalSupply: trimDecimals(formatUnits(totalSupplyRaw as bigint, 18), 4),
    totalShares: trimDecimals(formatUnits(totalSharesRaw as bigint, 18), 4),
    shareRate: trimDecimals(formatUnits(shareRateRaw as bigint, 18), 6),
    pendingRewards: trimDecimals(formatUnits(pendingRewardsRaw, 18), 4),

    priceMon,

    blockNumber: blockNumber as bigint,
    updatedAtMs: Date.now(),
  };
}
