import { formatUnits, type Address } from "viem";
import { getPublicClient } from "@/lib/wallet";
import { BNOTE_TOKEN } from "@/lib/bnoteStakingAbi";

// Minimal ERC20 read ABI
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
] as const;

export type WalletBalanceResult = {
  raw: bigint;
  decimals: number;
  formattedExact: string; // no commas, good for inputs (e.g. "1234.5678")
  formattedPretty: string; // with commas + trimmed decimals (e.g. "1,234.5678")
};

function trimTrailingZeros(s: string) {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

function formatPrettyFromExact(exact: string, maxDecimals = 4) {
  // exact is a plain numeric string (no commas)
  const [whole, fracRaw = ""] = exact.split(".");
  const frac = fracRaw.slice(0, maxDecimals);

  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (!frac) return wholeWithCommas;
  return trimTrailingZeros(`${wholeWithCommas}.${frac}`);
}

export async function readBnoteWalletBalance(
  account: Address
): Promise<WalletBalanceResult> {
  const client = getPublicClient();

  // Try reading decimals (fallback to 18 if something weird happens)
  let decimals = 18;
  try {
    const d = await client.readContract({
      address: BNOTE_TOKEN,
      abi: ERC20_READ_ABI,
      functionName: "decimals",
    });
    decimals = Number(d);
  } catch {
    decimals = 18;
  }

  const raw = await client.readContract({
    address: BNOTE_TOKEN,
    abi: ERC20_READ_ABI,
    functionName: "balanceOf",
    args: [account],
  });

  const formattedExact = trimTrailingZeros(formatUnits(raw, decimals));
  const formattedPretty = formatPrettyFromExact(formattedExact, 4);

  return { raw, decimals, formattedExact, formattedPretty };
}
