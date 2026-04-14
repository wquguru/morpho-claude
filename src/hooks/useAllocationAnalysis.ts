"use client";

import { useState } from "react";
import type { AllocationOutput } from "@/types/allocation";

export function useAllocationAnalysis() {
  const [analysis, setAnalysis] = useState<AllocationOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(
    riskProfile: "conservative" | "balanced" | "aggressive"
  ) {
    setIsAnalyzing(true);
    setError(null);
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

      const result = await res.json();
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return { analysis, isAnalyzing, error, analyze };
}
