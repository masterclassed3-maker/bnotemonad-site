import { formatUnits } from "viem";
import { monadClient } from "@/lib/monadClient";
import { BNOTE_TOKEN, ERC20_ABI } from "@/lib/stakingConstants";

function formatCompact(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

export async function readTotalStaked(): Promise<string> {
  const [decimals, contractBal] = await Promise.all([
    monadClient.readContract({
      address: BNOTE_TOKEN,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
    monadClient.readContract({
      address: BNOTE_TOKEN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [BNOTE_TOKEN], // tokens held by the token contract itself
    }),
  ]);

  const n = Number(formatUnits(contractBal as bigint, Number(decimals)));
  return formatCompact(n);
}
