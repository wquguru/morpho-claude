"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserPositions, fetchAllVaults } from "@/lib/lifi/earn-client";
import { DEFAULT_CHAINS_STRING } from "@/lib/constants";

// Normalized position for UI consumption
export interface NormalizedPosition {
  name: string;
  vaultName: string;
  protocolName: string;
  chainId: number;
  address: string;
  balanceUsd: number;
  balanceNative: number;
  assetSymbol: string;
  apy: number;
}

export function useUserPositions(address?: string) {
  const { data, isLoading: positionsLoading } = useQuery({
    queryKey: ["userPositions", address],
    queryFn: () => getUserPositions(address!),
    enabled: !!address,
    refetchInterval: 60_000,
  });

  // Fetch vaults to cross-reference APY
  const { data: vaults, isLoading: vaultsLoading } = useQuery({
    queryKey: ["vaults"],
    queryFn: () => fetchAllVaults(DEFAULT_CHAINS_STRING),
    refetchInterval: 300_000,
  });

  // Build vault APY lookup: "chainId-address" -> total APY
  const vaultApyMap = new Map<string, number>();
  if (vaults) {
    for (const v of vaults) {
      const key = `${v.chainId}-${v.address.toLowerCase()}`;
      vaultApyMap.set(key, v.analytics?.apy?.total ?? 0);
    }
  }

  // Build vault name lookup: "chainId-address" -> human-readable vault name
  const vaultNameMap = new Map<string, string>();
  if (vaults) {
    for (const v of vaults) {
      const key = `${v.chainId}-${v.address.toLowerCase()}`;
      vaultNameMap.set(key, v.name);
    }
  }

  // Normalize the raw API response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positions: NormalizedPosition[] = (data?.positions ?? []).map((p: any) => {
    const key = `${p.chainId}-${(p.address ?? "").toLowerCase()}`;
    const vaultName =
      vaultNameMap.get(key) ??
      (p.asset?.name ? `${p.protocolName} ${p.asset.name}` : p.protocolName ?? "Unknown");

    return {
      name: vaultName,
      vaultName,
      protocolName: p.protocolName ?? "Unknown",
      chainId: p.chainId ?? 0,
      address: p.address ?? "",
      balanceUsd: parseFloat(p.balanceUsd ?? "0"),
      balanceNative: parseFloat(p.balanceNative ?? "0"),
      assetSymbol: p.asset?.symbol ?? "",
      apy: vaultApyMap.get(key) ?? 0,
    };
  });

  const totalValue = positions.reduce((sum, p) => sum + p.balanceUsd, 0);

  // Weighted APY: sum(apy_i * value_i) / totalValue
  const weightedApy =
    totalValue > 0
      ? positions.reduce(
          (sum, p) => sum + p.apy * (p.balanceUsd / totalValue),
          0
        )
      : 0;

  const isLoading = positionsLoading || vaultsLoading;

  return { positions, totalValue, weightedApy, isLoading };
}
