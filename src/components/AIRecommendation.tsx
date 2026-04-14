"use client";

import { useState } from "react";
import { useAllocationAnalysis } from "@/hooks/useAllocationAnalysis";
import { useWidgetExecution } from "@/contexts/WidgetExecutionContext";

function FormattedExplanation({ text }: { text: string }) {
  const lines = text.split(/\n/).filter((l) => l.trim());

  return (
    <div className="space-y-2 text-sm text-white/45">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (/^[A-Z][A-Z\s]+:/.test(trimmed) || /^[A-Z][A-Z\s/()]+[:.—]/.test(trimmed)) {
          return (
            <h4 key={i} className="font-semibold text-white/80 pt-2 first:pt-0">
              {trimmed}
            </h4>
          );
        }

        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          return <p key={i} className="pl-3">{trimmed}</p>;
        }

        if (/^DECISION:/i.test(trimmed)) {
          return (
            <p key={i} className="font-semibold text-white/80 pt-2">{trimmed}</p>
          );
        }

        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AIRecommendation() {
  const [riskProfile, setRiskProfile] = useState<
    "conservative" | "balanced" | "aggressive"
  >("balanced");
  const { analysis, isAnalyzing, error, analyzedAt, analyze } =
    useAllocationAnalysis();
  const { openForDeposit } = useWidgetExecution();

  const hasResult = !!analysis;

  return (
    <div className="h-full glass-card rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">AI Recommendation</h3>
        {analyzedAt && (
          <span className="text-[10px] font-mono text-white/25">
            {timeAgo(analyzedAt)}
          </span>
        )}
      </div>

      {/* Risk Profile — segmented control */}
      <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl mb-4">
        {(["conservative", "balanced", "aggressive"] as const).map(
          (profile) => (
            <button
              key={profile}
              onClick={() => setRiskProfile(profile)}
              disabled={isAnalyzing}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                riskProfile === profile
                  ? "bg-white/[0.08] text-white border border-white/[0.10]"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              {profile}
            </button>
          )
        )}
      </div>

      {/* CTA — gradient glow button */}
      <button
        onClick={() => analyze(riskProfile)}
        disabled={isAnalyzing}
        className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:transform-none"
      >
        {isAnalyzing ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Analyzing...
          </span>
        ) : hasResult ? (
          "Re-analyze"
        ) : (
          "Analyze Optimal Allocation"
        )}
      </button>

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-4 text-sm mt-5 flex-1">
          {/* Badge */}
          <div className="text-center">
            {analysis.recommendation === "execute" && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-emerald-400 font-medium text-xs shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                Execute Rebalance
              </span>
            )}
            {analysis.recommendation === "hold" && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-amber-400 font-medium text-xs">
                Hold Position
              </span>
            )}
            {analysis.recommendation === "review" && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.10] px-4 py-1.5 text-white/70 font-medium text-xs">
                Review Needed
              </span>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "APY Increase", value: `+${analysis.expectedApyIncrease.toFixed(2)}%`, gradient: true },
              { label: "Risk Change", value: `${analysis.riskScoreChange > 0 ? "+" : ""}${analysis.riskScoreChange.toFixed(1)}`, warn: analysis.riskScoreChange > 0 },
              { label: "Gas Cost", value: `$${analysis.estimatedGasCost.toFixed(2)}` },
              { label: "Break-even", value: `${analysis.breakEvenDays}d` },
            ].map((m) => (
              <div key={m.label} className="stat-card p-3 text-center">
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/30 mb-1">{m.label}</p>
                <p className={`text-base font-bold ${
                  m.gradient ? "text-[var(--pink)]" :
                  m.warn ? "text-amber-400" : "text-white/80"
                }`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* AI Explanation */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
            <FormattedExplanation text={analysis.aiExplanation} />
          </div>

          {/* Execute via LI.FI Widget */}
          {analysis.recommendation === "execute" && (
            <button
              onClick={() => openForDeposit(analysis)}
              className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold"
            >
              Execute via LI.FI
            </button>
          )}
        </div>
      )}
    </div>
  );
}
