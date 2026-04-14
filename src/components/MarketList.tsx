"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchAllVaults, type EarnVault } from "@/lib/lifi/earn-client";

interface MarketListProps {
  heldAddresses?: Set<string>;
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  );
}

export function MarketList({ heldAddresses }: MarketListProps) {
  const { data: vaults, isLoading } = useQuery({
    queryKey: ["vaults"],
    queryFn: () => fetchAllVaults("eth,base", "USDC"),
    refetchInterval: 300_000,
  });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-white/80">Available Morpho Vaults</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-white/[0.05]">
              <th className="text-left px-6 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">Name</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">Chain</th>
              <th className="text-right px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Base APY <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#14141f] border-white/[0.08] rounded-xl">
                    <p className="font-semibold mb-1 text-white">Base APY</p>
                    <p className="text-white/50">Native yield from lending markets, calculated from borrower interest rates.</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Reward <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#14141f] border-white/[0.08] rounded-xl">
                    <p className="font-semibold mb-1 text-white">Reward APR</p>
                    <p className="text-white/50">Token incentives (MORPHO, WELL) on top of base yield. Non-compounding.</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Total APY <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#14141f] border-white/[0.08] rounded-xl">
                    <p className="font-semibold mb-1 text-white">Total APY</p>
                    <p className="text-white/50">Base APY + Reward APR. Effective annual return before gas costs.</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right px-6 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">TVL</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-white/30">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#8b5cf6] animate-spin" />
                    </div>
                    <span className="text-xs">Loading vaults...</span>
                  </div>
                </td>
              </tr>
            ) : !vaults || vaults.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-white/30 text-xs">
                  No vaults found
                </td>
              </tr>
            ) : (
              vaults.slice(0, 20).map((vault: EarnVault) => {
                const baseApy = vault.analytics?.apy?.base ?? 0;
                const rewardApr = vault.analytics?.apy?.reward ?? 0;
                const totalApy = vault.analytics?.apy?.total ?? baseApy + rewardApr;
                const tvl = vault.analytics?.tvl?.usd
                  ? parseFloat(vault.analytics.tvl.usd)
                  : 0;
                const isHeld = heldAddresses?.has(vault.address.toLowerCase());

                return (
                  <tr
                    key={`${vault.chainId}-${vault.address}`}
                    className={`border-t border-white/[0.04] transition-all duration-300 hover:bg-white/[0.03] ${
                      isHeld ? "bg-gradient-to-r from-[#8b5cf6]/[0.04] to-transparent" : ""
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-white/80">{vault.name}</span>
                        {isHeld && (
                          <span className="text-[9px] font-mono font-medium uppercase tracking-[0.12em] rounded bg-[#8b5cf6]/15 border border-[#8b5cf6]/20 px-1.5 py-0.5 text-[#a78bfa]">
                            Held
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-white/40">{vault.network}</td>
                    <td className="px-3 py-3.5 text-right text-white/50 font-mono text-xs">
                      {(baseApy * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right text-white/50 font-mono text-xs">
                      {(rewardApr * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs font-semibold bg-gradient-to-r from-[#06b6d4] to-[#8b5cf6] bg-clip-text text-transparent">
                      {(totalApy * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-white/50 font-mono text-xs">
                      ${tvl >= 1_000_000
                        ? `${(tvl / 1_000_000).toFixed(2)}M`
                        : tvl >= 1_000
                          ? `${(tvl / 1_000).toFixed(1)}K`
                          : tvl.toFixed(0)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
