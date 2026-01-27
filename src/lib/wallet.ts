import { createPublicClient, http } from "viem";
import { createWalletClient, custom, parseUnits, type Address } from "viem";
import { monad } from "@/lib/monadClient";

type EthProvider = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
};

export function getProvider(): EthProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

export function getPublicClient() {
  return createPublicClient({
    chain: monad,
    transport: http("https://rpc.monad.xyz"),
  });
}

export async function connectWallet(): Promise<Address> {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet detected. Install a wallet like MetaMask.");
  const accounts = await eth.request({ method: "eth_requestAccounts" });
  const addr = accounts?.[0];
  if (!addr || !addr.startsWith("0x") || addr.length !== 42) {
    throw new Error("Could not read wallet address.");
  }
  return addr as Address;
}

export async function ensureMonadNetwork(): Promise<void> {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet detected.");

  // Try switch first
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x8f" }], // 143 in hex = 0x8f
    });
    return;
  } catch (e: any) {
    // If chain not added, add it
    if (e?.code !== 4902) throw e;
  }

  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: "0x8f",
        chainName: "Monad Mainnet",
        nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
        rpcUrls: ["https://rpc.monad.xyz"],
        blockExplorerUrls: ["https://monadscan.com"],
      },
    ],
  });
}

export function getWalletClient() {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet detected.");
  return createWalletClient({
    chain: monad,
    transport: custom(eth as any),
  });
}

export function toAmountUnits(amount: string, decimals = 18) {
  // amount as human string like "1000"
  return parseUnits(amount as `${number}`, decimals);
}
