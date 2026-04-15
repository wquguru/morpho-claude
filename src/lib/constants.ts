// Demo wallet with active Morpho USDC positions on Base:
// ~$5M Steakhouse Prime USDC (3.91% APY)
// ~$5M Gauntlet USDC Prime (3.94% APY)
// Historical positions across Ethereum + Base with $247K+ total PnL
export const DEMO_WALLET = "0xF63F5FCC54f5fd11f3c098053F330E032E4D9259";

export const SUPPORTED_CHAINS: Record<
  number,
  { name: string; shortName: string; label: string; explorer: string; usdc: string }
> = {
  1: {
    name: "Ethereum",
    shortName: "eth",
    label: "ETH",
    explorer: "https://etherscan.io/tx/",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  8453: {
    name: "Base",
    shortName: "base",
    label: "Base",
    explorer: "https://basescan.org/tx/",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  42161: {
    name: "Arbitrum",
    shortName: "arb",
    label: "Arb",
    explorer: "https://arbiscan.io/tx/",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(SUPPORTED_CHAINS).map(Number);
export const DEFAULT_CHAINS_STRING = Object.values(SUPPORTED_CHAINS)
  .map((c) => c.shortName)
  .join(",");
export const SMALL_PORTFOLIO_THRESHOLD = 10_000;
