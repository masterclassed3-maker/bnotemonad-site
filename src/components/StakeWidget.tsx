"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { Button } from "@/components/Button";
import { BNOTE_TOKEN, BNOTE_STAKING_ABI } from "@/lib/bnoteStakingAbi";
import {
  connectWallet,
  ensureMonadNetwork,
  getPublicClient,
  getWalletClient,
  toAmountUnits,
} from "@/lib/wallet";
import { readWalletStakes, type OnchainStake } from "@/lib/readBnoteStaking";
import {
  readStakePreviewParams,
  computeStakePreview,
  bpsToPercent,
  formatMultiplier,
  formatToken18,
  type StakePreviewParams,
} from "@/lib/readBnoteStakePreview";

const EXPLORER_TX = (hash: string) => `https://monadscan.com/tx/${hash}`;
const EXPLORER_ADDR = (addr: string) => `https://monadscan.com/address/${addr}`;

// ✅ display-only multiplier requested (no bigint literal)
const EST_SHARES_DISPLAY_MULT = BigInt("100000000000000"); // 1e14

// Minimal ERC20 reads for wallet balance
const ERC20_READ_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

// Optional local tracking for tx hashes (helpful UX)
type LocalTx = {
  hash: string;
  kind: "stakeStart" | "stakeEnd" | "approve";
  createdAt: number;
};

const LS_TX_KEY = "bnote_local_txs_v1";

function loadLocalTxs(): LocalTx[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTxs(txs: LocalTx[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_TX_KEY, JSON.stringify(txs.slice(-50)));
}

function pushLocalTx(tx: LocalTx) {
  const prev = loadLocalTxs();
  saveLocalTxs([...prev, tx]);
}

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function isValidAmountString(x: string) {
  if (!x) return false;
  // allow "123", "123.45", ".5"
  return /^(\d+(\.\d*)?|\.\d+)$/.test(x.trim());
}

export function StakeWidget() {
  const [address, setAddress] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);

  // Start stake inputs
  const [amount, setAmount] = useState("1000");
  const [daysLocked, setDaysLocked] = useState(30);
  const [autoRenew, setAutoRenew] = useState(false);

  // End stake input
  const [endIdx, setEndIdx] = useState<number>(0);

  // On-chain stake list
  const [stakes, setStakes] = useState<OnchainStake[]>([]);
  const [stakeCount, setStakeCount] = useState<number>(0);

  // Wallet token balance
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenSymbol, setTokenSymbol] = useState<string>("bNote");
  const [walletBalRaw, setWalletBalRaw] = useState<bigint>(BigInt(0));
  const [walletBalHuman, setWalletBalHuman] = useState<string>("—");

  // Preview params + computed preview
  const [previewParams, setPreviewParams] = useState<StakePreviewParams | null>(null);
  const [previewError, setPreviewError] = useState<string>("");
  const [preview, setPreview] = useState<{
    lpbPct: string;
    bpbPct: string;
    totalPct: string;
    estShares: string;
    estMultiplier: string;
  } | null>(null);

  // Status line
  const [status, setStatus] = useState<string>("");

  const localTxs = useMemo(() => loadLocalTxs().slice(-5).reverse(), []);

  const shareRateText = useMemo(() => {
    if (!previewParams) return "—";
    // shareRate is returned from the contract (uint256). In your case it’s 1e18, so this shows "1.0"
    return formatToken18(previewParams.shareRate);
  }, [previewParams]);

  const walletLabel = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Not connected";

  // computed guard for “Start Stake”
  const canStartStake = useMemo(() => {
    if (!address) return true; // allow connect + stake flow (we guard later too)
    if (!isValidAmountString(amount)) return false;
    try {
      const a = toAmountUnits(amount || "0", tokenDecimals);
      if (a <= BigInt(0)) return false;
      return a <= walletBalRaw;
    } catch {
      return false;
    }
  }, [address, amount, tokenDecimals, walletBalRaw]);

  async function refreshWalletBalance(addr: Address) {
    const client = getPublicClient();

    try {
      const [dec, sym] = await Promise.all([
        client
          .readContract({
            address: BNOTE_TOKEN,
            abi: ERC20_READ_ABI,
            functionName: "decimals",
          })
          .catch(() => 18 as any),
        client
          .readContract({
            address: BNOTE_TOKEN,
            abi: ERC20_READ_ABI,
            functionName: "symbol",
          })
          .catch(() => "bNote" as any),
      ]);

      const decimalsNum = typeof dec === "number" ? dec : Number(dec);
      setTokenDecimals(Number.isFinite(decimalsNum) ? decimalsNum : 18);
      setTokenSymbol(typeof sym === "string" && sym.length ? sym : "bNote");

      const bal = await client.readContract({
        address: BNOTE_TOKEN,
        abi: ERC20_READ_ABI,
        functionName: "balanceOf",
        args: [addr],
      });

      const balRaw = typeof bal === "bigint" ? bal : BigInt(String(bal));
      setWalletBalRaw(balRaw);

      const human = formatUnits(balRaw, Number.isFinite(decimalsNum) ? decimalsNum : 18);
      setWalletBalHuman(human);
    } catch {
      setWalletBalRaw(BigInt(0));
      setWalletBalHuman("—");
    }
  }

  async function refreshOnchain(addr: Address) {
    setStatus("");
    try {
      const res = await readWalletStakes(addr);
      setStakeCount(res.stakeCount);
      setStakes(res.stakes);
    } catch (e: any) {
      setStakeCount(0);
      setStakes([]);
      setStatus(
        e?.shortMessage ??
          e?.message ??
          "Failed to read stakes from the contract."
      );
    }
  }

  async function onConnect() {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      await ensureMonadNetwork();
      const addr = await connectWallet();
      setAddress(addr);
      setStatus("Wallet connected.");
      await Promise.all([refreshOnchain(addr), refreshWalletBalance(addr)]);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to connect wallet.");
    } finally {
      setBusy(false);
    }
  }

  async function onRefresh() {
    if (busy) return;
    if (!address) {
      setStatus("Connect your wallet first.");
      return;
    }
    setBusy(true);
    try {
      await Promise.all([refreshOnchain(address), refreshWalletBalance(address)]);
      setStatus("Refreshed.");
    } finally {
      setBusy(false);
    }
  }

  async function onStakeStart() {
    if (busy) return;

    // ✅ no Button disabled prop; hard-guard here
    if (address && !canStartStake) {
      setStatus("Enter a valid amount you have available.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      await ensureMonadNetwork();
      const addr = address ?? (await connectWallet());
      setAddress(addr);

      // use tokenDecimals we read (fallback 18)
      const amt = toAmountUnits(amount, tokenDecimals);
      const wallet = getWalletClient();

      const hash = await wallet.writeContract({
        address: BNOTE_TOKEN,
        abi: BNOTE_STAKING_ABI,
        functionName: "stakeStart",
        args: [amt, daysLocked, autoRenew],
        account: addr,
      });

      pushLocalTx({ hash, kind: "stakeStart", createdAt: Date.now() });

      setStatus(`Stake start sent. Tx: ${hash}`);
      await Promise.all([refreshOnchain(addr), refreshWalletBalance(addr)]);
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? "Stake start failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onStakeEnd(idx: number) {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      await ensureMonadNetwork();
      const addr = address ?? (await connectWallet());
      setAddress(addr);

      const wallet = getWalletClient();
      const hash = await wallet.writeContract({
        address: BNOTE_TOKEN,
        abi: BNOTE_STAKING_ABI,
        functionName: "stakeEnd",
        args: [BigInt(idx)],
        account: addr,
      });

      pushLocalTx({ hash, kind: "stakeEnd", createdAt: Date.now() });

      setStatus(`Stake end sent. Tx: ${hash}`);
      await Promise.all([refreshOnchain(addr), refreshWalletBalance(addr)]);
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? "End stake failed.");
    } finally {
      setBusy(false);
    }
  }

  // Load preview params once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = await readStakePreviewParams();
        if (!cancelled) setPreviewParams(params);
      } catch (e: any) {
        if (!cancelled) {
          setPreviewParams(null);
          setPreviewError(
            e?.shortMessage ?? e?.message ?? "Failed to load preview params."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute preview whenever inputs or params change
  useEffect(() => {
    if (!previewParams) {
      setPreview(null);
      return;
    }

    setPreviewError("");

    let amountRaw: bigint;
    try {
      amountRaw = toAmountUnits(amount || "0", tokenDecimals);
    } catch {
      setPreview(null);
      setPreviewError("Enter a valid amount.");
      return;
    }

    const lockDays = clampInt(Number(daysLocked), 1, 5555);

    const res = computeStakePreview({
      amountRaw,
      lockDays,
      params: previewParams,
    });

    // ✅ ONLY DISPLAY CHANGE: multiply estimated shares by 1e14 before showing (no bigint literal)
    const displaySharesRaw = res.sharesRaw * EST_SHARES_DISPLAY_MULT;

    setPreview({
      lpbPct: bpsToPercent(res.lpbBps),
      bpbPct: bpsToPercent(res.bpbBps),
      totalPct: bpsToPercent(res.totalBonusBps),
      estShares: formatToken18(displaySharesRaw),
      estMultiplier: formatMultiplier(res.multiplierNum, res.basis),
    });
  }, [amount, daysLocked, previewParams, tokenDecimals]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
      {/* Top row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-white/70">Wallet</div>
          <div className="mt-1 font-semibold">
            {address ? (
              <a
                href={EXPLORER_ADDR(address)}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                title="View on MonadScan"
              >
                {walletLabel}
              </a>
            ) : (
              walletLabel
            )}
          </div>

          {/* ✅ Wallet bNote balance */}
          <div className="mt-2 text-xs text-white/60">
            Balance:{" "}
            <span className="text-white/85">
              {walletBalHuman === "—" ? "—" : `${walletBalHuman} ${tokenSymbol}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onConnect} variant="secondary">
            {address ? "Connected" : "Connect Wallet"}
          </Button>
          <Button onClick={onRefresh} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Start Stake */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold">Start Stake</div>

          <label className="mt-3 block text-xs text-white/60">
            Amount ({tokenSymbol})
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            placeholder="e.g. 1000"
          />

          <div className="mt-2 text-xs text-white/55">
            Available:{" "}
            <span className="text-white/80">
              {walletBalHuman === "—" ? "—" : `${walletBalHuman} ${tokenSymbol}`}
            </span>
          </div>

          <label className="mt-3 block text-xs text-white/60">Days Locked</label>
          <input
            type="number"
            value={daysLocked}
            onChange={(e) => setDaysLocked(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            min={1}
            max={5555}
          />

          <label className="mt-3 flex items-center gap-2 text-sm text-white/75">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
            />
            Auto-renew
          </label>

          {/* Preview box */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Stake Preview</div>

            {previewError ? (
              <div className="mt-2 text-xs text-red-200/80">{previewError}</div>
            ) : !preview ? (
              <div className="mt-2 text-xs text-white/55">Loading preview…</div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-white/60">LPB (Longer Pays Better)</div>
                  <div className="mt-1 text-sm text-white/85">{preview.lpbPct}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">BPB (Bigger Pays Better)</div>
                  <div className="mt-1 text-sm text-white/85">{preview.bpbPct}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Total Bonus</div>
                  <div className="mt-1 text-sm text-white/85">{preview.totalPct}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Estimated Shares</div>
                  <div className="mt-1 text-sm text-white/85">{preview.estShares}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Current Share Rate</div>
                  <div className="mt-1 text-sm text-white/85">{shareRateText}</div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-xs text-white/60">Estimated Multiplier</div>
                  <div className="mt-1 text-sm text-white/85">{preview.estMultiplier}</div>
                </div>
                <div className="sm:col-span-2 text-xs text-white/55">
                  Shares are computed from the current share rate and contract bonus parameters.
                </div>
              </div>
            )}
          </div>

          <div className="mt-5">
            {/* ✅ no disabled prop — visual disable + click guarded in handler */}
            <div className={!canStartStake ? "pointer-events-none opacity-50" : ""}>
              <Button onClick={onStakeStart}>Start Stake</Button>
            </div>

            {!canStartStake && address && (
              <div className="mt-2 text-xs text-red-200/80">
                Amount must be a valid number and ≤ your wallet balance.
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-white/55">
            After confirmation, your stake will appear below automatically from on-chain reads.
          </div>
        </div>

        {/* End Stake */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold">End Stake</div>

          <label className="mt-3 block text-xs text-white/60">
            Stake Index (your wallet)
          </label>
          <input
            type="number"
            value={endIdx}
            onChange={(e) => setEndIdx(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            min={0}
          />

          <div className="mt-4">
            <Button onClick={() => onStakeEnd(endIdx)} variant="secondary">
              End Stake
            </Button>
          </div>

          <div className="mt-3 text-xs text-white/55">
            Tip: You can also end directly from the table below.
          </div>
        </div>
      </div>

      {/* On-chain stakes */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-sm font-semibold">Your Stakes (On-chain)</div>
            <div className="mt-1 text-xs text-white/60">
              Uses <span className="text-white/80">stakesOf(address)</span> +{" "}
              <span className="text-white/80">stakes(address, idx)</span>
            </div>
          </div>
          <div className="text-xs text-white/60">{stakeCount} stake(s)</div>
        </div>

        {stakes.length === 0 ? (
          <div className="mt-4 text-sm text-white/70">
            {address ? "No stakes found for this wallet." : "Connect your wallet to view stakes."}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {stakes.map((s) => (
              <div
                key={`${s.idx}-${s.startTimestamp}`}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold">Stake #{s.idx}</div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-white/60">
                      AutoRenew:{" "}
                      <span className="text-white/80">{String(s.autoRenew)}</span>
                    </div>
                    <Button variant="secondary" onClick={() => onStakeEnd(s.idx)}>
                      End
                    </Button>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="text-xs text-white/60">
                    Amount
                    <div className="mt-1 text-sm text-white/85">{s.amount}</div>
                  </div>
                  <div className="text-xs text-white/60">
                    Shares
                    <div className="mt-1 text-sm text-white/85">{s.shares}</div>
                  </div>
                  <div className="text-xs text-white/60">
                    Start
                    <div className="mt-1 text-sm text-white/85">{s.startDate}</div>
                  </div>
                  <div className="text-xs text-white/60">
                    End
                    <div className="mt-1 text-sm text-white/85">{s.endDate}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent txs */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="text-xs font-semibold text-white/70">Recent Transactions</div>
          <div className="mt-2 space-y-2">
            {localTxs.length === 0 ? (
              <div className="text-xs text-white/55">No recent txs yet.</div>
            ) : (
              localTxs.map((t) => (
                <div
                  key={`${t.hash}-${t.createdAt}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="text-xs text-white/70">
                    <span className="text-white/85">{t.kind}</span>{" "}
                    <span className="text-white/50">
                      • {new Date(t.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <a
                    href={EXPLORER_TX(t.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-white/80 hover:underline"
                  >
                    View Tx
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
          {(() => {
            const match = status.match(/0x[a-fA-F0-9]{64}/);
            const hash = match?.[0];
            return (
              <>
                <div>{status}</div>
                {hash && (
                  <div className="mt-2">
                    <a
                      href={EXPLORER_TX(hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-white/85 hover:underline"
                    >
                      View on MonadScan
                    </a>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Busy hint */}
      {busy && (
        <div className="mt-3 text-xs text-white/50">
          Working… (if a wallet popup is open, approve it to continue)
        </div>
      )}
    </div>
  );
}
