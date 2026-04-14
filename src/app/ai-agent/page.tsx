"use client";

import { AIRecommendation } from "@/components/AIRecommendation";
import { ExecutionPanel } from "@/components/ExecutionPanel";

export default function AIAgentPage() {
  return (
    <main className="max-w-[1200px] mx-auto px-6 pt-24 pb-12 space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white text-glow">AI Agent</h1>
        <p className="text-sm text-white/45">
          AI-powered portfolio analysis and execution
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AIRecommendation />
        <ExecutionPanel />
      </div>
    </main>
  );
}
