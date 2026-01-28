import { formatUnits } from "viem";
import { getPublicClient } from "@/lib/wallet";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";

// -------------------------
// Addresses (V3 pools)
// -------------------------
const BNOTE_WMON_POOL = "0xf6545a50c7673410f5d88e2417e98531a0ee9a73";
const BNOTE_USDC_POOL = "0xB6cDd1ca78AE496D05B3C97b83aFD009AADf53F9";

// If you want monUsd here, keep/replace with your actual WMON/USDC V3 pool.
const WMON_USDC_POOL = "0xc33e9e441e6f4e74cdb34f878be51189c9cb00d8";

// Treasury vesting contract (used to estimate circulating supply)
const TREASURY_VESTING = "0xA512Dd0e6C42775784AC8cA6c438AaD9A17a6596";

// -------------------------
// ABIs
// -------------------------
const GLOBAL_STATS_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalShares", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "shareRate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
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

const ERC20_ABI = [
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// -------------------------
// Types (NO bigint here — avoids Next serialization errors)
// -------------------------
export type BnoteGlobalStats = {
  totalSupply: string;
  totalShares: string;
  shareRate: string; // fixed 3dp (e.g. 1.000)

  priceMon?: string; // bNote priced in MON
  monUsd?: string; // MON priced in USD (USDC)
  priceUsd?: string; // bNote priced in USD

  poolTvlMon?: string; // approx TVL in MON for bNote/MON
  poolTvlUsd?: string; // approx TVL in USD

  marketCapMon?: string; // supply × priceMon
  marketCapUsd?: string; // supply × priceUsd

  circulatingSupply?: string;
  stakedBnoteEst?: string;
  stakedPct?: string;
  poolReserves?: string; // "X TOKEN0 / Y TOKEN1"

  holdersCount?: string;

  blockNumber: string;
  updatedAtMs: number;
};

// -------------------------
// Helpers (no BigInt literals)
// -------------------------
const ZERO = BigInt(0);
const ONE_E18 = BigInt("1000000000000000000");
const POW2_192 = BigInt("6277101735386680763835789423207666416102355444464034512896"); // 2^192

function asAddr(v: string): `0x${string}` {
  return v as `0x${string}`;
}

function trimDecimals(value: string, maxDp: number) {
  const [a, b] = value.split(".");
  if (!b) return a;
  const trimmed = b.slice(0, maxDp).replace(/0+$/, "");
  return trimmed ? `${a}.${trimmed}` : a;
}

function withCommas(s: string) {
  const [whole, frac] = s.split(".");
  const w = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${w}.${frac}` : w;
}

function fixedDecimals(value: string, dp: number) {
  const [aRaw, bRaw = ""] = value.split(".");
  const a = aRaw.length ? aRaw : "0";
  const b = (bRaw + "0".repeat(dp)).slice(0, dp);
  return dp === 0 ? a : `${a}.${b}`;
}

function pow10(n: number): bigint {
  return BigInt("1" + "0".repeat(Math.max(0, n)));
}

async function safeRead<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

/**
 * Returns token1/token0 price scaled to 1e18, adjusted for decimals.
 * This is the "human" price: (token1 per token0) in normal units.
 */
function priceX18FromSqrtPriceX96(sqrtPriceX96: bigint, dec0: number, dec1: number): bigint {
  const numerator = sqrtPriceX96 * sqrtPriceX96; // Q192
  let ratioX18 = (numerator * ONE_E18) / POW2_192; // token1_raw/token0_raw scaled 1e18

  // decimals adjustment: human price = raw_price * 10^(dec0 - dec1)
  if (dec0 > dec1) ratioX18 = ratioX18 * pow10(dec0 - dec1);
  else if (dec1 > dec0) ratioX18 = ratioX18 / pow10(dec1 - dec0);

  return ratioX18; // token1 per token0, scaled 1e18
}

function mulX18(a: bigint, b: bigint): bigint {
  return (a * b) / ONE_E18;
}

function invX18(x: bigint): bigint {
  return x === ZERO ? ZERO : (ONE_E18 * ONE_E18) / x;
}

function fmtX18(x: bigint, dp: number) {
  return trimDecimals(formatUnits(x, 18), dp);
}

// -------------------------
// Pool reader (slot0 + tokens + metadata)
// -------------------------
async function readV3PoolMeta(pool: `0x${string}`) {
  const client = getPublicClient();

  const [slot0, t0, t1] = await Promise.all([
    safeRead(client.readContract({ address: pool, abi: UNISWAP_V3_POOL_ABI, functionName: "slot0" }) as Promise<any>),
    safeRead(client.readContract({ address: pool, abi: UNISWAP_V3_POOL_ABI, functionName: "token0" }) as Promise<string>),
    safeRead(client.readContract({ address: pool, abi: UNISWAP_V3_POOL_ABI, functionName: "token1" }) as Promise<string>),
  ]);

  if (!slot0 || !t0 || !t1) return null;

  const token0 = asAddr(t0);
  const token1 = asAddr(t1);

  const [dec0, dec1, sym0, sym1] = await Promise.all([
    safeRead(client.readContract({ address: token0, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>),
    safeRead(client.readContract({ address: token1, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>),
    safeRead(client.readContract({ address: token0, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>),
    safeRead(client.readContract({ address: token1, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>),
  ]);

  if (dec0 == null || dec1 == null || !sym0 || !sym1) return null;

  const sqrtPriceX96 = slot0[0] as bigint;
  return { token0, token1, dec0, dec1, sym0, sym1, sqrtPriceX96 };
}

// -------------------------
// Main reader
// -------------------------
export async function readBnoteGlobalStats(): Promise<BnoteGlobalStats> {
  const client = getPublicClient();

  const [totalSupplyRaw, totalSharesRaw, shareRateRaw, blockNumber] = await Promise.all([
    client.readContract({ address: asAddr(BNOTE_TOKEN), abi: GLOBAL_STATS_ABI, functionName: "totalSupply" }) as Promise<bigint>,
    client.readContract({ address: asAddr(BNOTE_TOKEN), abi: GLOBAL_STATS_ABI, functionName: "totalShares" }) as Promise<bigint>,
    client.readContract({ address: asAddr(BNOTE_TOKEN), abi: GLOBAL_STATS_ABI, functionName: "shareRate" }) as Promise<bigint>,
    client.getBlockNumber(),
  ]);

  // -------------------------
  // bNote/WMON price (MON per bNOTE)
  // -------------------------
  let priceMonX18: bigint | null = null;
  let priceMon: string | undefined;

  const bnoteMonMeta = await readV3PoolMeta(asAddr(BNOTE_WMON_POOL));
  if (bnoteMonMeta) {
    const { token0, token1, dec0, dec1, sym0, sym1, sqrtPriceX96 } = bnoteMonMeta;
    const rawX18 = priceX18FromSqrtPriceX96(sqrtPriceX96, dec0, dec1); // token1/token0

    const bnoteAddr = BNOTE_TOKEN.toLowerCase();
    const t0Lower = token0.toLowerCase();
    const t1Lower = token1.toLowerCase();

    if (t0Lower === bnoteAddr) priceMonX18 = rawX18;
    else if (t1Lower === bnoteAddr) priceMonX18 = invX18(rawX18);
    else {
      const s0 = (sym0 || "").toUpperCase();
      const s1 = (sym1 || "").toUpperCase();
      if (s0 === "BNOTE") priceMonX18 = rawX18;
      else if (s1 === "BNOTE") priceMonX18 = invX18(rawX18);
    }

    if (priceMonX18 != null) priceMon = fmtX18(priceMonX18, 6);
  }

  // -------------------------
  // WMON/USD via WMON/USDC V3 pool (optional)
  // -------------------------
  let monUsdX18: bigint | null = null;
  let monUsd: string | undefined;

  const monUsdMeta = await readV3PoolMeta(asAddr(WMON_USDC_POOL));
  if (monUsdMeta) {
    const { sym0, sym1, dec0, dec1, sqrtPriceX96 } = monUsdMeta;
    const rawX18 = priceX18FromSqrtPriceX96(sqrtPriceX96, dec0, dec1); // token1/token0

    const s0 = (sym0 || "").toUpperCase();
    const s1 = (sym1 || "").toUpperCase();

    const token0IsMon = s0.includes("WMON") || s0 === "MON" || s0.includes("MON");
    const token1IsMon = s1.includes("WMON") || s1 === "MON" || s1.includes("MON");
    const token0IsUsd = s0.includes("USDC") || s0.includes("USD");
    const token1IsUsd = s1.includes("USDC") || s1.includes("USD");

    if (token0IsMon && token1IsUsd) monUsdX18 = rawX18;
    else if (token1IsMon && token0IsUsd) monUsdX18 = invX18(rawX18);

    if (monUsdX18 != null) monUsd = fmtX18(monUsdX18, 6);
  }

  // -------------------------
  // bNOTE USD: prefer direct bNOTE/USDC pool; fallback to priceMon*monUsd
  // -------------------------
  let priceUsdX18: bigint | null = null;
  let priceUsd: string | undefined;

  const bnoteUsdcMeta = await readV3PoolMeta(asAddr(BNOTE_USDC_POOL));
  if (bnoteUsdcMeta) {
    const { token0, token1, dec0, dec1, sym0, sym1, sqrtPriceX96 } = bnoteUsdcMeta;
    const rawX18 = priceX18FromSqrtPriceX96(sqrtPriceX96, dec0, dec1);

    const bnoteAddr = BNOTE_TOKEN.toLowerCase();
    const t0Lower = token0.toLowerCase();
    const t1Lower = token1.toLowerCase();

    if (t0Lower === bnoteAddr) priceUsdX18 = rawX18;
    else if (t1Lower === bnoteAddr) priceUsdX18 = invX18(rawX18);
    else {
      const s0 = (sym0 || "").toUpperCase();
      const s1 = (sym1 || "").toUpperCase();
      if (s0 === "BNOTE") priceUsdX18 = rawX18;
      else if (s1 === "BNOTE") priceUsdX18 = invX18(rawX18);
    }
  }

  if (priceUsdX18 == null && priceMonX18 != null && monUsdX18 != null) {
    priceUsdX18 = mulX18(priceMonX18, monUsdX18);
  }

  if (priceUsdX18 != null) priceUsd = fmtX18(priceUsdX18, 6);

  // -------------------------
  // Pool reserves + TVL in MON (approx) for bNOTE/WMON V3 (using ERC20 balances)
  // -------------------------
  let poolReserves: string | undefined;
  let poolTvlMonX18: bigint | null = null;
  let poolTvlMon: string | undefined;

  if (bnoteMonMeta) {
    const { token0, token1, dec0, dec1, sym0, sym1 } = bnoteMonMeta;
    const poolAddr = asAddr(BNOTE_WMON_POOL);

    const [bal0, bal1] = await Promise.all([
      safeRead(client.readContract({ address: token0, abi: ERC20_ABI, functionName: "balanceOf", args: [poolAddr] }) as Promise<bigint>),
      safeRead(client.readContract({ address: token1, abi: ERC20_ABI, functionName: "balanceOf", args: [poolAddr] }) as Promise<bigint>),
    ]);

    if (bal0 != null && bal1 != null) {
      const a0 = withCommas(trimDecimals(formatUnits(bal0, dec0), 4));
      const a1 = withCommas(trimDecimals(formatUnits(bal1, dec1), 4));
      poolReserves = `${a0} ${sym0} / ${a1} ${sym1}`;

      const s0 = (sym0 || "").toUpperCase();
      const s1 = (sym1 || "").toUpperCase();
      const token0IsMon = s0.includes("WMON") || s0 === "MON" || s0.includes("MON");
      const token1IsMon = s1.includes("WMON") || s1 === "MON" || s1.includes("MON");

      if (token0IsMon) {
        const bal0X18 = (bal0 * ONE_E18) / pow10(dec0);
        poolTvlMonX18 = bal0X18 * BigInt(2);
      } else if (token1IsMon) {
        const bal1X18 = (bal1 * ONE_E18) / pow10(dec1);
        poolTvlMonX18 = bal1X18 * BigInt(2);
      }

      if (poolTvlMonX18 != null) poolTvlMon = withCommas(fmtX18(poolTvlMonX18, 4));
    }
  }

  // -------------------------
  // Market cap in MON + USD
  // -------------------------
  let marketCapMon: string | undefined;
  let marketCapUsd: string | undefined;

  if (priceMonX18 != null) {
    const mcapMonX18 = mulX18(totalSupplyRaw, priceMonX18);
    marketCapMon = withCommas(fmtX18(mcapMonX18, 2));
  }

  if (priceUsdX18 != null) {
    const mcapUsdX18 = mulX18(totalSupplyRaw, priceUsdX18);
    marketCapUsd = withCommas(fmtX18(mcapUsdX18, 2));
  }

  // -------------------------
  // Pool TVL USD (approx)
  // -------------------------
  let poolTvlUsd: string | undefined;
  if (poolTvlMonX18 != null && monUsdX18 != null) {
    const tvlUsdX18 = mulX18(poolTvlMonX18, monUsdX18);
    poolTvlUsd = withCommas(fmtX18(tvlUsdX18, 2));
  }

  // -------------------------
  // Circulating supply estimate
  // -------------------------
  const vestingBalRaw = await safeRead(
    client.readContract({
      address: asAddr(BNOTE_TOKEN),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [asAddr(TREASURY_VESTING)],
    }) as Promise<bigint>
  );

  const stakedEstRaw = (totalSharesRaw * shareRateRaw) / ONE_E18;

  const stakedPct = totalSupplyRaw === ZERO ? null : (Number(stakedEstRaw) / Number(totalSupplyRaw)) * 100;

  const circulatingRaw = vestingBalRaw != null ? totalSupplyRaw - vestingBalRaw : null;

  // -------------------------
  // Formats
  // -------------------------
  const totalSupply = withCommas(trimDecimals(formatUnits(totalSupplyRaw, 18), 0));
  const totalShares = withCommas(trimDecimals(formatUnits(totalSharesRaw, 18), 0));
  const shareRate = fixedDecimals(formatUnits(shareRateRaw, 18), 3);

  const stakedBnoteEst = withCommas(trimDecimals(formatUnits(stakedEstRaw, 18), 0));
  const stakedPctStr = stakedPct == null ? undefined : `${trimDecimals(stakedPct.toString(), 2)}%`;

  const circulatingSupply =
    circulatingRaw == null ? undefined : withCommas(trimDecimals(formatUnits(circulatingRaw, 18), 0));

  return {
    totalSupply,
    totalShares,
    shareRate,

    priceMon,
    monUsd,
    priceUsd,
    poolTvlMon,
    poolTvlUsd,
    marketCapMon,
    marketCapUsd,

    circulatingSupply,
    stakedBnoteEst,
    stakedPct: stakedPctStr,
    poolReserves,

    holdersCount: undefined,

    blockNumber: blockNumber.toString(),
    updatedAtMs: Date.now(),
  };
}
