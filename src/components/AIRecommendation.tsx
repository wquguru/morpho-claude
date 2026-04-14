"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllocationAnalysis } from "@/hooks/useAllocationAnalysis";

function FormattedExplanation({ text }: { text: string }) {
  // Split into paragraphs/sections by double newlines or section headers
  const lines = text.split(/\n/).filter((l) => l.trim());

  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Section headers (ALL CAPS with colon, or ending with colon)
        if (/^[A-Z][A-Z\s]+:/.test(trimmed) || /^[A-Z][A-Z\s/()]+[:.—]/.test(trimmed)) {
          return (
            <h4 key={i} className="font-semibold text-foreground pt-2 first:pt-0">
              {trimmed}
            </h4>
          );
        }

        // Bullet points (• or -)
        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          return (
            <p key={i} className="pl-3">
              {trimmed}
            </p>
          );
        }

        // Decision/conclusion lines (DECISION:, EXECUTE, HOLD)
        if (/^DECISION:/i.test(trimmed)) {
          return (
            <p key={i} className="font-semibold text-foreground pt-2">
              {trimmed}
            </p>
          );
        }

        // Regular paragraph
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">AI Recommendation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Profile Selector */}
        <div className="flex gap-2">
          {(["conservative", "balanced", "aggressive"] as const).map(
            (profile) => (
              <Button
                key={profile}
                variant={riskProfile === profile ? "default" : "outline"}
                onClick={() => setRiskProfile(profile)}
                size="sm"
                className="capitalize"
              >
                {profile}
              </Button>
            )
          )}
        </div>

        {/* Analyze Button */}
        <Button
          onClick={() => analyze(riskProfile)}
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? "Analyzing..." : "AI Analyze Optimal Allocation"}
        </Button>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-4 text-sm">
            {/* Recommendation Badge — top prominence */}
            <div className="text-center">
              {analysis.recommendation === "execute" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-1.5 text-green-700 font-semibold dark:bg-green-900/30 dark:text-green-400">
                  ✓ Execute Rebalance
                </span>
              )}
              {analysis.recommendation === "hold" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-4 py-1.5 text-yellow-700 font-semibold dark:bg-yellow-900/30 dark:text-yellow-400">
                  ⏸ Hold Position
                </span>
              )}
              {analysis.recommendation === "review" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-400">
                  ⚡ Review Needed
                </span>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">APY Increase</p>
                <p className="text-lg font-bold text-green-600">
                  +{analysis.expectedApyIncrease.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Risk Change</p>
                <p
                  className={`text-lg font-bold ${analysis.riskScoreChange < 0 ? "text-green-600" : "text-amber-600"}`}
                >
                  {analysis.riskScoreChange > 0 ? "+" : ""}
                  {analysis.riskScoreChange.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Gas Cost</p>
                <p className="text-lg font-bold">
                  ${analysis.estimatedGasCost.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Break-even</p>
                <p className="text-lg font-bold">{analysis.breakEvenDays}d</p>
              </div>
            </div>

            {/* AI Explanation — formatted */}
            <div className="rounded-lg bg-muted p-4">
              <FormattedExplanation text={analysis.aiExplanation} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
