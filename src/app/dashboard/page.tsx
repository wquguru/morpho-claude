"use client";

import { useAccount } from "wagmi";
import { VaultOverview } from "@/components/VaultOverview";
import { AllocationChart } from "@/components/AllocationChart";
import { AIRecommendation } from "@/components/AIRecommendation";
import { QuickNavCards } from "@/components/QuickNavCards";
import { useUserPositions } from "@/hooks/useUserPositions";
import { DEMO_WALLET } from "@/lib/constants";

export default function DashboardPage() {
  const { address: connectedAddress } = useAccount();
  const address = connectedAddress ?? DEMO_WALLET;
  const { positions } = useUserPositions(address);

  const totalValue = positions.reduce((s, p) => s + p.balanceUsd, 0);
  const currentPct = positions.map((p) => ({
    name: p.name,
    value: totalValue > 0 ? Math.round((p.balanceUsd / totalValue) * 100) : 0,
    apy: p.apy * 100,
    balanceUsd: p.balanceUsd,
    chainId: p.chainId,
    assetSymbol: p.assetSymbol,
  }));

  return (
    <main className="max-w-[1200px] mx-auto px-6 pt-24 pb-12 space-y-5">
      <VaultOverview />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <AllocationChart type="current" data={currentPct} />
        <AIRecommendation />
        <AllocationChart type="recommended" />
      </div>

      <QuickNavCards />
    </main>
  );
}
