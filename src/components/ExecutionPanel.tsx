"use client";

import { useState } from "react";
import type { ReallocationStep } from "@/lib/executor/reallocate";
import { useAllocationAnalysis } from "@/hooks/useAllocationAnalysis";

interface StepStatus {
  step: ReallocationStep;
  status: "pending" | "signing" | "confirmed" | "failed";
  txHash?: string;
}

const STATUS_CONFIG = {
  pending: { color: "text-white/30", dot: "bg-white/20", label: "Pending" },
  signing: { color: "text-amber-400", dot: "bg-amber-400 animate-pulse-glow", label: "Awaiting signature..." },
  confirmed: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Confirmed" },
  failed: { color: "text-red-400", dot: "bg-red-400", label: "Failed" },
};

export function ExecutionPanel() {
  const { analysis } = useAllocationAnalysis();
  const [isExecuting, setIsExecuting] = useState(false);

  const steps: StepStatus[] = analysis
    ? analysis.recommendedAllocation.map((rec) => ({
        step: {
          type: "deposit" as const,
          vaultAddress: rec.vaultAddress,
          chainId: rec.chainId,
          amount: rec.amount,
          txData: { to: rec.vaultAddress, data: "0x" },
        },
        status: "pending" as const,
      }))
    : [];

  const handleExecute = async () => {
    setIsExecuting(true);
    setTimeout(() => setIsExecuting(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-white/80 mb-5">Execution</h3>

      {steps.length === 0 ? (
        <div className="text-center py-10 text-white/25 text-sm">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            </div>
            <p>Run AI analysis first to generate reallocation steps</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          {steps.map((s, i) => {
            const config = STATUS_CONFIG[s.status];
            return (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <div>
                    <span className="font-medium text-white/80 capitalize">{s.step.type}</span>
                    <span className="text-white/30 ml-2 font-mono text-xs">{s.step.amount} USDC</span>
                  </div>
                </div>
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={isExecuting || steps.length === 0}
        className="btn-gradient w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:transform-none"
      >
        {isExecuting ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Executing...
          </span>
        ) : (
          "Execute Reallocation"
        )}
      </button>
    </div>
  );
}
