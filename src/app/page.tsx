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

  const totalValue = positions.reduce((s, p) => s + p.balanceUsd, 0);
  const currentPct = positions.map((p) => ({
    name: p.name,
    value: totalValue > 0 ? Math.round((p.balanceUsd / totalValue) * 100) : 0,
    apy: p.apy * 100,
    balanceUsd: p.balanceUsd,
    chainId: p.chainId,
    assetSymbol: p.assetSymbol,
  }));

  const heldVaultAddresses = new Set(
    positions.map((p) => p.address.toLowerCase())
  );

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/70 border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo — LI.FI style: icon box + text + badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a1a24] border border-white/[0.08] flex items-center justify-center">
                <span className="font-mono font-bold text-sm text-white/90 tracking-tight">MC</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Morpho<span className="text-white/50">Claude</span></span>
              <span className="text-[10px] font-mono font-medium uppercase tracking-[0.16em] rounded-lg bg-white/[0.06] border border-white/[0.08] px-2.5 py-1.5 text-[#a78bfa]">
                Yield
              </span>
            </div>
            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {["Dashboard", "Vaults", "AI Agent"].map((item, i) => (
                <a
                  key={item}
                  href="#"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    i === 0
                      ? "text-white bg-white/[0.06]"
                      : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
          {/* Connect Wallet */}
          <button className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
            {connectedAddress
              ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1200px] mx-auto px-6 pt-24 pb-12 space-y-5">
        <VaultOverview />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <AllocationChart type="current" data={currentPct} />
          <AIRecommendation />
          <AllocationChart type="recommended" />
        </div>

        <MarketList heldAddresses={heldVaultAddresses} />
        <ExecutionPanel />
      </main>
    </div>
  );
}
