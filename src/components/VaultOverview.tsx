"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserPositions } from "@/hooks/useUserPositions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DEMO_WALLET } from "@/lib/constants";

export function VaultOverview() {
  const { address: connectedAddress } = useAccount();
  const address = connectedAddress ?? DEMO_WALLET;
  const isDemo = !connectedAddress;
  const { positions, totalValue, weightedApy, isLoading } =
    useUserPositions(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const debankUrl = `https://debank.com/profile/${address}`;
  const apyPercent = weightedApy * 100;

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Address bar */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] font-mono font-medium uppercase tracking-[0.16em] rounded-md bg-white/[0.06] text-white/60 px-2.5 py-1 border border-white/[0.08]">
          {isDemo ? "Demo" : "Live"}
        </span>
        <a
          href={debankUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors duration-300"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-all duration-300"
          onClick={handleCopy}
          title="Copy address"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          )}
        </Button>
        <a
          href={debankUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors duration-300 flex items-center gap-1.5"
        >
          DeBank
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card p-5">
          <p className="text-xs font-medium text-white/40 mb-2">Total Assets</p>
          <p className="text-2xl font-semibold text-white text-glow">
            {isLoading
              ? "..."
              : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>

        <Dialog>
          <DialogTrigger>
            <div className="stat-card p-5 cursor-pointer text-left group">
              <p className="text-xs font-medium text-white/40 mb-2 inline-flex items-center gap-1.5">
                Weighted APY
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-70 transition-opacity"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </p>
              <p className="text-2xl font-semibold text-[var(--pink)]">
                {isLoading ? "..." : `${apyPercent.toFixed(2)}%`}
              </p>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-[#14141f] border-white/[0.08] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-glow">Weighted APY Breakdown</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-white/50">
                Portfolio APY is calculated as the weighted average of each position&apos;s APY, weighted by its USD value relative to total portfolio value.
              </p>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 font-mono text-center text-xs text-white/60">
                Weighted APY = &Sigma;(APY<sub>i</sub> &times; Value<sub>i</sub>) / TotalValue
              </div>
              {positions.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-white">Position Breakdown</p>
                  <div className="rounded-xl border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
                    {positions.map((p, i) => {
                      const weight = totalValue > 0 ? (p.balanceUsd / totalValue) * 100 : 0;
                      const contribution = (p.apy * 100) * (weight / 100);
                      return (
                        <div key={i} className="px-4 py-3 space-y-1 hover:bg-white/[0.02] transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-white">{p.name}</span>
                            <span className="text-[var(--pink)] font-semibold">
                              {(p.apy * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-white/30">
                            <span>${p.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({weight.toFixed(1)}%)</span>
                            <span>+{contribution.toFixed(2)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 flex justify-between items-center">
                <span className="font-semibold text-white">Total Weighted APY</span>
                <span className="text-xl font-bold text-[var(--pink)]">{apyPercent.toFixed(2)}%</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="stat-card p-5">
          <p className="text-xs font-medium text-white/40 mb-2">Positions</p>
          <p className="text-2xl font-semibold text-white text-glow">
            {isLoading ? "..." : positions.length}
          </p>
        </div>
      </div>
    </div>
  );
}
