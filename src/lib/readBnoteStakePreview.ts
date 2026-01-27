// ./src/lib/readBnoteStakePreview.ts

import { formatUnits, createPublicClient, http, defineChain } from "viem";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";

// Minimal read ABI just for preview math
const PREVIEW_READ_ABI = [
  {
    name: "BASIS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "shareRate",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },

  {
    name: "LPB_PER_YEAR_BPS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "LPB_MAX_YEARS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },

  {
    name: "BPB_MAX_BPS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "BPB_CAP",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type StakePreviewParams = {
  basis: bigint;
  shareRate: bigint;
  lpbPerYearBps: bigint;
  lpbMaxYears: bigint;
  bpbMaxBps: bigint;
  bpbCap: bigint;
};

const MONAD_RPC = "https://rpc.monad.xyz";

const monadChain = defineChain({
  id: 143,
  name: "Monad Mainnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_RPC] },
    public: { http: [MONAD_RPC] },
  },
  blockExplorers: {
    default: { name: "MonadScan", url: "https://monadscan.com" },
  },
});

function getMonadPublicClient() {
  return createPublicClient({
    chain: monadChain,
    transport: http(MONAD_RPC),
  });
}

/**
 * If shareRate is stored "one decimal place" too small (e.g. 1000 while BASIS is 10000),
 * shares will come out ~10x too large.
 *
 * Normalize by multiplying shareRate by 10 until it's >= BASIS (bounded).
 */
function normalizeShareRate(basis: bigint, shareRate: bigint) {
  const ZERO = BigInt(0);
  const TEN = BigInt(10);

  if (basis === ZERO) return shareRate;
  if (shareRate === ZERO) return shareRate;

  let sr = shareRate;

  // scale up at most 6 times (safety)
  for (let i = 0; i < 6; i++) {
    if (sr >= basis) break;
    sr = sr * TEN;
  }

  return sr;
}

export async function readStakePreviewParams(): Promise<StakePreviewParams> {
  const client = getMonadPublicClient();

  const [basis, shareRateRaw, lpbPerYearBps, lpbMaxYears, bpbMaxBps, bpbCap] =
    await Promise.all([
      client.readContract({
        address: BNOTE_TOKEN,
        abi: PREVIEW_READ_ABI,
        functionName: "BASIS",
      }),
      client.readContract({
        address: BNOTE_TOKEN,
        abi: PREVIEW_READ_ABI,
        functionName: "shareRate",
      }),
      client.readContract({
        address: BNOTE_TOKEN,
        abi: PREVIEW_READ_ABI,
        functionName: "LPB_PER_YEAR_BPS",
      }),
      client.readContract({
        address: BNOTE_TOKEN,
        abi: PREVIEW_READ_ABI,
        functionName: "LPB_MAX_YEARS",
      }),
      client.readContract({
        address: BNOTE_TOKEN,
        abi: PREVIEW_READ_ABI,
        functionName: "BPB_MAX_BPS",
      }),
      client.readContract({
        address: BNOTE_TOKEN,
        abi: PREVIEW_READ_ABI,
        functionName: "BPB_CAP",
      }),
    ]);

  const shareRate = normalizeShareRate(basis, shareRateRaw);

  return { basis, shareRate, lpbPerYearBps, lpbMaxYears, bpbMaxBps, bpbCap };
}

/**
 * Preview math:
 * LPB (time bonus): linear by days, capped by LPB_MAX_YEARS
 * BPB (size bonus): linear by amount, capped by BPB_CAP
 *
 * sharesRaw = amountRaw * (BASIS + bonusBps) / shareRate
 */
export function computeStakePreview(args: {
  amountRaw: bigint; // token units (18 decimals)
  lockDays: number;
  params: StakePreviewParams;
}) {
  const { amountRaw, lockDays, params } = args;

  const ZERO = BigInt(0);
  const DAYS_PER_YEAR = BigInt(365);

  const lockDaysBI = BigInt(Math.max(0, lockDays));

  // LPB
  const maxDays = params.lpbMaxYears * DAYS_PER_YEAR;
  const effectiveDays = lockDaysBI > maxDays ? maxDays : lockDaysBI;

  const lpbBps = (effectiveDays * params.lpbPerYearBps) / DAYS_PER_YEAR;
  const lpbMax = params.lpbMaxYears * params.lpbPerYearBps;
  const lpbBpsCapped = lpbBps > lpbMax ? lpbMax : lpbBps;

  // BPB
  const cappedAmt = amountRaw > params.bpbCap ? params.bpbCap : amountRaw;
  const bpbBps =
    params.bpbCap === ZERO ? ZERO : (cappedAmt * params.bpbMaxBps) / params.bpbCap;

  const totalBonusBps = lpbBpsCapped + bpbBps;

  // sharesRaw
  const numerator = amountRaw * (params.basis + totalBonusBps);
  const sharesRaw = params.shareRate === ZERO ? ZERO : numerator / params.shareRate;

  return {
    lpbBps: lpbBpsCapped,
    bpbBps,
    totalBonusBps,
    sharesRaw,
    multiplierNum: params.basis + totalBonusBps,
    basis: params.basis,
    shareRate: params.shareRate,
  };
}

export function bpsToPercent(bps: bigint) {
  const hundred = BigInt(100);
  const whole = bps / hundred;
  const frac = bps % hundred;
  return `${whole.toString()}.${frac.toString().padStart(2, "0")}%`;
}

export function formatToken18(raw: bigint) {
  return formatUnits(raw, 18);
}

export function formatMultiplier(multiplierNum: bigint, basis: bigint) {
  const ZERO = BigInt(0);
  if (basis === ZERO) return "—";

  const SCALE = BigInt(100); // 2 decimals
  const scaled = (multiplierNum * SCALE) / basis;
  const whole = scaled / SCALE;
  const frac = scaled % SCALE;

  return `${whole.toString()}.${frac.toString().padStart(2, "0")}x`;
}
