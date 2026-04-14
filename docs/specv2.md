# MorphoClaude - Technical Implementation Spec v2

## 1. Project Overview

**MorphoClaude** is an AI-driven DeFi yield optimization tool that simulates the capabilities of professional Allocators (like Gauntlet), providing institutional-grade Morpho Vault reallocation services to everyday users.

### Core Value Proposition

- **AI-Automated Decision Making**: Replaces manual optimization workflows with Claude Agent SDK-powered analysis
- **Multi-Dimensional Analysis**: Comprehensive evaluation of APY, risk, liquidity, and gas costs
- **One-Click Execution**: Atomic cross-vault reallocation via LI.FI Earn API + Composer
- **Continuous Monitoring**: 24/7 market surveillance with automatic rebalance triggers

### Hackathon Alignment

**Target**: DeFi Mullet Hackathon #1 — **AI x Earn Track**

| Judging Criteria | Weight | How MorphoClaude Scores |
| --- | --- | --- |
| **API Integration** | 35% | Deep LI.FI Earn + Composer integration with MCP tools, pagination, null handling |
| **Innovation** | 25% | Claude Agent SDK with multi-agent architecture, structured output, MCP tool layer |
| **Product Completeness** | 20% | Full-stack: data layer, AI engine, execution, dashboard UI |
| **Presentation** | 20% | Interactive demo with real-time AI analysis animation, audit trail |

---

## 2. Technical Architecture

### System Architecture Diagram

```
User Wallet
    |
Frontend Dashboard (Next.js 16.1.1 + shadcn/ui + Tailwind)
    |
Backend API (Next.js API Routes)
    |--- Claude Agent SDK Orchestrator
    |       |--- MCP Server: morpho-tools
    |       |       |--- fetch_usdc_vaults
    |       |       |--- fetch_vault_allocations
    |       |       |--- fetch_user_positions
    |       |--- MCP Server: lifi-tools
    |       |       |--- discover_vaults
    |       |       |--- get_deposit_quote
    |       |       |--- get_user_positions
    |       |--- Subagent: risk-analyzer
    |       |--- Subagent: yield-optimizer
    |       |--- Subagent: gas-estimator
    |       |--- Structured Output (AllocationOutput schema)
    |--- Hooks: Audit Logging
    |
Blockchain (Ethereum / Base)
```

### Core Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | Next.js 16.1.1 + TypeScript | React framework (App Router, async params, Turbopack) |
| | React 19.2.3 | UI runtime (View Transitions, React Compiler) |
| | shadcn/ui + Tailwind CSS | UI component library |
| | recharts | Data visualization |
| | wagmi + viem | Wallet connection + blockchain interaction |
| **Backend** | Next.js API Routes | API service |
| | @morpho-org/blue-api-sdk | Morpho data fetching |
| | @apollo/client | GraphQL client |
| **AI Layer** | @anthropic-ai/claude-agent-sdk@0.2.101 | Agent orchestration engine |
| | zod ^4.0.0 | Schema validation (SDK peer dep) |
| | MCP Servers (in-process) | Tool layer for data access |
| **Execution** | LI.FI Earn API (`earn.li.fi`) | Vault discovery, portfolio tracking |
| | LI.FI Composer (`li.quest`) | Transaction execution (GET-based quotes) |
| **Blockchain** | viem | Contract interaction, encoding, parsing |

### Architecture Decisions

**Why Claude Agent SDK over direct API?**
- MCP tools enable on-demand data fetching (vs. stuffing all data into prompts)
- Structured output guarantees valid JSON (vs. fragile regex extraction)
- Subagents enable parallel risk + yield analysis
- Built-in safety: `maxTurns`, `maxBudgetUsd`, permission system
- Hooks provide audit trail for DeFi compliance

**Why MCP tools over prompt injection?**
- Token-efficient: agent fetches only what it needs
- Testable: each tool is independently unit-testable
- Composable: tools can be shared across agents/subagents
- Type-safe: Zod schemas with `.describe()` for every parameter

**Why structured output over regex parsing?**
- SDK validates output against JSON schema automatically
- Retries on validation failure (up to limit)
- Eliminates entire class of parsing bugs
- Contract between AI layer and execution layer is explicit

---

## 3. Data Layer

### 3.1 Morpho GraphQL API Integration

**API Endpoint**: `https://api.morpho.org/graphql`

#### Get All USDC Vaults (Ethereum + Base)

```graphql
query GetUSDCVaults($chainIds: [Int!]!, $usdcAddresses: [String!]!) {
  vaultV2s(
    first: 100
    where: {
      chainId_in: $chainIds
      asset: { address_in: $usdcAddresses }
    }
  ) {
    items {
      address
      name
      symbol
      chain { id network }
      asset { address symbol decimals }
      state {
        apy
        totalAssets
        totalSupply
        fee
      }
      rewards {
        asset { address symbol }
        supplyApr
      }
    }
  }
}
```

#### Get Vault Allocations

```graphql
query GetVaultAllocations($vaultAddress: String!, $chainId: Int!) {
  vaultV2ByAddress(address: $vaultAddress, chainId: $chainId) {
    address
    name
    state {
      allocation {
        market {
          uniqueKey
          loanAsset { symbol }
          collateralAsset { symbol }
          state {
            supplyApy
            utilization
            borrowAssets
            supplyAssets
          }
        }
        supplyAssets
        supplyAssetsUsd
        supplyShares
      }
    }
  }
}
```

#### Get User Positions

```graphql
query GetUserPositions($userAddress: String!, $chainId: Int!) {
  userByAddress(address: $userAddress, chainId: $chainId) {
    address
    vaultV2Positions {
      vault { address name symbol }
      assets
      assetsUsd
      shares
      pnl
      pnlUsd
      roe
    }
  }
}
```

#### SDK Integration

```typescript
// lib/morpho/client.ts
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const MORPHO_API_URL = 'https://api.morpho.org/graphql';

export const morphoClient = new ApolloClient({
  uri: MORPHO_API_URL,
  cache: new InMemoryCache(),
});
```

```typescript
// lib/morpho/queries.ts
import { gql } from '@apollo/client';

export const GET_USDC_VAULTS = gql`
  query GetUSDCVaults($chainIds: [Int!]!, $usdcAddresses: [String!]!) {
    vaultV2s(
      first: 100
      where: {
        chainId_in: $chainIds
        asset: { address_in: $usdcAddresses }
      }
    ) {
      items {
        address
        name
        symbol
        chain { id network }
        asset { address symbol decimals }
        state { apy totalAssets totalSupply fee }
        rewards { asset { address symbol } supplyApr }
      }
    }
  }
`;

export const GET_USER_POSITIONS = gql`
  query GetUserPositions($userAddress: String!, $chainId: Int!) {
    userByAddress(address: $userAddress, chainId: $chainId) {
      address
      vaultV2Positions {
        vault { address name symbol }
        assets assetsUsd shares pnl pnlUsd roe
      }
    }
  }
`;

export const GET_VAULT_ALLOCATIONS = gql`
  query GetVaultAllocations($vaultAddress: String!, $chainId: Int!) {
    vaultV2ByAddress(address: $vaultAddress, chainId: $chainId) {
      address
      name
      state {
        allocation {
          market {
            uniqueKey
            loanAsset { symbol }
            collateralAsset { symbol }
            state { supplyApy utilization borrowAssets supplyAssets }
          }
          supplyAssets supplyAssetsUsd supplyShares
        }
      }
    }
  }
`;
```

```typescript
// lib/morpho/api.ts
import { morphoClient } from './client';
import { GET_USDC_VAULTS, GET_USER_POSITIONS } from './queries';

export interface VaultData {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  chainName: string;
  apy: number;
  totalApy: number;
  totalAssets: string;
  totalAssetsUsd: number;
  rewardsApr: number;
  riskScore: number;
}

export async function fetchUSDCVaults(): Promise<VaultData[]> {
  const { data } = await morphoClient.query({
    query: GET_USDC_VAULTS,
    variables: {
      chainIds: [1, 8453],
      usdcAddresses: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
      ],
    },
  });

  return data.vaultV2s.items.map((vault: any) => {
    const baseApy = vault.state.apy ?? 0;
    const rewardsApr = vault.rewards.reduce(
      (sum: number, r: any) => sum + (r.supplyApr ?? 0),
      0
    );

    return {
      address: vault.address,
      name: vault.name,
      symbol: vault.symbol,
      chainId: vault.chain.id,
      chainName: vault.chain.network,
      apy: baseApy,
      totalApy: baseApy + rewardsApr,
      totalAssets: vault.state.totalAssets,
      totalAssetsUsd: 0, // Calculated via price feed
      rewardsApr,
      riskScore: 0, // Calculated by AI risk-analyzer
    };
  });
}
```

### 3.2 LI.FI Earn Data API (Corrected)

**Base URL**: `https://earn.li.fi` (No authentication required, 100 req/min)

> IMPORTANT: Use `earn.li.fi` for data, NOT `li.quest`. These are different services.

#### Discover Vaults

```bash
GET https://earn.li.fi/v1/earn/vaults
  ?chains=eth,base
  &protocols=morpho
  &tokens=USDC
  &sort=apy
  &order=desc
```

**Critical Notes**:
- Endpoint is `/v1/earn/vaults` (NOT `/v1/vaults`)
- Use `nextCursor` for pagination (672+ vaults total)
- `apy.reward` can be `null` — default to 0
- `analytics.tvl.usd` is a **string** — must `parseFloat()`
- Check `isTransactional === true` before building deposit quotes

#### Get User Positions

```bash
GET https://earn.li.fi/v1/earn/portfolio/{userAddress}/positions
  ?chains=eth,base
  &protocols=morpho
```

**Note**: Endpoint is `/v1/earn/portfolio/{addr}/positions` (NOT `/v1/portfolio/{addr}`)

### 3.3 LI.FI Composer API (Corrected)

**Base URL**: `https://li.quest` (Requires API key from `portal.li.fi`)

> IMPORTANT: `/v1/quote` is a **GET** request, NOT POST.

#### Get Deposit Quote

```bash
GET https://li.quest/v1/quote
  ?fromChain=eth
  &toChain=eth
  &fromToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
  &toToken={vault_address}
  &fromAmount=1000000000
  &fromAddress={user_address}
```

**Critical Notes**:
- `toToken` = the vault's address (vault address IS the LP token for Morpho)
- Must include `x-lifi-api-key` header
- Response includes `transactionRequest` ready to sign

```typescript
// lib/lifi/earn-client.ts
const EARN_API = 'https://earn.li.fi';
const COMPOSER_API = 'https://li.quest';

export interface EarnVault {
  address: string;
  protocol: string;
  chain: string;
  name: string;
  apy: {
    base: number | null;
    reward: number | null;
    total: number | null;
  };
  tvl: string; // NOTE: string, must parseFloat
  isTransactional: boolean;
  underlyingTokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

// Fetch all vaults with pagination
export async function fetchAllVaults(
  chains: string = 'eth,base',
  tokens: string = 'USDC'
): Promise<EarnVault[]> {
  const allVaults: EarnVault[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${EARN_API}/v1/earn/vaults`);
    url.searchParams.set('chains', chains);
    url.searchParams.set('protocols', 'morpho');
    url.searchParams.set('tokens', tokens);
    url.searchParams.set('sort', 'apy');
    url.searchParams.set('order', 'desc');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString());
    const data = await res.json();

    allVaults.push(...data.vaults);
    cursor = data.nextCursor ?? undefined;
  } while (cursor);

  return allVaults;
}

// Get deposit quote (GET, not POST!)
export async function getDepositQuote(
  fromChain: string,
  toChain: string,
  fromToken: string,
  vaultAddress: string, // vault address = toToken
  fromAmount: string,
  userAddress: string
) {
  const url = new URL(`${COMPOSER_API}/v1/quote`);
  url.searchParams.set('fromChain', fromChain);
  url.searchParams.set('toChain', toChain);
  url.searchParams.set('fromToken', fromToken);
  url.searchParams.set('toToken', vaultAddress);
  url.searchParams.set('fromAmount', fromAmount);
  url.searchParams.set('fromAddress', userAddress);

  const res = await fetch(url.toString(), {
    headers: {
      'x-lifi-api-key': process.env.LIFI_API_KEY!,
    },
  });

  return res.json();
}

// Get user portfolio positions
export async function getUserPositions(
  userAddress: string,
  chains: string = 'eth,base'
) {
  const url = new URL(`${EARN_API}/v1/earn/portfolio/${userAddress}/positions`);
  url.searchParams.set('chains', chains);
  url.searchParams.set('protocols', 'morpho');

  const res = await fetch(url.toString());
  return res.json();
}
```

---

## 4. AI Decision Engine (Claude Agent SDK)

### 4.1 Decision Data Types

```typescript
// types/allocation.ts
export interface AllocationInput {
  userAmount: string;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  currentAllocation: {
    vaultAddress: string;
    chainId: number;
    amount: string;
    percentage: number;
  }[];
  gasPriceGwei: number;
}

export interface AllocationOutput {
  recommendedAllocation: {
    vaultAddress: string;
    chainId: number;
    percentage: number;
    amount: string;
    reason: string;
  }[];
  expectedApyIncrease: number;
  riskScoreChange: number;
  estimatedGasCost: number;
  breakEvenDays: number;
  recommendation: 'execute' | 'hold' | 'review';
  aiExplanation: string;
}
```

### 4.2 MCP Server Definitions

#### Morpho Tools MCP Server

```typescript
// lib/mcp/morpho-server.ts
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { fetchUSDCVaults } from '../morpho/api';
import { morphoClient } from '../morpho/client';
import { GET_VAULT_ALLOCATIONS, GET_USER_POSITIONS } from '../morpho/queries';

export const morphoToolsServer = createSdkMcpServer({
  name: 'morpho-tools',
  version: '1.0.0',
  tools: [
    tool(
      'fetch_usdc_vaults',
      'Fetch all USDC-denominated Morpho vaults on Ethereum and Base with APY and TVL data',
      {},
      async () => {
        const vaults = await fetchUSDCVaults();
        return {
          content: [{ type: 'text', text: JSON.stringify(vaults, null, 2) }],
        };
      },
      { annotations: { readOnly: true } }
    ),

    tool(
      'fetch_vault_allocations',
      'Get the underlying market allocations for a specific Morpho vault',
      {
        vaultAddress: z.string().describe('The vault contract address'),
        chainId: z.number().describe('Chain ID (1 = Ethereum, 8453 = Base)'),
      },
      async (args) => {
        const { data } = await morphoClient.query({
          query: GET_VAULT_ALLOCATIONS,
          variables: {
            vaultAddress: args.vaultAddress,
            chainId: args.chainId,
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      },
      { annotations: { readOnly: true } }
    ),

    tool(
      'fetch_user_positions',
      'Get user vault positions on a specific chain',
      {
        userAddress: z.string().describe('User wallet address'),
        chainId: z.number().describe('Chain ID (1 = Ethereum, 8453 = Base)'),
      },
      async (args) => {
        const { data } = await morphoClient.query({
          query: GET_USER_POSITIONS,
          variables: {
            userAddress: args.userAddress,
            chainId: args.chainId,
          },
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      },
      { annotations: { readOnly: true } }
    ),
  ],
});
```

#### LI.FI Tools MCP Server

```typescript
// lib/mcp/lifi-server.ts
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const EARN_API = 'https://earn.li.fi';
const COMPOSER_API = 'https://li.quest';

export const lifiToolsServer = createSdkMcpServer({
  name: 'lifi-tools',
  version: '1.0.0',
  tools: [
    tool(
      'discover_vaults',
      'Discover Morpho vaults from LI.FI Earn API with filtering and pagination',
      {
        chains: z.string().optional().describe("Comma-separated chain identifiers, e.g. 'eth,base'"),
        tokens: z.string().optional().describe("Token symbol filter, e.g. 'USDC'"),
        sort: z.enum(['apy', 'tvl']).optional().describe('Sort field'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
      },
      async (args) => {
        const url = new URL(`${EARN_API}/v1/earn/vaults`);
        url.searchParams.set('protocols', 'morpho');
        if (args.chains) url.searchParams.set('chains', args.chains);
        if (args.tokens) url.searchParams.set('tokens', args.tokens);
        if (args.sort) url.searchParams.set('sort', args.sort);
        if (args.cursor) url.searchParams.set('cursor', args.cursor);

        const res = await fetch(url.toString());
        const data = await res.json();

        // Normalize: parse TVL strings, handle null APY
        const vaults = data.vaults.map((v: any) => ({
          ...v,
          tvl: v.tvl ? parseFloat(v.tvl) : 0,
          apy: {
            base: v.apy?.base ?? 0,
            reward: v.apy?.reward ?? 0,
            total: v.apy?.total ?? 0,
          },
          isTransactional: v.isTransactional ?? false,
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ vaults, nextCursor: data.nextCursor ?? null }),
          }],
        };
      },
      { annotations: { readOnly: true } }
    ),

    tool(
      'get_deposit_quote',
      'Get a deposit quote from LI.FI Composer for a vault deposit transaction (GET request)',
      {
        fromChain: z.string().describe("Source chain, e.g. 'eth' or 'base'"),
        toChain: z.string().describe("Destination chain, e.g. 'eth' or 'base'"),
        fromToken: z.string().describe('Source token address (e.g. USDC address)'),
        vaultAddress: z.string().describe('Target vault address (used as toToken)'),
        fromAmount: z.string().describe('Amount in smallest unit (e.g. 1000000 for 1 USDC)'),
        userAddress: z.string().describe('User wallet address'),
      },
      async (args) => {
        const url = new URL(`${COMPOSER_API}/v1/quote`);
        url.searchParams.set('fromChain', args.fromChain);
        url.searchParams.set('toChain', args.toChain);
        url.searchParams.set('fromToken', args.fromToken);
        url.searchParams.set('toToken', args.vaultAddress);
        url.searchParams.set('fromAmount', args.fromAmount);
        url.searchParams.set('fromAddress', args.userAddress);

        const res = await fetch(url.toString(), {
          headers: {
            'x-lifi-api-key': process.env.LIFI_API_KEY!,
          },
        });

        const quote = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(quote, null, 2) }],
        };
      },
      { annotations: { readOnly: false } }
    ),

    tool(
      'get_user_positions',
      'Get user DeFi positions from LI.FI Earn portfolio API',
      {
        userAddress: z.string().describe('User wallet address'),
        chains: z.string().optional().describe("Comma-separated chains, e.g. 'eth,base'"),
      },
      async (args) => {
        const url = new URL(`${EARN_API}/v1/earn/portfolio/${args.userAddress}/positions`);
        if (args.chains) url.searchParams.set('chains', args.chains);
        url.searchParams.set('protocols', 'morpho');

        const res = await fetch(url.toString());
        const data = await res.json();

        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      },
      { annotations: { readOnly: true } }
    ),
  ],
});
```

### 4.3 Subagent Architecture

```typescript
// lib/ai/agents.ts

export const agentDefinitions = {
  'risk-analyzer': {
    description: 'Analyze risk metrics for Morpho vaults',
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
      'mcp__morpho-tools__fetch_usdc_vaults',
      'mcp__morpho-tools__fetch_vault_allocations',
    ],
    model: 'sonnet' as const,
    maxTurns: 10,
  },

  'yield-optimizer': {
    description: 'Calculate optimal yield allocation across vaults',
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
      'mcp__morpho-tools__fetch_usdc_vaults',
      'mcp__lifi-tools__discover_vaults',
    ],
    model: 'sonnet' as const,
    maxTurns: 10,
  },

  'gas-estimator': {
    description: 'Estimate gas costs and break-even analysis for rebalancing',
    prompt: `You estimate transaction costs for DeFi vault rebalancing.
For each proposed operation (withdraw + deposit), use the LI.FI Composer to get real gas estimates.
Calculate:
- Total gas cost in USD
- Break-even period (gas cost / daily yield increase)
- Whether execution is worthwhile (break-even < 180 days = execute)`,
    tools: [
      'mcp__lifi-tools__get_deposit_quote',
    ],
    model: 'haiku' as const,
    maxTurns: 5,
  },
};
```

### 4.4 Structured Output Schema

```typescript
// lib/ai/schema.ts

export const allocationOutputSchema = {
  type: 'object' as const,
  properties: {
    recommendedAllocation: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          vaultAddress: { type: 'string' as const },
          chainId: { type: 'number' as const },
          percentage: { type: 'number' as const },
          amount: { type: 'string' as const },
          reason: { type: 'string' as const },
        },
        required: ['vaultAddress', 'chainId', 'percentage', 'amount', 'reason'],
      },
    },
    expectedApyIncrease: { type: 'number' as const },
    riskScoreChange: { type: 'number' as const },
    estimatedGasCost: { type: 'number' as const },
    breakEvenDays: { type: 'number' as const },
    recommendation: {
      type: 'string' as const,
      enum: ['execute', 'hold', 'review'],
    },
    aiExplanation: { type: 'string' as const },
  },
  required: [
    'recommendedAllocation',
    'expectedApyIncrease',
    'riskScoreChange',
    'estimatedGasCost',
    'breakEvenDays',
    'recommendation',
    'aiExplanation',
  ],
};
```

### 4.5 Orchestrator Implementation

```typescript
// lib/ai/allocator.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { morphoToolsServer } from '../mcp/morpho-server';
import { lifiToolsServer } from '../mcp/lifi-server';
import { agentDefinitions } from './agents';
import { allocationOutputSchema } from './schema';
import type { AllocationInput, AllocationOutput } from '../../types/allocation';

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
- Ensure cross-chain diversification when beneficial`;

  const q = query({
    prompt,
    options: {
      model: 'claude-sonnet-4-6',
      maxTurns: 30,
      maxBudgetUsd: 2.0,
      thinking: { type: 'adaptive' },
      mcpServers: {
        'morpho-tools': morphoToolsServer,
        'lifi-tools': lifiToolsServer,
      },
      agents: agentDefinitions,
      allowedTools: [
        'mcp__morpho-tools__fetch_usdc_vaults',
        'mcp__morpho-tools__fetch_vault_allocations',
        'mcp__morpho-tools__fetch_user_positions',
        'mcp__lifi-tools__discover_vaults',
        'mcp__lifi-tools__get_deposit_quote',
        'mcp__lifi-tools__get_user_positions',
        'Agent',
      ],
      outputFormat: {
        type: 'json_schema',
        schema: allocationOutputSchema,
      },
      hooks: {
        PostToolUse: [{
          hooks: [async (event) => {
            console.log(`[Audit] Tool: ${event.tool_name}`, {
              input: event.tool_input,
              timestamp: new Date().toISOString(),
            });
            return {};
          }],
        }],
        Stop: [{
          hooks: [async (event) => {
            console.log('[Audit] Session complete', {
              reason: event.stop_reason,
              timestamp: new Date().toISOString(),
            });
            return {};
          }],
        }],
      },
    },
  });

  let result: AllocationOutput | null = null;

  for await (const message of q) {
    if (message.type === 'result' && message.subtype === 'success') {
      result = message.structured_output as AllocationOutput;
    }
  }

  if (!result) {
    throw new Error('AI analysis failed to produce a result');
  }

  return result;
}
```

### 4.6 API Route

```typescript
// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { analyzeAllocation } from '@/lib/ai/allocator';
import type { AllocationInput } from '@/types/allocation';

export async function POST(request: NextRequest) {
  const body: AllocationInput = await request.json();

  try {
    const result = await analyzeAllocation(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
```

---

## 5. Execution Layer

### 5.1 Reallocation Flow (viem)

```typescript
// lib/executor/reallocate.ts
import { encodeFunctionData, parseUnits, parseAbi } from 'viem';
import { getDepositQuote } from '../lifi/earn-client';

export interface ReallocationStep {
  type: 'withdraw' | 'deposit';
  vaultAddress: string;
  chainId: number;
  amount: string;
  txData: {
    to: string;
    data: string;
    value?: string;
    gasLimit?: string;
  };
}

const erc4626Abi = parseAbi([
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
]);

export async function prepareReallocation(
  userAddress: string,
  currentAllocation: { vaultAddress: string; chainId: number; amount: string }[],
  targetAllocation: { vaultAddress: string; chainId: number; amount: string }[]
): Promise<ReallocationStep[]> {
  const steps: ReallocationStep[] = [];

  // 1. Withdraw steps (direct ERC-4626 redeem)
  for (const current of currentAllocation) {
    const target = targetAllocation.find(
      (t) => t.vaultAddress === current.vaultAddress
    );
    const targetAmount = target ? parseFloat(target.amount) : 0;
    const withdrawAmount = parseFloat(current.amount) - targetAmount;

    if (withdrawAmount > 0) {
      const data = encodeFunctionData({
        abi: erc4626Abi,
        functionName: 'redeem',
        args: [
          parseUnits(withdrawAmount.toString(), 18),
          userAddress as `0x${string}`,
          userAddress as `0x${string}`,
        ],
      });

      steps.push({
        type: 'withdraw',
        vaultAddress: current.vaultAddress,
        chainId: current.chainId,
        amount: withdrawAmount.toString(),
        txData: { to: current.vaultAddress, data },
      });
    }
  }

  // 2. Deposit steps (via LI.FI Composer)
  for (const target of targetAllocation) {
    const current = currentAllocation.find(
      (c) => c.vaultAddress === target.vaultAddress
    );
    const currentAmount = current ? parseFloat(current.amount) : 0;
    const depositAmount = parseFloat(target.amount) - currentAmount;

    if (depositAmount > 0) {
      const chainName = target.chainId === 1 ? 'eth' : 'base';
      const usdcAddress =
        target.chainId === 1
          ? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
          : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

      const quote = await getDepositQuote(
        chainName,
        chainName,
        usdcAddress,
        target.vaultAddress,
        parseUnits(depositAmount.toString(), 6).toString(),
        userAddress
      );

      steps.push({
        type: 'deposit',
        vaultAddress: target.vaultAddress,
        chainId: target.chainId,
        amount: depositAmount.toString(),
        txData: quote.transactionRequest,
      });
    }
  }

  return steps;
}
```

---

## 6. Frontend (Next.js 16.1.1)

### 6.1 Project Setup

```bash
# Create Next.js 16 project
npx create-next-app@16.1.1 morpho-claude --typescript --tailwind --app

cd morpho-claude

# Install core dependencies
npm install @anthropic-ai/claude-agent-sdk@0.2.101 zod@^4
npm install @apollo/client graphql @morpho-org/blue-api-sdk
npm install wagmi viem @tanstack/react-query
npm install recharts

# Initialize shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input table dialog select toast
```

### 6.2 Next.js 16 Patterns

#### Root Layout

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MorphoClaude - AI DeFi Yield Optimizer',
  description: 'AI-powered Morpho Vault allocation optimization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.className)}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
```

#### Vault Detail Page (Async Params)

```typescript
// app/vault/[address]/page.tsx
export default async function VaultPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params; // Next.js 16: params is async

  return (
    <div className="container mx-auto p-6">
      <h1>Vault: {address}</h1>
      {/* Vault details */}
    </div>
  );
}
```

#### Cached Server Component

```typescript
// components/VaultListServer.tsx
'use cache'

import { fetchUSDCVaults } from '@/lib/morpho/api';

export async function VaultListServer() {
  const vaults = await fetchUSDCVaults();

  return (
    <div>
      {vaults.map((vault) => (
        <div key={vault.address}>
          <span>{vault.name}</span>
          <span>{vault.totalApy.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}
```

#### Proxy (replaces middleware.ts)

```typescript
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // API route protection
  if (request.nextUrl.pathname.startsWith('/api/analyze')) {
    const origin = request.headers.get('origin');
    if (origin && !origin.includes('localhost')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### 6.3 Dashboard Layout

```typescript
// app/page.tsx
import { VaultOverview } from '@/components/VaultOverview';
import { AllocationChart } from '@/components/AllocationChart';
import { AIRecommendation } from '@/components/AIRecommendation';
import { MarketList } from '@/components/MarketList';
import { ExecutionPanel } from '@/components/ExecutionPanel';

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      {/* Top: Overview */}
      <VaultOverview />

      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Left: Current Allocation */}
        <div className="col-span-1">
          <AllocationChart type="current" />
        </div>

        {/* Center: AI Recommendation */}
        <div className="col-span-1">
          <AIRecommendation />
        </div>

        {/* Right: Recommended Allocation */}
        <div className="col-span-1">
          <AllocationChart type="recommended" />
        </div>
      </div>

      {/* Market List */}
      <MarketList />

      {/* Execution Panel */}
      <ExecutionPanel />
    </div>
  );
}
```

### 6.4 Core Components

#### VaultOverview

```typescript
// components/VaultOverview.tsx
'use client';

import { useAccount } from 'wagmi';
import { useUserPositions } from '@/hooks/useUserPositions';
import { Card } from '@/components/ui/card';

export function VaultOverview() {
  const { address } = useAccount();
  const { positions, totalValue, weightedApy, isLoading } = useUserPositions(address);

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="p-6">
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Total Assets</p>
          <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Weighted APY</p>
          <p className="text-3xl font-bold text-green-600">
            {weightedApy.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Positions</p>
          <p className="text-3xl font-bold">{positions.length}</p>
        </div>
      </div>
    </Card>
  );
}
```

#### AIRecommendation

```typescript
// components/AIRecommendation.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAllocationAnalysis } from '@/hooks/useAllocationAnalysis';

export function AIRecommendation() {
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const { analysis, isAnalyzing, analyze } = useAllocationAnalysis();

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">AI Recommendation</h3>

      {/* Risk Profile Selector */}
      <div className="flex gap-2 mb-4">
        {(['conservative', 'balanced', 'aggressive'] as const).map((profile) => (
          <Button
            key={profile}
            variant={riskProfile === profile ? 'default' : 'outline'}
            onClick={() => setRiskProfile(profile)}
            size="sm"
          >
            {profile === 'conservative' ? 'Conservative' : profile === 'balanced' ? 'Balanced' : 'Aggressive'}
          </Button>
        ))}
      </div>

      {/* Analyze Button */}
      <Button
        onClick={() => analyze(riskProfile)}
        disabled={isAnalyzing}
        className="w-full mb-4"
      >
        {isAnalyzing ? 'Analyzing...' : 'AI Analyze Optimal Allocation'}
      </Button>

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Expected APY Increase</span>
            <span className="text-green-600 font-semibold">
              +{analysis.expectedApyIncrease.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Risk Score Change</span>
            <span className={analysis.riskScoreChange < 0 ? 'text-green-600' : 'text-red-600'}>
              {analysis.riskScoreChange > 0 ? '+' : ''}{analysis.riskScoreChange.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Gas Cost</span>
            <span>${analysis.estimatedGasCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Break-even Period</span>
            <span>{analysis.breakEvenDays} days</span>
          </div>

          {/* AI Explanation */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">{analysis.aiExplanation}</p>
          </div>

          {/* Recommendation Badge */}
          <div className="mt-4">
            {analysis.recommendation === 'execute' && (
              <div className="flex items-center gap-2 text-green-600">
                <span className="font-semibold">Recommended: Execute</span>
              </div>
            )}
            {analysis.recommendation === 'hold' && (
              <div className="flex items-center gap-2 text-yellow-600">
                <span className="font-semibold">Recommended: Hold</span>
              </div>
            )}
            {analysis.recommendation === 'review' && (
              <div className="flex items-center gap-2 text-blue-600">
                <span className="font-semibold">Recommended: Review</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
```

### 6.5 React Hooks

```typescript
// hooks/useUserPositions.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserPositions } from '@/lib/lifi/earn-client';

export function useUserPositions(address?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['userPositions', address],
    queryFn: () => getUserPositions(address!),
    enabled: !!address,
    refetchInterval: 60_000, // Refresh every 60s
  });

  const positions = data?.positions ?? [];
  const totalValue = positions.reduce(
    (sum: number, p: any) => sum + (p.balance?.usdValue ?? 0),
    0
  );
  const weightedApy = positions.reduce(
    (sum: number, p: any) => sum + (p.performance?.apy ?? 0) * ((p.balance?.usdValue ?? 0) / (totalValue || 1)),
    0
  );

  return { positions, totalValue, weightedApy, isLoading };
}
```

```typescript
// hooks/useAllocationAnalysis.ts
'use client';

import { useState } from 'react';
import type { AllocationOutput } from '@/types/allocation';

export function useAllocationAnalysis() {
  const [analysis, setAnalysis] = useState<AllocationOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function analyze(riskProfile: 'conservative' | 'balanced' | 'aggressive') {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAmount: '10000', // TODO: get from wallet
          riskProfile,
          currentAllocation: [], // TODO: get from positions
          gasPriceGwei: 30, // TODO: get from RPC
        }),
      });
      const result = await res.json();
      setAnalysis(result);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return { analysis, isAnalyzing, analyze };
}
```

---

## 7. Implementation Plan (5 hours)

### Phase 1: Project Init + MCP Servers (45 min)

```bash
npx create-next-app@16.1.1 morpho-claude --typescript --tailwind --app
cd morpho-claude
npm install @anthropic-ai/claude-agent-sdk@0.2.101 zod@^4
npm install @apollo/client graphql
npm install wagmi viem @tanstack/react-query recharts
npx shadcn@latest init
npx shadcn@latest add button card input table dialog select toast
```

Tasks:
- Create `lib/mcp/morpho-server.ts`
- Create `lib/mcp/lifi-server.ts`
- Create `types/allocation.ts`

### Phase 2: Data Layer (45 min)

Tasks:
- Create `lib/morpho/client.ts` (Apollo client)
- Create `lib/morpho/queries.ts` (GraphQL queries)
- Create `lib/morpho/api.ts` (data fetching + formatting)
- Create `lib/lifi/earn-client.ts` (corrected endpoints)
- Create `hooks/useUserPositions.ts`

### Phase 3: AI Agent Engine (60 min)

Tasks:
- Create `lib/ai/schema.ts` (structured output schema)
- Create `lib/ai/agents.ts` (subagent definitions)
- Create `lib/ai/allocator.ts` (orchestrator with query())
- Create `app/api/analyze/route.ts` (API route)
- Create `hooks/useAllocationAnalysis.ts`

### Phase 4: Execution Layer (45 min)

Tasks:
- Create `lib/executor/reallocate.ts` (viem-based)
- Create `hooks/useReallocation.ts` (wagmi integration)
- Create `components/ExecutionPanel.tsx`

### Phase 5: Frontend UI (45 min)

Tasks:
- Create `components/VaultOverview.tsx`
- Create `components/AllocationChart.tsx` (recharts PieChart)
- Create `components/AIRecommendation.tsx`
- Create `components/MarketList.tsx`
- Create `components/Providers.tsx` (wagmi + react-query)
- Create `app/page.tsx` (dashboard layout)
- Create `app/layout.tsx` (root layout)

### Phase 6: Integration Testing (30 min)

- Test wallet connection
- Test Morpho API data fetching
- Test LI.FI Earn API pagination
- Test AI analysis (structured output validation)
- Test Composer quote (GET method)
- Optimize loading states and error handling

---

## 8. Demo Script

### Scene 1: Initial State (30s)
1. Connect wallet (MetaMask)
2. Display current positions

```
Total Assets: $10,000 USDC
Current APY: 5.2%
Positions:
  - 100% Morpho USDC Core (Ethereum)
    APY: 5.2%
    Risk Score: 6/10
```

### Scene 2: AI Analysis (60s)
1. Select risk profile: Balanced
2. Click "AI Analyze Optimal Allocation"

**AI Analysis Steps (animated)**:
```
[risk-analyzer] Scanning 23 Morpho USDC vaults...
[risk-analyzer] Analyzing collateral quality and utilization rates...
[yield-optimizer] Calculating optimal portfolio weights...
[gas-estimator] Estimating transaction costs...
[orchestrator] Synthesizing final recommendation...
```

**AI Recommendation**:
```
New Allocation:
  - 35% -> Morpho USDC Prime (4.8% APY, Low Risk)
  - 40% -> Morpho USDC Core (5.2% APY, Medium Risk)
  - 25% -> Morpho Re7 USDC (6.8% APY, Medium-High Risk)

Expected Returns:
  - Weighted APY: 5.5% (+0.3%)
  - Annual Increase: +$30

Risk Optimization:
  - Risk Score: 5.5/10 (reduced 8%)
  - Diversification: 1 vault -> 3 vaults

Cost Analysis:
  - Gas Cost: ~$15
  - Break-even: 6 months
  - AI Recommendation: Execute
```

### Scene 3: One-Click Execution (60s)
1. Click "Execute Reallocation"

```
Step 1/5: Withdraw 6,500 USDC from Morpho USDC Core
  Awaiting signature... Confirmed

Step 2/5: Approve USDC for Morpho USDC Prime
  Confirmed

Step 3/5: Deposit 3,500 USDC to Morpho USDC Prime
  Confirmed

Step 4/5: Approve USDC for Morpho Re7 USDC
  Confirmed

Step 5/5: Deposit 2,500 USDC to Morpho Re7 USDC
  Confirmed

Reallocation Complete!
  New Weighted APY: 5.5%
  Est. Annual Yield: $550 -> $580
```

### Scene 4: Continuous Monitoring (30s)
```
Auto-Rebalance Settings:
  - Trigger: APY difference > 0.5%
  - Frequency: Weekly check
  - Status: Enabled
```

---

## 9. Environment Variables

```bash
# .env.local

# Claude Agent SDK (required)
ANTHROPIC_API_KEY=sk-ant-...

# LI.FI Composer (required for deposit quotes)
LIFI_API_KEY=...           # Get from portal.li.fi

# RPC Providers
NEXT_PUBLIC_ALCHEMY_KEY=... # Or Infura

# Optional
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

---

## 10. References

### Morpho
- API Docs: https://docs.morpho.org/tools/offchain/api/get-started/
- SDK Docs: https://docs.morpho.org/tools/offchain/sdks/get-started/
- Vault Concepts: https://docs.morpho.org/learn/concepts/vault/

### LI.FI
- Earn Data API: `https://earn.li.fi` (no auth, 100 req/min)
- Composer: `https://li.quest` (requires API key)
- LI.FI Docs: https://docs.li.fi/
- API Key Portal: https://portal.li.fi

### Claude Agent SDK
- Package: `@anthropic-ai/claude-agent-sdk@0.2.101`
- Peer dep: `zod ^4.0.0`
- Node.js: >= 18, ESM only
- API: `query()`, `createSdkMcpServer()`, `tool()`

### Tech Stack
- Next.js 16.1.1: https://nextjs.org/docs
- React 19.2: https://react.dev
- shadcn/ui: https://ui.shadcn.com/
- wagmi: https://wagmi.sh/
- viem: https://viem.sh/
- Tailwind CSS: https://tailwindcss.com/

### Hackathon
- DeFi Mullet Hackathon #1: https://github.com/brucexu-eth/defi-mullet-hackathon
- Track: AI x Earn
- Submission: April 14, 2026
