"use client";

import { useState } from "react";
import { useAllocationAnalysis } from "@/hooks/useAllocationAnalysis";

function FormattedExplanation({ text }: { text: string }) {
  const lines = text.split(/\n/).filter((l) => l.trim());

  return (
    <div className="space-y-2 text-sm text-white/55">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (/^[A-Z][A-Z\s]+:/.test(trimmed) || /^[A-Z][A-Z\s/()]+[:.—]/.test(trimmed)) {
          return (
            <h4 key={i} className="font-semibold text-white pt-2 first:pt-0">
              {trimmed}
            </h4>
          );
        }

        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          return (
            <p key={i} className="pl-3">
              {trimmed}
            </p>
          );
        }

        if (/^DECISION:/i.test(trimmed)) {
          return (
            <p key={i} className="font-semibold text-white pt-2">
              {trimmed}
            </p>
          );
        }

        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}

export function AIRecommendation() {
  const [riskProfile, setRiskProfile] = useState<
    "conservative" | "balanced" | "aggressive"
  >("balanced");
  const { analysis, isAnalyzing, error, analyze } = useAllocationAnalysis();

  return (
    <div className="h-full rounded-3xl bg-[#1F1F1F] border border-white/10 p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4">AI Recommendation</h3>

      {/* Risk Profile Selector */}
      <div className="flex gap-1.5 p-1 bg-white/[0.06] rounded-2xl mb-4">
        {(["conservative", "balanced", "aggressive"] as const).map(
          (profile) => (
            <button
              key={profile}
              onClick={() => setRiskProfile(profile)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all capitalize ${
                riskProfile === profile
                  ? "bg-white text-[#131313] shadow-sm"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {profile}
            </button>
          )
        )}
      </div>

      {/* Analyze Button — Uniswap pink CTA */}
      <button
        onClick={() => analyze(riskProfile)}
        disabled={isAnalyzing}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#FC74FE]/15 text-[#FC74FE] hover:bg-[#FC74FE]/25 active:scale-[0.98]"
      >
        {isAnalyzing ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Analyzing...
          </span>
        ) : (
          "Analyze Optimal Allocation"
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-[#FF593C] mt-3">{error}</p>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-4 text-sm mt-4 flex-1">
          {/* Recommendation Badge */}
          <div className="text-center">
            {analysis.recommendation === "execute" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#21C95E]/15 px-4 py-1.5 text-[#21C95E] font-semibold text-xs">
                Execute Rebalance
              </span>
            )}
            {analysis.recommendation === "hold" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFBF17]/15 px-4 py-1.5 text-[#FFBF17] font-semibold text-xs">
                Hold Position
              </span>
            )}
            {analysis.recommendation === "review" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FC74FE]/15 px-4 py-1.5 text-[#FC74FE] font-semibold text-xs">
                Review Needed
              </span>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/38 mb-0.5">APY Increase</p>
              <p className="text-base font-bold text-[#21C95E]">
                +{analysis.expectedApyIncrease.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/38 mb-0.5">Risk Change</p>
              <p className={`text-base font-bold ${analysis.riskScoreChange < 0 ? "text-[#21C95E]" : "text-[#FFBF17]"}`}>
                {analysis.riskScoreChange > 0 ? "+" : ""}
                {analysis.riskScoreChange.toFixed(1)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/38 mb-0.5">Gas Cost</p>
              <p className="text-base font-bold text-white">
                ${analysis.estimatedGasCost.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/38 mb-0.5">Break-even</p>
              <p className="text-base font-bold text-white">{analysis.breakEvenDays}d</p>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <FormattedExplanation text={analysis.aiExplanation} />
          </div>
        </div>
      )}
    </div>
  );
}
