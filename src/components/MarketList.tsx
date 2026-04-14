"use client";

import { useState, useMemo } from "react";
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

const CHAIN_OPTIONS = [
  { label: "All Chains", value: "" },
  { label: "Ethereum", value: "Ethereum" },
  { label: "Base", value: "Base" },
];

const TVL_OPTIONS = [
  { label: "TVL > $100M", value: 100_000_000 },
  { label: "TVL > $10M", value: 10_000_000 },
  { label: "TVL > $1M", value: 1_000_000 },
  { label: "TVL > $100K", value: 100_000 },
  { label: "TVL > $10K", value: 10_000 },
  { label: "All TVL", value: 0 },
];

type SortField = "name" | "totalApy" | "baseApy" | "reward" | "tvl";
type SortDir = "asc" | "desc";

function getVaultMetrics(vault: EarnVault) {
  const baseApy = vault.analytics?.apy?.base ?? 0;
  const reward = vault.analytics?.apy?.reward ?? 0;
  const totalApy = vault.analytics?.apy?.total ?? baseApy + reward;
  const tvl = vault.analytics?.tvl?.usd ? parseFloat(vault.analytics.tvl.usd) : 0;
  return { baseApy, reward, totalApy, tvl };
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  );
}

function ChevronDown() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><path d="m6 9 6 6 6-6"/></svg>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-20 ml-0.5 inline-block"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
    );
  }
  return dir === "desc" ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 ml-0.5 inline-block"><path d="m7 15 5 5 5-5"/></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 ml-0.5 inline-block"><path d="m7 9 5-5 5 5"/></svg>
  );
}

export function MarketList({ heldAddresses }: MarketListProps) {
  const [chainFilter, setChainFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [minTvl, setMinTvl] = useState(1_000_000);
  const [heldOnly, setHeldOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalApy");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: vaults, isLoading } = useQuery({
    queryKey: ["vaults"],
    queryFn: () => fetchAllVaults("eth,base"),
    refetchInterval: 300_000,
  });

  const assetOptions = useMemo(() => {
    if (!vaults) return [];
    const symbols = new Set<string>();
    for (const v of vaults) {
      for (const t of v.underlyingTokens ?? []) {
        if (t.symbol) symbols.add(t.symbol);
      }
    }
    return Array.from(symbols).sort();
  }, [vaults]);

  const filtered = useMemo(() => {
    if (!vaults) return [];
    const needle = search.toLowerCase();
    const result = vaults.filter((vault) => {
      const { tvl } = getVaultMetrics(vault);
      if (tvl < minTvl) return false;
      if (heldOnly && !heldAddresses?.has(vault.address.toLowerCase())) return false;
      if (chainFilter && vault.network !== chainFilter) return false;
      if (assetFilter) {
        const symbols = vault.underlyingTokens?.map((t) => t.symbol) ?? [];
        if (!symbols.includes(assetFilter)) return false;
      }
      if (needle) {
        const name = vault.name.toLowerCase();
        const tokens = vault.underlyingTokens?.map((t) => t.symbol.toLowerCase()).join(" ") ?? "";
        if (!name.includes(needle) && !tokens.includes(needle)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const ma = getVaultMetrics(a);
      const mb = getVaultMetrics(b);
      let diff = 0;
      switch (sortField) {
        case "name": diff = a.name.localeCompare(b.name); break;
        case "totalApy": diff = ma.totalApy - mb.totalApy; break;
        case "baseApy": diff = ma.baseApy - mb.baseApy; break;
        case "reward": diff = ma.reward - mb.reward; break;
        case "tvl": diff = ma.tvl - mb.tvl; break;
      }
      return sortDir === "desc" ? -diff : diff;
    });

    return result;
  }, [vaults, chainFilter, assetFilter, minTvl, heldOnly, heldAddresses, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const selectClass =
    "appearance-none input-web3 px-3 py-1.5 pr-7 text-xs font-mono cursor-pointer";

  const sortableThClass =
    "cursor-pointer select-none hover:text-white/50 transition-colors";

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-sm font-semibold text-white/80">Available Morpho Vaults</h3>
        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="input-web3 px-3 py-1.5 text-xs font-mono w-32"
          />

          {/* Chain filter */}
          <div className="relative">
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className={selectClass}
            >
              {CHAIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#14141f]">
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"><ChevronDown /></span>
          </div>

          {/* Asset filter */}
          <div className="relative">
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className={selectClass}
            >
              <option value="" className="bg-[#14141f]">All Assets</option>
              {assetOptions.map((s) => (
                <option key={s} value={s} className="bg-[#14141f]">
                  {s}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"><ChevronDown /></span>
          </div>

          {/* TVL filter */}
          <div className="relative">
            <select
              value={minTvl}
              onChange={(e) => setMinTvl(Number(e.target.value))}
              className={selectClass}
            >
              {TVL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#14141f]">
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"><ChevronDown /></span>
          </div>

          {/* Held toggle */}
          {heldAddresses && heldAddresses.size > 0 && (
            <button
              onClick={() => setHeldOnly((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono border transition-colors ${
                heldOnly
                  ? "bg-white/[0.08] border-white/[0.14] text-white/80"
                  : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              Held
            </button>
          )}

          {/* Result count */}
          {!isLoading && vaults && (
            <span className="text-[10px] font-mono text-white/30 ml-1">
              {filtered.length}/{vaults.length}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-white/[0.05]">
              <th
                className={`text-left px-6 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em] ${sortableThClass}`}
                onClick={() => toggleSort("name")}
              >
                Name <SortIcon active={sortField === "name"} dir={sortDir} />
              </th>
              <th className="text-left px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">Asset</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em]">Chain</th>
              <th
                className={`text-right px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em] ${sortableThClass}`}
                onClick={() => toggleSort("baseApy")}
              >
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Base APY <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#14141f] border-white/[0.08] rounded-xl">
                    <p className="font-semibold mb-1 text-white">Base APY</p>
                    <p className="text-white/50">Native yield from lending markets, calculated from borrower interest rates.</p>
                  </TooltipContent>
                </Tooltip>
                <SortIcon active={sortField === "baseApy"} dir={sortDir} />
              </th>
              <th
                className={`text-right px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em] ${sortableThClass}`}
                onClick={() => toggleSort("reward")}
              >
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Reward <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#14141f] border-white/[0.08] rounded-xl">
                    <p className="font-semibold mb-1 text-white">Reward APR</p>
                    <p className="text-white/50">Token incentives (MORPHO, WELL) on top of base yield. Non-compounding.</p>
                  </TooltipContent>
                </Tooltip>
                <SortIcon active={sortField === "reward"} dir={sortDir} />
              </th>
              <th
                className={`text-right px-3 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em] ${sortableThClass}`}
                onClick={() => toggleSort("totalApy")}
              >
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
                    Total APY <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-[#14141f] border-white/[0.08] rounded-xl">
                    <p className="font-semibold mb-1 text-white">Total APY</p>
                    <p className="text-white/50">Base APY + Reward APR. Effective annual return before gas costs.</p>
                  </TooltipContent>
                </Tooltip>
                <SortIcon active={sortField === "totalApy"} dir={sortDir} />
              </th>
              <th
                className={`text-right px-6 py-3 text-[10px] font-mono font-medium text-white/30 uppercase tracking-[0.12em] ${sortableThClass}`}
                onClick={() => toggleSort("tvl")}
              >
                TVL <SortIcon active={sortField === "tvl"} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-white/30">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/50 animate-spin" />
                    </div>
                    <span className="text-xs">Loading vaults...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-white/30 text-xs">
                  No vaults match filters
                </td>
              </tr>
            ) : (
              filtered.map((vault: EarnVault) => {
                const { baseApy, reward, totalApy, tvl } = getVaultMetrics(vault);
                const isHeld = heldAddresses?.has(vault.address.toLowerCase());

                return (
                  <tr
                    key={`${vault.chainId}-${vault.address}`}
                    className={`border-t border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                      isHeld ? "bg-white/[0.02]" : ""
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-white/80">{vault.name}</span>
                        {isHeld && (
                          <span className="text-[9px] font-mono font-medium uppercase tracking-[0.12em] rounded bg-white/[0.06] border border-white/[0.10] px-1.5 py-0.5 text-white/60">
                            Held
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-white/50 font-mono text-xs">
                      {vault.underlyingTokens?.map(t => t.symbol).join(", ") || "\u2014"}
                    </td>
                    <td className="px-3 py-3.5 text-white/40">{vault.network}</td>
                    <td className="px-3 py-3.5 text-right text-white/50 font-mono text-xs">
                      {(baseApy * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right text-white/50 font-mono text-xs">
                      {(reward * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs font-semibold text-[var(--pink)]">
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
