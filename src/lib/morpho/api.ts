import { morphoClient } from "./client";
import { GET_USDC_VAULTS } from "./queries";

export interface VaultData {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  chainName: string;
  apy: number;
  totalApy: number;
  totalAssets: string;
  totalAssetsUsd: number;
  rewardsApr: number;
  riskScore: number;
}

export async function fetchUSDCVaults(): Promise<VaultData[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await morphoClient.query<any>({
    query: GET_USDC_VAULTS,
    variables: {
      chainIds: [1, 8453, 42161],
      usdcAddresses: [
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum USDC
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum USDC
      ],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.vaultV2s.items.map((vault: any) => {
    const baseApy = vault.state.apy ?? 0;
    const rewardsApr = vault.rewards.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, r: any) => sum + (r.supplyApr ?? 0),
      0
    );

    return {
      address: vault.address,
      name: vault.name,
      symbol: vault.symbol,
      chainId: vault.chain.id,
      chainName: vault.chain.network,
      apy: baseApy,
      totalApy: baseApy + rewardsApr,
      totalAssets: vault.state.totalAssets,
      totalAssetsUsd: 0,
      rewardsApr,
      riskScore: 0,
    };
  });
}
