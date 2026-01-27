import type { Abi, Address } from "viem";

export const BNOTE_TOKEN = "0x20780bF9eb35235cA33c62976CF6de5AA3395561" as Address;

export const BNOTE_STAKING_ABI = [
  // ERC20-ish
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },

  // Staking
  {
    type: "function",
    name: "stakeStart",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "daysLocked", type: "uint16" },
      { name: "autoRenew", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "stakeEnd",
    stateMutability: "nonpayable",
    inputs: [{ name: "idx", type: "uint256" }],
    outputs: [],
  },

  // ✅ This is the important one
  {
    type: "function",
    name: "stakesOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "startTimestamp", type: "uint40" },
          { name: "lockDays", type: "uint16" },
          { name: "amount", type: "uint256" },
          { name: "shares", type: "uint256" },
          { name: "autoRenew", type: "bool" },
        ],
      },
    ],
  },
] as const satisfies Abi;

