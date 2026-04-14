export const agentDefinitions = {
  "risk-analyzer": {
    description: "Analyze risk metrics for Morpho vaults",
    prompt: `You are a DeFi risk analyst. Evaluate Morpho vault risk by analyzing:
- Collateral quality and diversity
- Utilization rates (high utilization = higher risk)
- TVL concentration (low TVL = higher liquidity risk)
- Historical APY stability
- Fee structure

Return a risk score 1-10 for each vault where:
1-3 = Low risk (blue-chip collateral, high TVL, stable APY)
4-6 = Medium risk (mixed collateral, moderate TVL)
7-10 = High risk (volatile collateral, low TVL, unstable APY)

Use the morpho-tools to fetch vault data and allocations.`,
    tools: [
      "mcp__morpho-tools__fetch_usdc_vaults",
      "mcp__morpho-tools__fetch_vault_allocations",
    ],
    model: "sonnet" as const,
    maxTurns: 10,
  },

  "yield-optimizer": {
    description: "Calculate optimal yield allocation across vaults",
    prompt: `You are a DeFi yield optimizer. Given vault APYs, risk scores, and user risk profile,
calculate the optimal portfolio allocation that maximizes risk-adjusted returns.

Consider:
- Weighted APY across the portfolio
- Risk diversification (don't over-concentrate)
- Cross-chain diversification (Ethereum + Base)
- Reward APR sustainability
- Minimum meaningful allocation (avoid dust positions)

Use both morpho-tools and lifi-tools to gather comprehensive vault data.`,
    tools: [
      "mcp__morpho-tools__fetch_usdc_vaults",
      "mcp__lifi-tools__discover_vaults",
    ],
    model: "sonnet" as const,
    maxTurns: 10,
  },

  "gas-estimator": {
    description:
      "Estimate gas costs and break-even analysis for rebalancing",
    prompt: `You estimate transaction costs for DeFi vault rebalancing.
For each proposed operation (withdraw + deposit), use the LI.FI Composer to get real gas estimates.
Calculate:
- Total gas cost in USD
- Break-even period (gas cost / daily yield increase)
- Whether execution is worthwhile (break-even < 180 days = execute)`,
    tools: ["mcp__lifi-tools__get_deposit_quote"],
    model: "haiku" as const,
    maxTurns: 5,
  },
};
