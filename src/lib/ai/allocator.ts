import { query } from "@anthropic-ai/claude-agent-sdk";
import { morphoToolsServer } from "../mcp/morpho-server";
import { lifiToolsServer } from "../mcp/lifi-server";
import { agentDefinitions } from "./agents";
import { allocationOutputSchema } from "./schema";
import type { AllocationInput, AllocationOutput } from "@/types/allocation";

export async function analyzeAllocation(
  input: AllocationInput
): Promise<AllocationOutput> {
  const prompt = `You are MorphoClaude, an AI-powered DeFi fund allocator.

Analyze the user's current Morpho Vault allocation and recommend an optimal rebalancing strategy.

User Profile:
- Total Assets: ${input.userAmount} USDC
- Risk Profile: ${input.riskProfile}
- Current Allocation: ${JSON.stringify(input.currentAllocation, null, 2)}
- Current Gas Price: ${input.gasPriceGwei} Gwei

Instructions:
1. Use morpho-tools to fetch available USDC vaults and their allocations
2. Use lifi-tools to discover vaults and cross-reference data
3. Delegate risk analysis to the risk-analyzer subagent
4. Delegate yield optimization to the yield-optimizer subagent
5. Use gas-estimator to calculate transaction costs
6. Synthesize all results into a final allocation recommendation

Risk Profile Guidelines:
- Conservative: max 3 vaults, prefer low risk scores (1-3)
- Balanced: 3-5 vaults, mix of risk levels
- Aggressive: 5+ vaults, maximize APY, accept higher risk

Decision Rules:
- If break-even period > 180 days, recommend "hold"
- If APY increase < 0.1%, recommend "hold"
- Avoid > 50% allocation to any single vault
- Ensure cross-chain diversification when beneficial

IMPORTANT: For each vault in recommendedAllocation, include the vault's human-readable name in the "vaultName" field (e.g. "Gauntlet USDC Core", "Steakhouse USDC").

FORMAT for aiExplanation — use this exact structure with section headers and bullet points for readability:

STRATEGY OVERVIEW:
• One-line summary of the approach

SELECTED VAULTS:
• Vault Name (Chain) — why it was chosen, APY, risk score
• (repeat for each vault)

EXCLUDED VAULTS:
• Vault Name — why it was excluded (e.g. reward-dependent APY, high risk)

COST ANALYSIS:
• Total gas cost and break-even period
• Per-chain breakdown if relevant

DECISION:
• Final recommendation with key metrics (APY increase, break-even vs threshold)`;

  const q = query({
    prompt,
    options: {
      model: "claude-sonnet-4-6",
      maxTurns: 30,
      maxBudgetUsd: 2.0,
      thinking: { type: "adaptive" },
      mcpServers: {
        "morpho-tools": morphoToolsServer,
        "lifi-tools": lifiToolsServer,
      },
      agents: agentDefinitions,
      allowedTools: [
        "mcp__morpho-tools__fetch_usdc_vaults",
        "mcp__morpho-tools__fetch_vault_allocations",
        "mcp__morpho-tools__fetch_user_positions",
        "mcp__lifi-tools__discover_vaults",
        "mcp__lifi-tools__get_deposit_quote",
        "mcp__lifi-tools__get_user_positions",
        "Agent",
      ],
      outputFormat: {
        type: "json_schema",
        schema: allocationOutputSchema,
      },
      hooks: {
        PostToolUse: [
          {
            hooks: [
              async (event: Record<string, unknown>) => {
                console.log(`[Audit] Tool: ${event.tool_name}`, {
                  input: event.tool_input,
                  timestamp: new Date().toISOString(),
                });
                return {};
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              async (event: Record<string, unknown>) => {
                console.log("[Audit] Session complete", {
                  reason: event.stop_reason,
                  timestamp: new Date().toISOString(),
                });
                return {};
              },
            ],
          },
        ],
      },
    },
  });

  let result: AllocationOutput | null = null;

  for await (const message of q) {
    if (message.type === "result" && message.subtype === "success") {
      result = message.structured_output as AllocationOutput;
    }
  }

  if (!result) {
    throw new Error("AI analysis failed to produce a result");
  }

  return result;
}
