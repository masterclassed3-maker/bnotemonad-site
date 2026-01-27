export const BNOTE_TOKEN = "0x20780bF9eb35235cA33c62976CF6de5AA3395561" as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// We "probe" common read names. If your contract uses different names,
// it will safely fall back to "—" with no crashes.
export const STAKE_READ_ABI = [
  // counts
  {
    type: "function",
    name: "stakeCount",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "stakeLength",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getStakeCount",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // stake getters (tuple shapes will vary; we extract first bigint we find)
  {
    type: "function",
    name: "stakes",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "idx", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "stakeData",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "idx", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getStake",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "idx", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
