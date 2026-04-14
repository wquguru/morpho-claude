"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReallocationStep } from "@/lib/executor/reallocate";

interface StepStatus {
  step: ReallocationStep;
  status: "pending" | "signing" | "confirmed" | "failed";
  txHash?: string;
}

export function ExecutionPanel() {
  const [steps] = useState<StepStatus[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    // Execution logic will use wagmi's useWriteContract
    // For now, this is a placeholder
    setTimeout(() => setIsExecuting(false), 2000);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Execution Panel</CardTitle>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Run AI analysis first to generate reallocation steps</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <span className="font-medium capitalize">{s.step.type}</span>
                  <span className="text-muted-foreground ml-2">
                    {s.step.amount} USDC
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {s.step.vaultAddress.slice(0, 6)}...
                    {s.step.vaultAddress.slice(-4)}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    s.status === "confirmed"
                      ? "text-green-600"
                      : s.status === "failed"
                        ? "text-red-600"
                        : s.status === "signing"
                          ? "text-yellow-600"
                          : "text-muted-foreground"
                  }`}
                >
                  {s.status === "confirmed"
                    ? "Confirmed"
                    : s.status === "failed"
                      ? "Failed"
                      : s.status === "signing"
                        ? "Awaiting signature..."
                        : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleExecute}
          disabled={isExecuting || steps.length === 0}
          className="w-full mt-4"
        >
          {isExecuting ? "Executing..." : "Execute Reallocation"}
        </Button>
      </CardContent>
    </Card>
  );
}
