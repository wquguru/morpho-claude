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
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  );
}

export function MarketList({ heldAddresses }: MarketListProps) {
  const { data: vaults, isLoading } = useQuery({
    queryKey: ["vaults"],
    queryFn: () => fetchAllVaults("eth,base", "USDC"),
    refetchInterval: 300_000,
  });

  return (
    <div className="rounded-3xl bg-[#1F1F1F] border border-white/10 overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-white">Available Morpho Vaults</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-white/38 uppercase tracking-wider">Name</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-white/38 uppercase tracking-wider">Chain</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-white/38 uppercase tracking-wider">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Base APY <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#242424] border-white/10 rounded-xl">
                    <p className="font-semibold mb-1 text-white">Base APY</p>
                    <p className="text-white/55">Native yield from lending markets, calculated from borrower interest rates.</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right px-3 py-3 text-xs font-medium text-white/38 uppercase tracking-wider">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Reward <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#242424] border-white/10 rounded-xl">
                    <p className="font-semibold mb-1 text-white">Reward APR</p>
                    <p className="text-white/55">Token incentives (MORPHO, WELL) on top of base yield. Non-compounding.</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right px-3 py-3 text-xs font-medium text-white/38 uppercase tracking-wider">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Total APY <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#242424] border-white/10 rounded-xl">
                    <p className="font-semibold mb-1 text-white">Total APY</p>
                    <p className="text-white/55">Base APY + Reward APR. Effective annual return before gas costs.</p>
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-white/38 uppercase tracking-wider">TVL</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/38">
                  <svg className="animate-spin h-5 w-5 mx-auto mb-2 text-[#FC74FE]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Loading vaults...
                </td>
              </tr>
            ) : !vaults || vaults.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/38">
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
                    className={`border-t border-white/5 transition-colors hover:bg-white/[0.04] ${
                      isHeld ? "bg-[#FC74FE]/[0.04]" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-white">{vault.name}</span>
                        {isHeld && (
                          <span className="inline-flex items-center rounded-full bg-[#FC74FE]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FC74FE]">
                            HELD
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-white/55">{vault.network}</td>
                    <td className="px-3 py-3.5 text-right text-white/65">
                      {(baseApy * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right text-white/65">
                      {(rewardApr * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-[#21C95E]">
                      {(totalApy * 100).toFixed(2)}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-white/65">
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
