"use client";

import { useState } from "react";
import type { ReallocationStep } from "@/lib/executor/reallocate";

interface StepStatus {
  step: ReallocationStep;
  status: "pending" | "signing" | "confirmed" | "failed";
  txHash?: string;
}

const STATUS_STYLES = {
  pending: "text-white/38",
  signing: "text-[#FFBF17]",
  confirmed: "text-[#21C95E]",
  failed: "text-[#FF593C]",
};

const STATUS_LABELS = {
  pending: "Pending",
  signing: "Awaiting signature...",
  confirmed: "Confirmed",
  failed: "Failed",
};

export function ExecutionPanel() {
  const [steps] = useState<StepStatus[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    setTimeout(() => setIsExecuting(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-[#1F1F1F] border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Execution</h3>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-white/38 text-sm">
          Run AI analysis first to generate reallocation steps
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  s.status === "confirmed" ? "bg-[#21C95E]" :
                  s.status === "failed" ? "bg-[#FF593C]" :
                  s.status === "signing" ? "bg-[#FFBF17] animate-pulse" :
                  "bg-white/20"
                }`} />
                <div>
                  <span className="font-medium text-white capitalize">{s.step.type}</span>
                  <span className="text-white/38 ml-2">{s.step.amount} USDC</span>
                </div>
              </div>
              <span className={`text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                {STATUS_LABELS[s.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={isExecuting || steps.length === 0}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#131313] hover:bg-white/90 active:scale-[0.98]"
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
