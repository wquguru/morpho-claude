"use client";

import { useState, useCallback, useRef } from "react";
import { encodeFunctionData, parseUnits, parseAbi, erc20Abi, maxUint256 } from "viem";
import {
  getPublicClient,
  getWalletClient,
  switchChain,
} from "@wagmi/core";
import { wagmiConfig } from "@/components/Providers";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import type { NormalizedPosition } from "@/hooks/useUserPositions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepPhase =
  | "idle"
  | "quoting"
  | "switching"
  | "approving"
  | "signing"
  | "confirming"
  | "confirmed"
  | "failed";

export interface ExecutionStep {
  type: "withdraw" | "deposit";
  vaultAddress: string;
  vaultName: string;
  chainId: number;
  amount: string; // USDC amount (human-readable, e.g. "3000")
  phase: StepPhase;
  txHash?: string;
  error?: string;
}

interface RecommendedVault {
  vaultAddress: string;
  vaultName: string;
  chainId: number;
  percentage: number;
  amount: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USDC_ADDRESSES: Record<number, string> = Object.fromEntries(
  Object.entries(SUPPORTED_CHAINS).map(([id, c]) => [id, c.usdc])
);

const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(SUPPORTED_CHAINS).map(([id, c]) => [id, c.shortName])
);

const erc4626Abi = parseAbi([
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function asset() view returns (address)",
  "function decimals() view returns (uint8)",
]);

// ---------------------------------------------------------------------------
// Diff computation: current positions vs recommended → withdraw/deposit steps
// ---------------------------------------------------------------------------

export function computeRebalanceSteps(
  currentPositions: NormalizedPosition[],
  recommended: RecommendedVault[]
): ExecutionStep[] {
  const withdrawSteps: ExecutionStep[] = [];
  const depositSteps: ExecutionStep[] = [];

  // Build lookup: vaultAddress (lowercase) → recommended amount
  const recMap = new Map<string, RecommendedVault>();
  for (const r of recommended) {
    recMap.set(r.vaultAddress.toLowerCase(), r);
  }

  // Build lookup: vaultAddress (lowercase) → current position
  const curMap = new Map<string, NormalizedPosition>();
  for (const p of currentPositions) {
    curMap.set(p.address.toLowerCase(), p);
  }

  // Withdrawals: current vaults where recommended < current
  for (const pos of currentPositions) {
    const key = pos.address.toLowerCase();
    const rec = recMap.get(key);
    const recAmount = rec ? parseFloat(rec.amount) : 0;
    const diff = pos.balanceUsd - recAmount;

    if (diff > 0.01) {
      withdrawSteps.push({
        type: "withdraw",
        vaultAddress: pos.address,
        vaultName: pos.vaultName,
        chainId: pos.chainId,
        amount: diff.toFixed(2),
        phase: "idle",
      });
    }
  }

  // Deposits: recommended vaults where current < recommended
  for (const rec of recommended) {
    const key = rec.vaultAddress.toLowerCase();
    const cur = curMap.get(key);
    const curAmount = cur ? cur.balanceUsd : 0;
    const diff = parseFloat(rec.amount) - curAmount;

    if (diff > 0.01) {
      depositSteps.push({
        type: "deposit",
        vaultAddress: rec.vaultAddress,
        vaultName: rec.vaultName || rec.vaultAddress.slice(0, 10),
        chainId: rec.chainId,
        amount: diff.toFixed(2),
        phase: "idle",
      });
    }
  }

  // Withdrawals first, then deposits
  return [...withdrawSteps, ...depositSteps];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExecuteRebalance() {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const abortRef = useRef(false);

  const updateStep = useCallback(
    (index: number, patch: Partial<ExecutionStep>) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
      );
    },
    []
  );

  const executingRef = useRef(false);

  const execute = useCallback(
    async (
      currentPositions: NormalizedPosition[],
      recommended: RecommendedVault[],
      userAddress: string,
      currentChainId: number
    ) => {
      if (executingRef.current) return; // prevent concurrent runs

      const newSteps = computeRebalanceSteps(currentPositions, recommended);
      if (newSteps.length === 0) return;

      setSteps(newSteps);
      setIsExecuting(true);
      executingRef.current = true;
      abortRef.current = false;

      let activeChainId = currentChainId;

      for (let i = 0; i < newSteps.length; i++) {
        if (abortRef.current) break;
        const step = newSteps[i];

        try {
          // --- Chain switch if needed ---
          if (step.chainId !== activeChainId) {
            updateStep(i, { phase: "switching" });
            await switchChain(wagmiConfig, { chainId: step.chainId as (typeof wagmiConfig)["chains"][number]["id"] });
            activeChainId = step.chainId;
          }

          const walletClient = await getWalletClient(wagmiConfig, {
            chainId: step.chainId as (typeof wagmiConfig)["chains"][number]["id"],
          });
          const publicClient = getPublicClient(wagmiConfig, {
            chainId: step.chainId as (typeof wagmiConfig)["chains"][number]["id"],
          });

          if (!walletClient || !publicClient) {
            updateStep(i, { phase: "failed", error: "Wallet not connected" });
            break;
          }

          if (step.type === "withdraw") {
            // --- ERC-4626 withdraw ---
            updateStep(i, { phase: "quoting" });

            // Read vault decimals and max withdrawable on-chain
            const vaultAddr = step.vaultAddress as `0x${string}`;
            const userAddr = userAddress as `0x${string}`;

            const [vaultDecimals, maxWithdrawable] = await Promise.all([
              publicClient.readContract({
                address: vaultAddr,
                abi: erc4626Abi,
                functionName: "decimals",
              }),
              publicClient.readContract({
                address: vaultAddr,
                abi: erc4626Abi,
                functionName: "maxWithdraw",
                args: [userAddr],
              }),
            ]);

            // Compute desired withdraw amount, clamped to max available
            const desiredAssets = parseUnits(step.amount, vaultDecimals);
            const assets = desiredAssets > maxWithdrawable ? maxWithdrawable : desiredAssets;

            if (assets <= BigInt(0)) {
              updateStep(i, { phase: "failed", error: "Nothing to withdraw" });
              break;
            }

            updateStep(i, { phase: "signing" });

            const data = encodeFunctionData({
              abi: erc4626Abi,
              functionName: "withdraw",
              args: [assets, userAddr, userAddr],
            });

            const hash = await walletClient.sendTransaction({
              to: step.vaultAddress as `0x${string}`,
              data,
              chain: null,
              account: userAddress as `0x${string}`,
            });

            updateStep(i, { phase: "confirming", txHash: hash });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (receipt.status === "success") {
              updateStep(i, { phase: "confirmed", txHash: hash });
            } else {
              updateStep(i, { phase: "failed", txHash: hash, error: "Transaction reverted" });
              break;
            }
          } else {
            // --- LI.FI Composer deposit ---
            updateStep(i, { phase: "quoting" });

            const chainName = CHAIN_NAMES[step.chainId] || "eth";
            const usdcAddress = USDC_ADDRESSES[step.chainId];
            if (!usdcAddress) {
              updateStep(i, { phase: "failed", error: `Unsupported chain ${step.chainId}` });
              break;
            }

            const fromAmount = parseUnits(step.amount, 6).toString();

            const quoteRes = await fetch("/api/quote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fromChain: chainName,
                toChain: chainName,
                fromToken: usdcAddress,
                vaultAddress: step.vaultAddress,
                fromAmount,
                userAddress,
              }),
            });

            if (!quoteRes.ok) {
              const err = await quoteRes.json().catch(() => ({}));
              updateStep(i, {
                phase: "failed",
                error: err.error || `Quote failed (${quoteRes.status})`,
              });
              break;
            }

            const quote = await quoteRes.json();

            if (!quote.transactionRequest) {
              updateStep(i, { phase: "failed", error: "Vault not transactional" });
              break;
            }

            // --- Approval if needed ---
            if (quote.estimate?.approvalAddress) {
              updateStep(i, { phase: "approving" });

              const allowance = await publicClient.readContract({
                address: usdcAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "allowance",
                args: [
                  userAddress as `0x${string}`,
                  quote.estimate.approvalAddress as `0x${string}`,
                ],
              });

              if (allowance < BigInt(fromAmount)) {
                const approveData = encodeFunctionData({
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [
                    quote.estimate.approvalAddress as `0x${string}`,
                    maxUint256,
                  ],
                });

                const approveHash = await walletClient.sendTransaction({
                  to: usdcAddress as `0x${string}`,
                  data: approveData,
                  chain: null,
                  account: userAddress as `0x${string}`,
                });

                const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
                if (approveReceipt.status !== "success") {
                  updateStep(i, { phase: "failed", error: "Approval reverted" });
                  break;
                }
              }
            }

            // --- Send deposit tx ---
            updateStep(i, { phase: "signing" });

            const txReq = quote.transactionRequest;
            const hash = await walletClient.sendTransaction({
              to: txReq.to as `0x${string}`,
              data: txReq.data as `0x${string}`,
              value: txReq.value ? BigInt(txReq.value) : BigInt(0),
              gas: txReq.gasLimit ? BigInt(txReq.gasLimit) : undefined,
              chain: null,
              account: userAddress as `0x${string}`,
            });

            updateStep(i, { phase: "confirming", txHash: hash });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (receipt.status === "success") {
              updateStep(i, { phase: "confirmed", txHash: hash });
            } else {
              updateStep(i, { phase: "failed", txHash: hash, error: "Transaction reverted" });
              break;
            }
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          const shortMsg = message.includes("User rejected")
            ? "User rejected"
            : message.slice(0, 80);
          updateStep(i, { phase: "failed", error: shortMsg });
          break;
        }
      }

      setIsExecuting(false);
      executingRef.current = false;
    },
    [updateStep]
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    executingRef.current = false;
    setSteps([]);
    setIsExecuting(false);
  }, []);

  return { steps, isExecuting, execute, reset };
}
