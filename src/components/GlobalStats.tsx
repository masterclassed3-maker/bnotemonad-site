"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { readBnoteGlobalStats, type BnoteGlobalStats } from "@/lib/readBnoteGlobalStats";

function StatCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 overflow-hidden">
      <div className="text-xs text-white/60">{label}</div>
      <div className={`mt-2 font-bold break-words ${valueClassName ?? "text-2xl"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/40 break-words">{sub}</div>}
    </div>
  );
}

/**
 * --- Addresses ---
 */
const BNOTE_TOKEN = "0x20780bF9eb35235cA33c62976CF6de5AA3395561" as const;

// V3 pools (1% fee)
const BNOTE_WMON_POOL_V3 = "0xf6545a50c7673410f5d88e2417e98531a0ee9a73" as const;

// UPDATED: new bNote/USDC pool
const BNOTE_USDC_POOL_V3 = "0x6a5068f4713da6f55c1c5d60bd1ced211644dc90" as const;

// NEW: bNote/WETH pool
const BNOTE_WETH_POOL_V3 = "0xa7657bd212e79502b4dc3751b13c132f042d7e66" as const;

// Transparency
const VESTING_CONTRACT = "0xA512Dd0e6C42775784AC8cA6c438AaD9A17a6596" as const;
const TREASURY_WALLET = "0x48b35f0CCcfB48eF88aDf583384Ea41FAf79d23c" as const;

// Monad RPC
const MONAD_RPC = "https://rpc.monad.xyz";

/**
 * --- ABIs (minimal) ---
 */
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

const UNIV3_POOL_ABI = [
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

/**
 * --- Helpers ---
 * NOTE: No BigInt literals (10n, 2n, 0n) so TS target < ES2020 builds cleanly.
 */
const ONE_E18 = BigInt("1000000000000000000");
const POW2_192 = BigInt("6277101735386680763835789423207666416102355444464034512896"); // 2^192

function fmtNum(n: number, max = 6) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

function fmtUsd(n: number, max = 4) {
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: max })}`;
}

function parseDisplayNumber(s?: string | null) {
  if (!s) return NaN;
  const cleaned = String(s).replaceAll(",", "").replace("%", "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
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
 * token1/token0 price scaled to 1e18, adjusted for decimals.
 * human_price = raw_price * 10^(dec0 - dec1)
 */
function priceX18FromSqrtPriceX96(sqrtPriceX96: bigint, dec0: number, dec1: number): bigint {
  const numerator = sqrtPriceX96 * sqrtPriceX96; // Q192
  let ratioX18 = (numerator * ONE_E18) / POW2_192;

  if (dec0 > dec1) ratioX18 = ratioX18 * pow10(dec0 - dec1);
  else if (dec1 > dec0) ratioX18 = ratioX18 / pow10(dec1 - dec0);

  return ratioX18;
}

function fmtX18(x: bigint, dp: number) {
  const s = formatUnits(x, 18);
  const [a, b = ""] = s.split(".");
  const bb = b.slice(0, dp).replace(/0+$/, "");
  return bb ? `${a}.${bb}` : a;
}

function invertX18(x: bigint): bigint {
  if (x === BigInt(0)) return BigInt(0);
  return (ONE_E18 * ONE_E18) / x;
}

type V3PoolSnapshot = {
  baseSymbol: string;
  quoteSymbol: string;
  priceBaseInQuote: number; // human
  reservesLabel: string; // "X base / Y quote"
};

async function readV3PriceAndBalances(params: {
  client: ReturnType<typeof createPublicClient>;
  pool: `0x${string}`;
  baseToken: `0x${string}`;
}): Promise<V3PoolSnapshot | null> {
  const { client, pool, baseToken } = params;

  const [slot0, t0, t1] = await Promise.all([
    safeRead(client.readContract({ address: pool, abi: UNIV3_POOL_ABI, functionName: "slot0" }) as Promise<any>),
    safeRead(client.readContract({ address: pool, abi: UNIV3_POOL_ABI, functionName: "token0" }) as Promise<string>),
    safeRead(client.readContract({ address: pool, abi: UNIV3_POOL_ABI, functionName: "token1" }) as Promise<string>),
  ]);

  if (!slot0 || !t0 || !t1) return null;

  const token0 = t0 as `0x${string}`;
  const token1 = t1 as `0x${string}`;

  const [dec0, dec1, sym0, sym1] = await Promise.all([
    client.readContract({ address: token0, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>,
    client.readContract({ address: token1, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>,
    safeRead(client.readContract({ address: token0, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>),
    safeRead(client.readContract({ address: token1, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>),
  ]);

  const baseLower = baseToken.toLowerCase();
  const t0Lower = token0.toLowerCase();
  const t1Lower = token1.toLowerCase();

  const sqrtPriceX96 = slot0[0] as bigint;
  const p1Per0X18 = priceX18FromSqrtPriceX96(sqrtPriceX96, Number(dec0), Number(dec1));

  let priceBaseInQuoteX18: bigint | null = null;
  let baseSymbol = "BASE";
  let quoteSymbol = "QUOTE";

  if (baseLower === t0Lower) {
    priceBaseInQuoteX18 = p1Per0X18;
    baseSymbol = (sym0 ?? "TOKEN0").toString();
    quoteSymbol = (sym1 ?? "TOKEN1").toString();
  } else if (baseLower === t1Lower) {
    priceBaseInQuoteX18 = invertX18(p1Per0X18);
    baseSymbol = (sym1 ?? "TOKEN1").toString();
    quoteSymbol = (sym0 ?? "TOKEN0").toString();
  } else {
    return null;
  }

  const priceBaseInQuote = Number(fmtX18(priceBaseInQuoteX18, 12));

  // Liquidity snapshot: ERC20 balances at pool address
  const poolAddr = pool;
  const [bal0, bal1] = await Promise.all([
    safeRead(
      client.readContract({
        address: token0,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [poolAddr],
      }) as Promise<bigint>
    ),
    safeRead(
      client.readContract({
        address: token1,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [poolAddr],
      }) as Promise<bigint>
    ),
  ]);

  if (bal0 == null || bal1 == null) {
    return { baseSymbol, quoteSymbol, priceBaseInQuote, reservesLabel: "—" };
  }

  const amt0 = Number(formatUnits(bal0, Number(dec0)));
  const amt1 = Number(formatUnits(bal1, Number(dec1)));

  let reservesLabel = "—";
  if (baseLower === t0Lower) {
    reservesLabel = `${fmtNum(amt0, 4)} ${baseSymbol} / ${fmtNum(amt1, 4)} ${quoteSymbol}`;
  } else {
    reservesLabel = `${fmtNum(amt1, 4)} ${baseSymbol} / ${fmtNum(amt0, 4)} ${quoteSymbol}`;
  }

  return { baseSymbol, quoteSymbol, priceBaseInQuote, reservesLabel };
}

type ExtraStats = {
  bnoteUsd_direct: number;
  marketCapUsd: number;
  stakedBnote: number;
  stakedUsd: number;
  stakedPct: number;

  // Pool snapshots
  liquidityBnoteWmon: string;
  liquidityBnoteUsdc: string;

  // NEW: bNote/WETH pool metrics
  bnoteWethPrice: number;
  liquidityBnoteWeth: string;

  // Protocol balances
  vestingBalanceBnote: number;
  tokenContractBalanceBnote: number;
  treasuryBalanceBnote: number;
};

export default function GlobalStats() {
  const [stats, setStats] = useState<BnoteGlobalStats | null>(null);
  const [extra, setExtra] = useState<ExtraStats | null>(null);
  const [loading, setLoading] = useState(true);

  const client = useMemo(() => {
    return createPublicClient({
      chain: {
        id: 143,
        name: "Monad Mainnet",
        nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
        rpcUrls: { default: { http: [MONAD_RPC] }, public: { http: [MONAD_RPC] } },
      },
      transport: http(MONAD_RPC),
    });
  }, []);

  async function load() {
    setLoading(true);
    try {
      // Base stats via your lib
      const data = await readBnoteGlobalStats();
      setStats(data);

      // bNOTE decimals
      const bnoteDec = Number(
        await client.readContract({
          address: BNOTE_TOKEN,
          abi: ERC20_ABI,
          functionName: "decimals",
        })
      );

      // Protocol balances
      const [vestingRaw, tokenContractRaw, treasuryRaw] = await Promise.all([
        client.readContract({
          address: BNOTE_TOKEN,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [VESTING_CONTRACT],
        }),
        client.readContract({
          address: BNOTE_TOKEN,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [BNOTE_TOKEN],
        }),
        client.readContract({
          address: BNOTE_TOKEN,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [TREASURY_WALLET],
        }),
      ]);

      const vestingBalanceBnote = Number(formatUnits(vestingRaw as bigint, bnoteDec));
      const tokenContractBalanceBnote = Number(formatUnits(tokenContractRaw as bigint, bnoteDec));
      const treasuryBalanceBnote = Number(formatUnits(treasuryRaw as bigint, bnoteDec));

      // Pool metrics (USDC + WETH)
      const [bnoteUsdcSnap, bnoteWethSnap, bnoteWmonSnap] = await Promise.all([
        readV3PriceAndBalances({ client, pool: BNOTE_USDC_POOL_V3, baseToken: BNOTE_TOKEN }),
        readV3PriceAndBalances({ client, pool: BNOTE_WETH_POOL_V3, baseToken: BNOTE_TOKEN }),
        readV3PriceAndBalances({ client, pool: BNOTE_WMON_POOL_V3, baseToken: BNOTE_TOKEN }),
      ]);

      // Price USD uses direct bNote/USDC pool
      const bnoteUsd_direct = bnoteUsdcSnap?.priceBaseInQuote ?? NaN;

      const totalSupplyNum = parseDisplayNumber(data.totalSupply);
      const marketCapUsd = totalSupplyNum * bnoteUsd_direct;

      const stakedBnote = parseDisplayNumber(data.stakedBnoteEst);
      const stakedUsd = stakedBnote * bnoteUsd_direct;
      const stakedPct = totalSupplyNum > 0 ? (stakedBnote / totalSupplyNum) * 100 : NaN;

      setExtra({
        bnoteUsd_direct,
        marketCapUsd,
        stakedBnote,
        stakedUsd,
        stakedPct,

        liquidityBnoteWmon: bnoteWmonSnap?.reservesLabel ?? "—",
        liquidityBnoteUsdc: bnoteUsdcSnap?.reservesLabel ?? "—",

        // NEW WETH metrics
        bnoteWethPrice: bnoteWethSnap?.priceBaseInQuote ?? NaN,
        liquidityBnoteWeth: bnoteWethSnap?.reservesLabel ?? "—",

        vestingBalanceBnote,
        tokenContractBalanceBnote,
        treasuryBalanceBnote,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatedLine = useMemo(() => {
    if (!stats) return null;
    return `${new Date(stats.updatedAtMs).toLocaleString()} · Block ${stats.blockNumber}`;
  }, [stats]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-black/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/60">bNote Contract</div>
            <div className="mt-1 font-mono text-sm break-words">{BNOTE_TOKEN}</div>
            {updatedLine && <div className="mt-3 text-xs text-white/50">Updated: {updatedLine}</div>}
          </div>

          <button
            onClick={load}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {/* Layout: cap at 3 columns on desktop */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Supply" value={loading ? "…" : stats?.totalSupply ?? "—"} sub="Total bNote minted" />
          <StatCard label="Total Shares" value={loading ? "…" : stats?.totalShares ?? "—"} sub="All active share units" />
          <StatCard label="Share Rate" value={loading ? "…" : stats?.shareRate ?? "—"} sub="Up-only share pricing" />

          <StatCard
            label="bNote Price (MON)"
            value={loading ? "…" : stats?.priceMon ? `${stats.priceMon} MON` : "—"}
            sub="From bNote/WMON V3 pool"
          />

          <StatCard
            label="bNote Price (USD)"
            value={loading ? "…" : extra ? fmtUsd(extra.bnoteUsd_direct, 6) : "—"}
            sub="From bNote/USDC V3 pool"
          />

          <StatCard
            label="Market Cap (USD)"
            value={loading ? "…" : extra ? fmtUsd(extra.marketCapUsd, 0) : "—"}
            sub="Total supply × USD price"
          />

          <StatCard
            label="Circulating Supply"
            value={loading ? "…" : stats?.circulatingSupply ?? "—"}
            sub="Total minus vesting wallet"
          />

          <StatCard
            label="Staked TVL (bNote)"
            value={loading ? "…" : stats?.stakedBnoteEst ?? "—"}
            sub="Estimated (Shares × ShareRate)"
          />

          <StatCard
            label="Staked TVL (USD)"
            value={loading ? "…" : extra ? fmtUsd(extra.stakedUsd, 0) : "—"}
            sub="Staked bNote × USD price"
          />

          <StatCard
            label="Supply Staked (%)"
            value={
              loading
                ? "…"
                : extra && Number.isFinite(extra.stakedPct)
                ? `${fmtNum(extra.stakedPct, 2)}%`
                : stats?.stakedPct ?? "—"
            }
            sub="Staked / total supply"
          />

          <StatCard
            label="bNote/WMON Liquidity"
            value={loading ? "…" : extra?.liquidityBnoteWmon ?? "—"}
            sub="V3 pool token balances"
            valueClassName="text-xl"
          />

          <StatCard
            label="bNote/USDC Liquidity"
            value={loading ? "…" : extra?.liquidityBnoteUsdc ?? "—"}
            sub="V3 pool token balances"
            valueClassName="text-xl"
          />

          {/* NEW: WETH pool cards (same metrics as USDC pool: price + liquidity) */}
          <StatCard
            label="bNote Price (WETH)"
            value={
              loading
                ? "…"
                : extra && Number.isFinite(extra.bnoteWethPrice)
                ? `${fmtNum(extra.bnoteWethPrice, 8)} WETH`
                : "—"
            }
            sub="From bNote/WETH V3 pool"
          />

          <StatCard
            label="bNote/WETH Liquidity"
            value={loading ? "…" : extra?.liquidityBnoteWeth ?? "—"}
            sub="V3 pool token balances"
            valueClassName="text-xl"
          />

          <StatCard
            label="Vesting Contract (bNote)"
            value={loading ? "…" : extra ? fmtNum(extra.vestingBalanceBnote, 2) : "—"}
            sub={<span className="font-mono">{VESTING_CONTRACT}</span>}
            valueClassName="text-xl"
          />

          <StatCard
            label="Treasury Wallet (bNote)"
            value={loading ? "…" : extra ? fmtNum(extra.treasuryBalanceBnote, 2) : "—"}
            sub={<span className="font-mono">{TREASURY_WALLET}</span>}
            valueClassName="text-xl"
          />

          <StatCard
            label="Token Contract Balance (bNote)"
            value={loading ? "…" : extra ? fmtNum(extra.tokenContractBalanceBnote, 2) : "—"}
            sub="bNote held by token contract"
            valueClassName="text-xl"
          />

          <StatCard
            label="Pool Reserves (bNote/WMON)"
            value={loading ? "…" : stats?.poolReserves ?? "—"}
            sub="From global stats reader"
            valueClassName="text-xl"
          />
        </div>
      </div>
    </section>
  );
}
