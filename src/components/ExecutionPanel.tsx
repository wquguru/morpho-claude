"use client";

import { useAccount } from "wagmi";
import { useAllocationAnalysis } from "@/hooks/useAllocationAnalysis";
import { useUserPositions } from "@/hooks/useUserPositions";
import { useExecuteRebalance, type StepPhase } from "@/hooks/useExecuteRebalance";
import { DEMO_WALLET, SUPPORTED_CHAINS } from "@/lib/constants";

const EXPLORER_BASE: Record<number, string> = Object.fromEntries(
  Object.entries(SUPPORTED_CHAINS).map(([id, c]) => [id, c.explorer])
);

const CHAIN_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(SUPPORTED_CHAINS).map(([id, c]) => [id, c.label])
);

const PHASE_CONFIG: Record<
  StepPhase,
  { color: string; dot: string; label: string }
> = {
  idle: { color: "text-white/30", dot: "bg-white/20", label: "Pending" },
  quoting: { color: "text-blue-400", dot: "bg-blue-400 animate-pulse-glow", label: "Fetching quote..." },
  switching: { color: "text-blue-400", dot: "bg-blue-400 animate-pulse-glow", label: "Switching chain..." },
  approving: { color: "text-amber-400", dot: "bg-amber-400 animate-pulse-glow", label: "Approving token..." },
  signing: { color: "text-amber-400", dot: "bg-amber-400 animate-pulse-glow", label: "Awaiting signature..." },
  confirming: { color: "text-amber-400", dot: "bg-amber-400 animate-pulse-glow", label: "Confirming on-chain..." },
  confirmed: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Confirmed" },
  failed: { color: "text-red-400", dot: "bg-red-400", label: "Failed" },
};

function truncateHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function ExecutionPanel() {
  const { analysis } = useAllocationAnalysis();
  const { address: connectedAddress, chainId } = useAccount();
  const address = connectedAddress ?? DEMO_WALLET;
  const { positions } = useUserPositions(address);
  const { steps, isExecuting, execute, reset } = useExecuteRebalance();

  const hasAnalysis = !!analysis;
  const hasWallet = !!connectedAddress;
  const allConfirmed = steps.length > 0 && steps.every((s) => s.phase === "confirmed");
  const hasFailed = steps.some((s) => s.phase === "failed");
  const completedCount = steps.filter((s) => s.phase === "confirmed").length;

  const handleExecute = () => {
    if (!analysis || !connectedAddress || !chainId) return;
    reset();
    execute(positions, analysis.recommendedAllocation, connectedAddress, chainId);
  };

  // Button state
  let buttonLabel = "Execute Reallocation";
  let buttonDisabled = false;

  if (!hasAnalysis) {
    buttonLabel = "Run AI analysis first";
    buttonDisabled = true;
  } else if (!hasWallet) {
    buttonLabel = "Connect Wallet to Execute";
    buttonDisabled = true;
  } else if (isExecuting) {
    buttonLabel = `Executing... (${completedCount}/${steps.length})`;
    buttonDisabled = true;
  } else if (allConfirmed) {
    buttonLabel = "All Steps Complete";
    buttonDisabled = true;
  } else if (hasFailed) {
    buttonLabel = "Clear & Re-analyze to Retry";
    buttonDisabled = true;
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white/80">Execution</h3>
        {steps.length > 0 && !isExecuting && (
          <button
            onClick={reset}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

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
            const config = PHASE_CONFIG[s.phase];
            const explorerUrl = s.txHash
              ? `${EXPLORER_BASE[s.chainId] || EXPLORER_BASE[1]}${s.txHash}`
              : null;

            return (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          s.type === "withdraw"
                            ? "bg-orange-500/10 text-orange-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {s.type}
                      </span>
                      <span className="text-sm font-medium text-white/80 truncate max-w-[140px]">
                        {s.vaultName}
                      </span>
                    </div>
                  </div>
                  <span className="text-white/30 font-mono text-xs shrink-0">
                    ${parseFloat(s.amount).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pl-5 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/25">
                      {CHAIN_LABELS[s.chainId] || `Chain ${s.chainId}`}
                    </span>
                    <span className={`text-[10px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-white/20 hover:text-white/50 transition-colors"
                    >
                      {truncateHash(s.txHash!)}
                    </a>
                  )}
                </div>

                {s.error && (
                  <p className="text-[10px] text-red-400/70 mt-1 pl-5 truncate">
                    {s.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={buttonDisabled}
        className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          allConfirmed
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
            : "btn-gradient disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:transform-none"
        }`}
      >
        {isExecuting ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {buttonLabel}
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </div>
  );
}
