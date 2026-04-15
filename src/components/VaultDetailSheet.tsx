"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import type { EarnVault } from "@/lib/lifi/earn-client";

interface VaultDetailSheetProps {
  vault: EarnVault | null;
  onOpenChange: (open: boolean) => void;
}

function ApyBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-mono font-semibold text-white/80">
          {(value * 100).toFixed(2)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--pink)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
      <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

const MORPHO_NETWORK_SLUGS: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  42161: "arbitrum",
};

function getMorphoUrl(vault: EarnVault): string {
  const networkSlug = MORPHO_NETWORK_SLUGS[vault.chainId] ?? "ethereum";
  return `https://app.morpho.org/vault?vault=${vault.address}&network=${networkSlug}`;
}

export function VaultDetailSheet({ vault, onOpenChange }: VaultDetailSheetProps) {
  if (!vault) return null;

  const baseApy = vault.analytics?.apy?.base ?? 0;
  const reward = vault.analytics?.apy?.reward ?? 0;
  const totalApy = vault.analytics?.apy?.total ?? baseApy + reward;
  const tvl = vault.analytics?.tvl?.usd ? parseFloat(vault.analytics.tvl.usd) : 0;
  const maxApy = Math.max(totalApy, 0.01);
  const chainInfo = SUPPORTED_CHAINS[vault.chainId as keyof typeof SUPPORTED_CHAINS];

  return (
    <Sheet open={!!vault} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="h-full flex flex-col overflow-y-auto p-6 pt-8">
          <SheetTitle>{vault.name}</SheetTitle>
          <SheetDescription className="mt-1">
            {vault.protocol?.name ?? "Morpho"} on {chainInfo?.name ?? vault.network}
          </SheetDescription>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/30 mb-1">
                Total APY
              </p>
              <p className="text-xl font-bold text-[var(--pink)]">
                {(totalApy * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/30 mb-1">
                TVL
              </p>
              <p className="text-xl font-bold text-white/80">
                ${tvl >= 1_000_000_000
                  ? `${(tvl / 1_000_000_000).toFixed(2)}B`
                  : tvl >= 1_000_000
                  ? `${(tvl / 1_000_000).toFixed(2)}M`
                  : tvl >= 1_000
                  ? `${(tvl / 1_000).toFixed(1)}K`
                  : tvl.toFixed(0)}
              </p>
            </div>
          </div>

          {/* APY Breakdown */}
          <div className="mt-6 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/30">
              APY Breakdown
            </p>
            <ApyBar label="Base APY" value={baseApy} max={maxApy} />
            <ApyBar label="Reward APR" value={reward} max={maxApy} />
            <ApyBar label="Total APY" value={totalApy} max={maxApy} />
          </div>

          {/* Details */}
          <div className="mt-6 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/30">
              Details
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Chain</span>
                <span className="text-xs font-medium text-white/80">
                  {chainInfo?.name ?? vault.network}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Asset</span>
                <span className="text-xs font-mono text-white/80">
                  {vault.underlyingTokens?.map((t) => t.symbol).join(", ") || "\u2014"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Transactional</span>
                <span className={`text-xs font-medium ${vault.isTransactional ? "text-emerald-400" : "text-white/30"}`}>
                  {vault.isTransactional ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Vault Address</span>
                <CopyableAddress address={vault.address} />
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-auto pt-6 space-y-3">
            <a
              href={getMorphoUrl(vault)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl text-center text-sm font-semibold bg-white/[0.06] border border-white/[0.10] text-white/80 hover:bg-white/[0.10] hover:border-white/[0.16] transition-all duration-200"
            >
              View on Morpho &rarr;
            </a>
            {chainInfo?.explorer && (
              <a
                href={`${chainInfo.explorer.replace("/tx/", "/address/")}${vault.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 rounded-xl text-center text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                View on Explorer
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
