import { createPublicClient, http, defineChain } from "viem";

export const monad = defineChain({
  id: 143,
  name: "Monad Mainnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
});

export const monadClient = createPublicClient({
  chain: monad,
  transport: http(process.env.NEXT_PUBLIC_MONAD_RPC || "https://rpc.monad.xyz"),
});
