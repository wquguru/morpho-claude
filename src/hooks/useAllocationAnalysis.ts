"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AllocationOutput } from "@/types/allocation";

// ---------------------------------------------------------------------------
// Global singleton store — survives React component unmount / page navigation
// ---------------------------------------------------------------------------

interface AnalysisState {
  analysis: AllocationOutput | null;
  isAnalyzing: boolean;
  error: string | null;
  lastRiskProfile: "conservative" | "balanced" | "aggressive" | null;
  analyzedAt: number | null; // epoch ms
}

const STORAGE_KEY = "morphoclaude_analysis";

function loadFromStorage(): Partial<AnalysisState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      analysis: parsed.analysis ?? null,
      lastRiskProfile: parsed.lastRiskProfile ?? null,
      analyzedAt: parsed.analyzedAt ?? null,
    };
  } catch {
    return {};
  }
}

function saveToStorage(state: AnalysisState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        analysis: state.analysis,
        lastRiskProfile: state.lastRiskProfile,
        analyzedAt: state.analyzedAt,
      })
    );
  } catch {
    // quota exceeded — ignore
  }
}

const stored = loadFromStorage();

let globalState: AnalysisState = {
  analysis: stored.analysis ?? null,
  isAnalyzing: false,
  error: null,
  lastRiskProfile: stored.lastRiskProfile ?? null,
  analyzedAt: stored.analyzedAt ?? null,
};

// In-flight promise so we never fire two analyses at once
let inflightPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function setState(patch: Partial<AnalysisState>) {
  globalState = { ...globalState, ...patch };
  emit();
}

async function runAnalysis(
  riskProfile: "conservative" | "balanced" | "aggressive"
) {
  if (inflightPromise) return; // already running

  setState({ isAnalyzing: true, error: null, lastRiskProfile: riskProfile });

  inflightPromise = (async () => {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAmount: "10000",
          riskProfile,
          currentAllocation: [],
          gasPriceGwei: 30,
        }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed: ${res.statusText}`);
      }

      const result: AllocationOutput = await res.json();
      const now = Date.now();
      setState({ analysis: result, isAnalyzing: false, analyzedAt: now });
      saveToStorage({ ...globalState, analysis: result, analyzedAt: now });
    } catch (err) {
      setState({
        error: err instanceof Error ? err.message : "Analysis failed",
        isAnalyzing: false,
      });
    } finally {
      inflightPromise = null;
    }
  })();
}

// ---------------------------------------------------------------------------
// React hook — subscribes to the global store
// ---------------------------------------------------------------------------

function getSnapshot(): AnalysisState {
  return globalState;
}

function getServerSnapshot(): AnalysisState {
  return {
    analysis: null,
    isAnalyzing: false,
    error: null,
    lastRiskProfile: null,
    analyzedAt: null,
  };
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useAllocationAnalysis() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const analyze = useCallback(
    (riskProfile: "conservative" | "balanced" | "aggressive") => {
      runAnalysis(riskProfile);
    },
    []
  );

  return {
    analysis: state.analysis,
    isAnalyzing: state.isAnalyzing,
    error: state.error,
    lastRiskProfile: state.lastRiskProfile,
    analyzedAt: state.analyzedAt,
    analyze,
  };
}
