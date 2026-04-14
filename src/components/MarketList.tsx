"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchAllVaults, type EarnVault } from "@/lib/lifi/earn-client";

interface MarketListProps {
  heldAddresses?: Set<string>;
}

export function MarketList({ heldAddresses }: MarketListProps) {
  const { data: vaults, isLoading } = useQuery({
    queryKey: ["vaults"],
    queryFn: () => fetchAllVaults("eth,base", "USDC"),
    refetchInterval: 300_000, // 5 min
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Available Morpho Vaults</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead className="text-right">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Base APY
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    <p className="font-semibold mb-1">Base APY</p>
                    <p>Native yield from the vault&apos;s lending markets, calculated from interest rates paid by borrowers.</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Reward APR
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    <p className="font-semibold mb-1">Reward APR</p>
                    <p>Additional token incentives (e.g. MORPHO, WELL) distributed on top of base yield. Non-compounding.</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Total APY
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    <p className="font-semibold mb-1">Total APY</p>
                    <p>Base APY + Reward APR combined. This is your effective annual return before gas costs.</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right">TVL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading vaults...
                </TableCell>
              </TableRow>
            ) : !vaults || vaults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No vaults found
                </TableCell>
              </TableRow>
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
                  <TableRow
                    key={`${vault.chainId}-${vault.address}`}
                    className={isHeld ? "bg-blue-50 dark:bg-blue-950/30" : ""}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {vault.name}
                        {isHeld && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            HELD
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{vault.network}</TableCell>
                    <TableCell className="text-right">
                      {(baseApy * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {(rewardApr * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {(totalApy * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      ${tvl >= 1_000_000
                        ? `${(tvl / 1_000_000).toFixed(2)}M`
                        : tvl >= 1_000
                          ? `${(tvl / 1_000).toFixed(1)}K`
                          : tvl.toFixed(0)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
