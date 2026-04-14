"use client";

import { useAccount } from "wagmi";
import { VaultOverview } from "@/components/VaultOverview";
import { AllocationChart } from "@/components/AllocationChart";
import { AIRecommendation } from "@/components/AIRecommendation";
import { MarketList } from "@/components/MarketList";
import { ExecutionPanel } from "@/components/ExecutionPanel";
import { useUserPositions } from "@/hooks/useUserPositions";
import { DEMO_WALLET } from "@/lib/constants";

export default function Dashboard() {
  const { address: connectedAddress } = useAccount();
  const address = connectedAddress ?? DEMO_WALLET;
  const { positions } = useUserPositions(address);

  // Build current allocation chart data from normalized positions
  const totalValue = positions.reduce((s, p) => s + p.balanceUsd, 0);
  const currentPct = positions.map((p) => ({
    name: p.name,
    value: totalValue > 0 ? Math.round((p.balanceUsd / totalValue) * 100) : 0,
    apy: p.apy * 100,
    balanceUsd: p.balanceUsd,
    chainId: p.chainId,
    assetSymbol: p.assetSymbol,
  }));

  // Build set of held vault addresses for highlighting in MarketList
  const heldVaultAddresses = new Set(
    positions.map((p) => p.address.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header — Uniswap-style sticky nav */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#131313]/80 border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FC74FE] to-[#FF007A] flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-lg font-semibold text-white">MorphoClaude</span>
            </div>
            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              <a href="#" className="px-3 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/8 transition-colors">
                Dashboard
              </a>
              <a href="#" className="px-3 py-2 rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/8 transition-colors">
                Vaults
              </a>
              <a href="#" className="px-3 py-2 rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/8 transition-colors">
                AI Agent
              </a>
            </nav>
          </div>
          {/* Connect button */}
          <button className="rounded-full bg-white text-[#131313] px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors">
            {connectedAddress
              ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
        {/* Top: Overview */}
        <VaultOverview />

        {/* Middle: Charts + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AllocationChart type="current" data={currentPct} />
          <AIRecommendation />
          <AllocationChart type="recommended" />
        </div>

        {/* Market List */}
        <MarketList heldAddresses={heldVaultAddresses} />

        {/* Execution Panel */}
        <ExecutionPanel />
      </main>
    </div>
  );
}
