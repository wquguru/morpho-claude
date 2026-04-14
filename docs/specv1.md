# MorphoGPT - 技术实现文档

## 🎯 项目定位

**MorphoGPT** 是一个 AI 驱动的 DeFi 收益优化工具，模拟专业 Allocator 的资金管理能力，为普通用户提供机构级的 Morpho Vault 资金重分配服务。

### 核心价值主张

- **AI 自动化决策**：替代 Gauntlet 等专业团队的手动优化流程

- **多维度分析**：综合 APY、风险、流动性、Gas 成本进行智能决策

- **一键执行**：通过 [LI. FI](http://LI.FI) Earn API 实现跨 Vault 的原子化重分配

- **持续监控**：7x24 小时监控市场变化，自动触发再平衡

---

## 📊 技术架构

### 系统架构图

```plaintext
用户钱包
    ↓
前端 Dashboard (Next.js + shadcn/ui)
    ↓
后端 API (Next.js API Routes)
    ├── 数据层：Morpho GraphQL API
    ├── 决策层：Claude 3.5 Sonnet API
    └── 执行层：LI.FI Earn API / Vaults.fyi API
    ↓
区块链 (Ethereum / Base)
```

### 核心技术栈

| 层级 | 技术选型 | 用途 |
| --- | --- | --- |
| **前端** | Next.js 14 + TypeScript | React 框架 |
|  | shadcn/ui + Tailwind CSS | UI 组件库 |
|  | recharts | 数据可视化 |
|  | wagmi + viem | 钱包连接 |
| **后端** | Next.js API Routes | API 服务 |
|  | @morpho-org/blue-api-sdk | Morpho 数据获取 |
|  | @apollo/client | GraphQL 客户端 |
| **AI 层** | Claude 3.5 Sonnet API | 决策引擎 |
| **执行层** | Vaults.fyi API | Vault 交易执行 |
|  | [LI. FI](http://LI.FI) Earn API （备选） | 跨链存款 |
| **区块链** | ethers.js / viem | 合约交互 |

---

## 🔧 核心功能模块

### 1. 数据获取层

#### 1.1 Morpho GraphQL API 集成

**API 端点**：`https://api.morpho.org/graphql`

**核心查询**：

##### 获取所有 USDC Vaults（Ethereum + Base）

```plaintext
query GetUSDCVaults {
  vaultV2s(
    first: 100
    where: { 
      chainId_in: [1, 8453]
      asset: { 
        address_in: [
          "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  # Ethereum USDC
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  # Base USDC
        ]
      }
    }
  ) {
    items {
      address
      name
      symbol
      chain {
        id
        network
      }
      asset {
        address
        symbol
        decimals
      }
      state {
        apy          # 原生 APY
        totalAssets
        totalSupply
        fee
      }
      rewards {
        asset {
          address
          symbol
        }
        supplyApr    # 奖励 APR
      }
    }
  }
}
```

##### 获取 Vault 的底层市场分配

```plaintext
query GetVaultAllocations($vaultAddress: String!, $chainId: Int!) {
  vaultV2ByAddress(address: $vaultAddress, chainId: $chainId) {
    address
    name
    state {
      allocation {
        market {
          uniqueKey
          loanAsset {
            symbol
          }
          collateralAsset {
            symbol
          }
          state {
            supplyApy
            utilization
            borrowAssets
            supplyAssets
          }
        }
        supplyAssets      # 分配到该市场的资产
        supplyAssetsUsd
        supplyShares
      }
    }
  }
}
```

##### 查询用户在 Vault 的持仓

```plaintext
query GetUserPositions($userAddress: String!, $chainId: Int!) {
  userByAddress(address: $userAddress, chainId: $chainId) {
    address
    vaultV2Positions {
      vault {
        address
        name
        symbol
      }
      assets          # 用户存入的资产数量
      assetsUsd
      shares          # 用户持有的份额
      pnl             # 盈亏
      pnlUsd
      roe             # 收益率
    }
  }
}
```

#### 1.2 SDK 集成方案

**安装依赖**：

```bash
npm install @morpho-org/blue-api-sdk @morpho-org/blue-sdk @apollo/client graphql
```

**TypeScript 实现**：

```typescript
// lib/morpho/client.ts
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const MORPHO_API_URL = 'https://api.morpho.org/graphql';

export const morphoClient = new ApolloClient({
  uri: MORPHO_API_URL,
  cache: new InMemoryCache(),
});

// lib/morpho/queries.ts
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
`;

// lib/morpho/api.ts
import { morphoClient } from './client';
import { GET_USDC_VAULTS } from './queries';

export interface VaultData {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  chainName: string;
  apy: number;
  totalApy: number;  // apy + rewards
  totalAssets: string;
  totalAssetsUsd: number;
  rewardsApr: number;
  riskScore: number;  // 需要计算
}

export async function fetchUSDCVaults(): Promise<vaultdata[]> {
  const { data } = await morphoClient.query({
    query: GET_USDC_VAULTS,
    variables: {
      chainIds: [1, 8453],  // Ethereum + Base
      usdcAddresses: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',  // Ethereum
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
      ],
    },
  });

  return data.vaultV2s.items.map((vault: any) => {
    const baseApy = vault.state.apy;
    const rewardsApr = vault.rewards.reduce(
      (sum: number, r: any) => sum + r.supplyApr, 
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
      totalAssetsUsd: 0,  // 需要通过 price feed 计算
      rewardsApr,
      riskScore: 0,  // 需要通过 AI 分析
    };
  });
}
</vaultdata[]>
```

---

### 2. AI 决策引擎

#### 2.1 决策输入数据结构

```typescript
// types/allocation.ts
export interface AllocationInput {
  userAmount: string;           // 用户总资产（USDC）
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  currentAllocation: {          // 当前分配
    vaultAddress: string;
    chainId: number;
    amount: string;
    percentage: number;
  }[];
  availableVaults: VaultData[]; // 所有可用 Vault
  gasPriceGwei: number;         // 当前 Gas 价格
}

export interface AllocationOutput {
  recommendedAllocation: {
    vaultAddress: string;
    chainId: number;
    percentage: number;
    amount: string;
    reason: string;
  }[];
  expectedApyIncrease: number;  // 预期 APY 提升
  riskScoreChange: number;      // 风险评分变化
  estimatedGasCost: number;     // 预估 Gas 成本（USD）
  breakEvenDays: number;        // 回本天数
  recommendation: 'execute' | 'hold' | 'review';
  aiExplanation: string;        // AI 的详细解释
}
```

#### 2.2 Claude API 集成

```typescript
// lib/ai/allocator.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeAllocation(
  input: AllocationInput
): Promise<allocationoutput> {
  const prompt = `你是一个专业的 DeFi 资金管理 AI，负责为用户优化 Morpho Vault 的资金分配。

用户资料：
- 总资产：${input.userAmount} USDC
- 风险偏好：${input.riskProfile}
- 当前分配：${JSON.stringify(input.currentAllocation, null, 2)}

可用 Vault 列表：
${input.availableVaults.map((v, i) => `
${i + 1}. ${v.name} (${v.chainName})
   - 地址：${v.address}
   - 总 APY：${v.totalApy.toFixed(2)}% (基础 ${v.apy.toFixed(2)}% + 奖励 ${v.rewardsApr.toFixed(2)}%)
   - TVL：$${(v.totalAssetsUsd / 1e6).toFixed(2)}M
   - 风险评分：${v.riskScore}/10
`).join('
')}

当前 Gas 价格：${input.gasPriceGwei} Gwei

请分析并给出最优的资金重分配方案，要求：

1. **风险管理**：
   - Conservative：优先低风险 Vault，最多分配到 3 个 Vault
   - Balanced：平衡收益和风险，可分配到 3-5 个 Vault
   - Aggressive：追求最高收益，可分配到 5+ 个 Vault

2. **收益优化**：
   - 计算加权 APY
   - 考虑奖励的持续性
   - 评估流动性风险

3. **成本效益**：
   - 估算 Gas 成本
   - 计算回本周期
   - 如果回本周期 > 180 天，建议 hold

4. **分散化**：
   - 避免过度集中在单一 Vault
   - 考虑跨链分散（Ethereum + Base）

请以 JSON 格式返回分析结果，格式如下：

\`\`\`json
{
  "recommendedAllocation": [
    {
      "vaultAddress": "0x...",
      "chainId": 1,
      "percentage": 40,
      "amount": "4000",
      "reason": "低风险、稳定收益"
    }
  ],
  "expectedApyIncrease": 0.3,
  "riskScoreChange": -0.5,
  "estimatedGasCost": 15,
  "breakEvenDays": 180,
  "recommendation": "execute",
  "aiExplanation": "详细的分析说明..."
}
\`\`\``;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // 提取 JSON
  const jsonMatch = content.text.match(/```json
([\s\S]*?)
```/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[1]);
}
</allocationoutput>
```

---

### 3. 执行层集成

#### 3.1 [LI. FI](http://LI.FI) Earn API + Composer（官方方案）

**为什么使用 [LI. FI](http://LI.FI)** **Earn?**

- ✅ **黑客松官方要求**：必须使用 [LI. FI](http://LI.FI) Earn API

- ✅ **原生支持 Morpho**：20+ 协议包含 Morpho Vaults

- ✅ **一键跨链存款**：通过 Composer 实现 swap + bridge + deposit

- ✅ **标准化数据**：统一的 Vault 数据格式

- ✅ **内置收益追踪**：Portfolio API 追踪用户持仓

**两层架构**：

| 层级 | Base URL | 用途 |
| --- | --- | --- |
| **Earn Data API** | `https://earn.li.fi` | Vault 发现、APY/TVL 数据 |
| **Composer** | `https://li.quest` | 交易执行、跨链存款 |

**核心端点**：

##### 1. 发现 Morpho Vaults（Earn Data API）

```bash
GET https://earn.li.fi/v1/vaults
  ?chains=eth,base
  &protocols=morpho
  &tokens=USDC
  &sort=apy
  &order=desc
```

**响应示例**：

```json
{
  "vaults": [
    {
      "id": "morpho-usdc-vault-eth",
      "protocol": "morpho",
      "chain": "eth",
      "name": "Morpho USDC Core",
      "lpToken": {
        "address": "0x...",
        "symbol": "mUSDC",
        "decimals": 18
      },
      "underlyingTokens": [
        {
          "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          "symbol": "USDC",
          "decimals": 6
        }
      ],
      "apy": {
        "base": 5.2,
        "reward": 0.8,
        "total": 6.0
      },
      "tvl": 125000000,
      "url": "https://app.morpho.org/vault/..."
    }
  ]
}
```

##### 2. 执行存款（Composer）

**关键概念**：Composer 将 Vault 的 LP Token 视为目标资产，自动处理 swap + deposit.

```bash
GET https://li.quest/v1/quote
  ?fromChain=eth
  &toChain=eth
  &fromToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48  # USDC
  &toToken=0x...  # Morpho Vault LP Token
  &fromAmount=1000000000  # 1000 USDC
  &fromAddress=0x...  # 用户地址
```

**响应示例**：

```json
{
  "id": "quote-123",
  "type": "lifi",
  "tool": "composer",
  "action": {
    "fromToken": {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "symbol": "USDC"
    },
    "toToken": {
      "address": "0x...",
      "symbol": "mUSDC"
    },
    "fromAmount": "1000000000",
    "toAmount": "950000000000000000"  # ~0.95 LP tokens
  },
  "estimate": {
    "approvalAddress": "0x...",
    "toAmountMin": "940000000000000000",
    "executionDuration": 30,
    "gasCosts": [
      {
        "type": "SEND",
        "price": "30000000000",
        "estimate": "250000",
        "amount": "7500000000000000"
      }
    ]
  },
  "transactionRequest": {
    "to": "0x...",  # LI.FI Diamond Contract
    "data": "0x...",
    "value": "0",
    "gasLimit": "300000"
  }
}
```

##### 3. 查询用户持仓（Earn Data API）

```bash
GET https://earn.li.fi/v1/portfolio/{userAddress}
  ?chains=eth,base
  &protocols=morpho
```

**响应示例**：

```json
{
  "positions": [
    {
      "vault": {
        "id": "morpho-usdc-vault-eth",
        "protocol": "morpho",
        "name": "Morpho USDC Core"
      },
      "balance": {
        "shares": "950000000000000000",
        "underlyingAmount": "1005000000",  # 1005 USDC
        "usdValue": 1005.0
      },
      "performance": {
        "depositedAmount": "1000000000",
        "currentAmount": "1005000000",
        "pnl": "5000000",
        "pnlPercent": 0.5,
        "apy": 6.0
      }
    }
  ],
  "totalValue": 1005.0
}
```

**TypeScript 集成**：

```typescript
// lib/lifi/earn-client.ts
const EARN_API = 'https://earn.li.fi';
const COMPOSER_API = 'https://li.quest';
const API_KEY = process.env.LIFI_API_KEY;  // 可选，用于更高速率限制

export interface VaultFilter {
  chains?: string[];      // ['eth', 'base']
  protocols?: string[];   // ['morpho']
  tokens?: string[];      // ['USDC']
  sort?: 'apy' | 'tvl';
  order?: 'asc' | 'desc';
}

export async function fetchVaults(filter: VaultFilter) {
  const url = new URL(`${EARN_API}/v1/vaults`);
  
  if (filter.chains) url.searchParams.set('chains', filter.chains.join(','));
  if (filter.protocols) url.searchParams.set('protocols', filter.protocols.join(','));
  if (filter.tokens) url.searchParams.set('tokens', filter.tokens.join(','));
  if (filter.sort) url.searchParams.set('sort', filter.sort);
  if (filter.order) url.searchParams.set('order', filter.order);

  const response = await fetch(url.toString(), {
    headers: API_KEY ? { 'x-lifi-api-key': API_KEY } : {},
  });

  return response.json();
}

export async function getDepositQuote(
  fromChain: string,
  toChain: string,
  fromToken: string,
  vaultLpToken: string,  // Vault 的 LP Token 地址
  fromAmount: string,
  userAddress: string
) {
  const url = new URL(`${COMPOSER_API}/v1/quote`);
  url.searchParams.set('fromChain', fromChain);
  url.searchParams.set('toChain', toChain);
  url.searchParams.set('fromToken', fromToken);
  url.searchParams.set('toToken', vaultLpToken);  // 关键：LP Token 作为目标
  url.searchParams.set('fromAmount', fromAmount);
  url.searchParams.set('fromAddress', userAddress);

  const response = await fetch(url.toString(), {
    headers: API_KEY ? { 'x-lifi-api-key': API_KEY } : {},
  });

  return response.json();
}

export async function getUserPortfolio(
  userAddress: string,
  chains?: string[],
  protocols?: string[]
) {
  const url = new URL(`${EARN_API}/v1/portfolio/${userAddress}`);
  
  if (chains) url.searchParams.set('chains', chains.join(','));
  if (protocols) url.searchParams.set('protocols', protocols.join(','));

  const response = await fetch(url.toString(), {
    headers: API_KEY ? { 'x-lifi-api-key': API_KEY } : {},
  });

  return response.json();
}
```

#### 3.2 重分配执行流程

```typescript
// lib/executor/reallocate.ts
import { getDepositQuote, getUserPortfolio } from '../lifi/earn-client';
import { ethers } from 'ethers';

export interface ReallocationStep {
  type: 'withdraw' | 'deposit';
  vaultAddress: string;
  chainId: number;
  amount: string;
  txData: any;
}

export async function prepareReallocation(
  userAddress: string,
  currentAllocation: AllocationInput['currentAllocation'],
  targetAllocation: AllocationOutput['recommendedAllocation']
): Promise<reallocationstep[]> {
  const steps: ReallocationStep[] = [];

  // 1. 提款步骤（直接调用 Vault 合约的 redeem）
  for (const current of currentAllocation) {
    const target = targetAllocation.find(
      t => t.vaultAddress === current.vaultAddress
    );
    
    const targetAmount = target ? parseFloat(target.amount) : 0;
    const withdrawAmount = parseFloat(current.amount) - targetAmount;

    if (withdrawAmount > 0) {
      // 直接调用 ERC-4626 redeem（不需要通过 LI.FI）
      steps.push({
        type: 'withdraw',
        vaultAddress: current.vaultAddress,
        chainId: current.chainId,
        amount: withdrawAmount.toString(),
        txData: {
          to: current.vaultAddress,
          data: encodeRedeemCall(withdrawAmount, userAddress),
        },
      });
    }
  }

  // 2. 存款步骤（通过 LI.FI Composer）
  for (const target of targetAllocation) {
    const current = currentAllocation.find(
      c => c.vaultAddress === target.vaultAddress
    );
    
    const currentAmount = current ? parseFloat(current.amount) : 0;
    const depositAmount = parseFloat(target.amount) - currentAmount;

    if (depositAmount > 0) {
      const chainName = target.chainId === 1 ? 'eth' : 'base';
      const usdcAddress = target.chainId === 1 
        ? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'  // Ethereum USDC
        : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

      // 使用 LI.FI Composer 获取存款交易
      const quote = await getDepositQuote(
        chainName,
        chainName,
        usdcAddress,
        target.vaultAddress,  // Vault LP Token
        ethers.utils.parseUnits(depositAmount.toString(), 6).toString(),
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

// 辅助函数：编码 ERC-4626 redeem 调用
function encodeRedeemCall(shares: number, receiver: string): string {
  const iface = new ethers.utils.Interface([
    'function redeem(uint256 shares, address receiver, address owner) returns (uint256)'
  ]);
  return iface.encodeFunctionData('redeem', [
    ethers.utils.parseUnits(shares.toString(), 18),
    receiver,
    receiver
  ]);
}
</reallocationstep[]>
```

---

### 4. 前端实现

#### 4.1 Dashboard 布局

```typescript
// app/page.tsx
import { VaultOverview } from '@/components/VaultOverview';
import { AllocationChart } from '@/components/AllocationChart';
import { AIRecommendation } from '@/components/AIRecommendation';
import { MarketList } from '@/components/MarketList';
import { ExecutionPanel } from '@/components/ExecutionPanel';

export default function Dashboard() {
  return (
    <div classname="container mx-auto p-6">
      {/* 顶部：总览 */}
      <vaultoverview>

      <div classname="grid grid-cols-3 gap-6 mt-6">
        {/* 左侧：当前分配 */}
        <div classname="col-span-1">
          <allocationchart type="current">
        </allocationchart></div>

        {/* 中间：AI 推荐 */}
        <div classname="col-span-1">
          <airecommendation>
        </airecommendation></div>

        {/* 右侧：推荐分配 */}
        <div classname="col-span-1">
          <allocationchart type="recommended">
        </allocationchart></div>
      </div>

      {/* 市场列表 */}
      <marketlist>

      {/* 执行面板 */}
      <executionpanel>
    </executionpanel></marketlist></vaultoverview></div>
  );
}
```

#### 4.2 核心组件

##### VaultOverview 组件

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
    <card classname="p-6">
      <div classname="grid grid-cols-3 gap-6">
        <div>
          <p classname="text-sm text-muted-foreground">总资产</p>
          <p classname="text-3xl font-bold">${totalValue.toFixed(2)}</p>
        </div>
        <div>
          <p classname="text-sm text-muted-foreground">加权 APY</p>
          <p classname="text-3xl font-bold text-green-600">
            {weightedApy.toFixed(2)}%
          </p>
        </div>
        <div>
          <p classname="text-sm text-muted-foreground">持仓数量</p>
          <p classname="text-3xl font-bold">{positions.length}</p>
        </div>
      </div>
    </card>
  );
}
```

##### AIRecommendation 组件

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
    <card classname="p-6">
      <h3 classname="text-lg font-semibold mb-4">AI 推荐</h3>

      {/* 风险偏好选择 */}
      <div classname="flex gap-2 mb-4">
        {(['conservative', 'balanced', 'aggressive'] as const).map(profile => (
          <button key="{profile}" variant="{riskProfile" =="=" profile="" ?="" 'default'="" :="" 'outline'}="" onclick="{()"> setRiskProfile(profile)}
          >
            {profile === 'conservative' ? '保守' : profile === 'balanced' ? '平衡' : '激进'}
          </button>
        ))}
      </div>

      {/* 分析按钮 */}
      <button onclick="{()" ==""> analyze(riskProfile)} 
        disabled={isAnalyzing}
        className="w-full mb-4"
      >
        {isAnalyzing ? '分析中...' : '🤖 AI 分析最优分配'}
      </button>

      {/* 分析结果 */}
      {analysis && (
        <div classname="space-y-4">
          <div classname="flex justify-between">
            <span>预期 APY 提升</span>
            <span classname="text-green-600 font-semibold">
              +{analysis.expectedApyIncrease.toFixed(2)}%
            </span>
          </div>
          <div classname="flex justify-between">
            <span>风险评分变化</span>
            <span classname="{analysis.riskScoreChange" <="" 0="" ?="" 'text-green-600'="" :="" 'text-red-600'}="">
              {analysis.riskScoreChange > 0 ? '+' : ''}{analysis.riskScoreChange.toFixed(1)}
            </span>
          </div>
          <div classname="flex justify-between">
            <span>预估 Gas 成本</span>
            <span>${analysis.estimatedGasCost.toFixed(2)}</span>
          </div>
          <div classname="flex justify-between">
            <span>回本周期</span>
            <span>{analysis.breakEvenDays} 天</span>
          </div>

          {/* AI 解释 */}
          <div classname="mt-4 p-4 bg-muted rounded-lg">
            <p classname="text-sm">{analysis.aiExplanation}</p>
          </div>

          {/* 推荐操作 */}
          <div classname="mt-4">
            {analysis.recommendation === 'execute' && (
              <div classname="flex items-center gap-2 text-green-600">
                <span>✅</span>
                <span classname="font-semibold">建议执行</span>
              </div>
            )}
            {analysis.recommendation === 'hold' && (
              <div classname="flex items-center gap-2 text-yellow-600">
                <span>⏸️</span>
                <span classname="font-semibold">建议暂缓</span>
              </div>
            )}
          </div>
        </div>
      )}
    </card>
  );
}
```

---

## 📋 完整实现计划（5 小时）

### Phase 1: 项目初始化（30 分钟）

```bash
# 创建 Next.js 项目
npx create-next-app@latest morpho-gpt --typescript --tailwind --app

cd morpho-gpt

# 安装依赖
npm install @morpho-org/blue-api-sdk @apollo/client graphql
npm install @anthropic-ai/sdk
npm install wagmi viem @tanstack/react-query
npm install recharts
npm install shadcn-ui

# 初始化 shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button input
```

### Phase 2: 数据层实现（60 分钟）

**任务清单**：

- ✅ 创建 Morpho GraphQL 客户端

- ✅ 实现 Vault 数据查询

- ✅ 实现用户持仓查询

- ✅ 创建 React Hooks（useUserPositions, useVaultList）

**Coding Agent Prompt**：

```plaintext
帮我实现 Morpho 数据获取层：

1. 创建 lib/morpho/client.ts
   - 使用 @apollo/client 连接 https://api.morpho.org/graphql
   - 配置 InMemoryCache

2. 创建 lib/morpho/queries.ts
   - GET_USDC_VAULTS：查询所有 USDC vault（Ethereum + Base）
   - GET_USER_POSITIONS：查询用户持仓
   - GET_VAULT_ALLOCATIONS：查询 vault 底层市场分配

3. 创建 lib/morpho/api.ts
   - fetchUSDCVaults()：获取并格式化 vault 列表
   - fetchUserPositions(address)：获取用户持仓
   - 计算加权 APY 和总资产

4. 创建 hooks/useUserPositions.ts
   - 使用 @tanstack/react-query
   - 每 60 秒自动刷新
   - 返回：positions, totalValue, weightedApy, isLoading

参考文档：https://docs.morpho.org/tools/offchain/api/morpho-vaults/
```

### Phase 3: AI 决策引擎（60 分钟）

**Coding Agent Prompt**：

```plaintext
帮我实现 AI 决策引擎：

1. 创建 lib/ai/allocator.ts
   - analyzeAllocation(input: AllocationInput): Promise<allocationoutput>
   - 使用 Claude 3.5 Sonnet API
   - Prompt 包含：用户资料、Vault 列表、风险偏好、Gas 价格
   - 要求 AI 返回 JSON 格式的分配方案

2. 创建 lib/ai/risk-scorer.ts
   - calculateRiskScore(vault: VaultData): number
   - 考虑因素：TVL、抵押品类型、历史表现、利用率

3. 创建 hooks/useAllocationAnalysis.ts
   - analyze(riskProfile): 触发 AI 分析
   - 返回：analysis, isAnalyzing, error

4. 创建 API Route: app/api/analyze/route.ts
   - POST /api/analyze
   - 接收：userAmount, riskProfile, currentAllocation
   - 返回：AllocationOutput

环境变量：ANTHROPIC_API_KEY
</allocationoutput>
```

### Phase 4: 执行层集成（60 分钟）

**Coding Agent Prompt**：

```plaintext
帮我实现交易执行层：

1. 创建 lib/vaults-fyi/client.ts
   - getDepositTransaction(vaultAddress, userAddress, amount, network)
   - getRedeemTransaction(vaultAddress, userAddress, shares, network)
   - API 端点：https://api.vaults.fyi

2. 创建 lib/executor/reallocate.ts
   - prepareReallocation(userAddress, current, target): Promise<reallocationstep[]>
   - 计算需要 withdraw 和 deposit 的步骤
   - 返回完整的交易列表

3. 创建 hooks/useReallocation.ts
   - executeReallocation(steps): 执行重分配
   - 使用 wagmi 的 useWriteContract
   - 支持批量交易

4. 创建 components/ExecutionPanel.tsx
   - 显示交易步骤列表
   - 显示每个步骤的状态（pending/success/failed）
   - 执行按钮 + 进度条

参考：https://docs.vaults.fyi/api/vaults.fyi-api-overview/earn-api
</reallocationstep[]>
```

### Phase 5: 前端 UI（60 分钟）

**Coding Agent Prompt**：

```plaintext
帮我实现前端 Dashboard：

1. 创建 components/VaultOverview.tsx
   - 显示总资产、加权 APY、持仓数量
   - 使用 shadcn/ui Card 组件

2. 创建 components/AllocationChart.tsx
   - 使用 recharts 的 PieChart
   - 支持 type="current" | "recommended"
   - 颜色按风险等级区分

3. 创建 components/AIRecommendation.tsx
   - 风险偏好选择器（3 个按钮）
   - AI 分析按钮
   - 显示分析结果（APY 提升、风险变化、Gas 成本、回本周期）
   - AI 解释文本

4. 创建 components/MarketList.tsx
   - 表格显示所有可用 Vault
   - 列：名称、链、APY、TVL、风险评分
   - 支持排序和筛选

5. 创建 app/page.tsx
   - 组合所有组件
   - 使用 grid 布局

使用 shadcn/ui + Tailwind CSS
响应式设计（支持移动端）
```

### Phase 6: 测试和优化（30 分钟）

**任务清单**：

- ✅ 测试钱包连接

- ✅ 测试数据获取（Morpho API）

- ✅ 测试 AI 分析（使用真实数据）

- ✅ 测试交易执行（使用测试网）

- ✅ 优化加载状态和错误处理

- ✅ 优化 UI 动画和交互

---

## 🎬 Demo 演示脚本

### 场景 1: 初始状态（30 秒）

**操作**：

1. 连接钱包（MetaMask）

2. 显示当前持仓

**展示内容**：

```plaintext
总资产：$10,000 USDC
当前 APY：5.2%
持仓：
  - 100% Morpho USDC Core (Ethereum)
    APY: 5.2%
    风险评分: 6/10
```

### 场景 2: AI 分析（60 秒）

**操作**：

1. 选择风险偏好：Balanced

2. 点击“AI 分析最优分配”

**AI 分析过程（动画）**：

```plaintext
✓ 扫描 23 个 Morpho USDC vault
✓ 分析风险指标（抵押品、TVL、历史）
✓ 计算最优组合
✓ 评估 gas 成本
```

**AI 推荐结果**：

```plaintext
📊 新分配方案
  - 35% → Morpho USDC Prime (4.8% APY, 低风险)
  - 40% → Morpho USDC Core (5.2% APY, 中风险)
  - 25% → Morpho Re7 USDC (6.8% APY, 中高风险)

📈 预期收益
  - 加权 APY: 5.5% (+0.3%)
  - 年化增量: +$30

🛡️ 风险优化
  - 风险评分: 5.5/10（降低 8%）
  - 分散度: 从 1 个 vault → 3 个 vault

💰 成本分析
  - Gas 费用: ~$15
  - 回本周期: 6 个月
  - AI 建议: ✅ 值得执行

💡 AI 解释：
"当前配置过于集中在单一 vault。通过分散到 3 个不同风险等级的 vault，
可以在提升收益的同时降低整体风险。Morpho Re7 USDC 虽然风险较高，
但其 6.8% 的 APY 和良好的历史表现值得配置 25% 的资金。"
```

### 场景 3: 一键执行（60 秒）

**操作**：

1. 点击“执行重分配”

**交易流程（实时展示）**：

```plaintext
步骤 1/5: 从 Morpho USDC Core 提取 6,500 USDC
  ⏳ 等待签名...
  ✅ 交易已提交 (0x123...)
  ✅ 交易已确认

步骤 2/5: 批准 USDC 给 Morpho USDC Prime
  ⏳ 等待签名...
  ✅ 交易已确认

步骤 3/5: 存入 3,500 USDC 到 Morpho USDC Prime
  ⏳ 等待签名...
  ✅ 交易已确认

步骤 4/5: 批准 USDC 给 Morpho Re7 USDC
  ✅ 交易已确认

步骤 5/5: 存入 2,500 USDC 到 Morpho Re7 USDC
  ✅ 交易已确认

🎉 重分配完成！
  - 新加权 APY: 5.5%
  - 预计年收益: $550 → $580
```

### 场景 4: 持续监控（30 秒）

**展示功能**：

```plaintext
⚙️ 自动再平衡设置
  - 触发条件：APY 差异 > 0.5%
  - 检查频率：每周一次
  - 状态：已启用

📊 模拟场景
  "7 天后，Morpho Re7 APY 从 6.8% 降至 5.0%
   AI 自动触发再平衡提醒
   建议将资金转移到新的高收益 vault"
```

---

## 🏆 项目亮点总结

### 技术创新

1. **AI 驱动的专业级决策**

   - 模拟 Gauntlet 等机构的资金管理能力

   - 多维度分析（收益、风险、流动性、成本）

   - 自然语言解释决策逻辑

2. **深度集成 Morpho 生态**

   - 使用官方 GraphQL API 和 SDK

   - 支持 Vault V1 和 V2

   - 实时监控底层市场分配

3. **无缝执行体验**

   - 通过 Vaults.fyi API 一键执行

   - 批量交易优化 Gas 成本

   - 实时交易状态追踪

4. **跨链支持**

   - Ethereum + Base 双链

   - 统一的用户体验

### 用户价值

- **降低门槛**：普通用户也能享受专业级资金管理

- **提升收益**：通过智能分配提升 APY

- **降低风险**：AI 自动评估和分散风险

- **节省时间**：自动监控和再平衡

### 竞争优势

| 维度 | MorphoGPT | 传统方案 |
| --- | --- | --- |
| **决策方式** | AI 自动化 | 手动分析 |
| **分析深度** | 多维度综合 | 单一指标 |
| **执行效率** | 一键完成 | 多步操作 |
| **持续优化** | 7x24 监控 | 需要主动检查 |
| **用户门槛** | 零门槛 | 需要专业知识 |

---

## 📚 参考文档

### Morpho 官方文档

- API 文档：<https://docs.morpho.org/tools/offchain/api/get-started/>

- SDK 文档：<https://docs.morpho.org/tools/offchain/sdks/get-started/>

- Vault 概念：<https://docs.morpho.org/learn/concepts/vault/>

- Public Allocator:<https://docs.morpho.org/tools/onchain/public-allocator/>

### [LI. FI](http://LI.FI) / Vaults.fyi

- Vaults.fyi API:<https://docs.vaults.fyi/>

- [LI. FI](http://LI.FI) 文档：<https://docs.li.fi/>

### 技术栈

- Next.js:<https://nextjs.org/docs>

- shadcn/ui:<https://ui.shadcn.com/>

- wagmi:<https://wagmi.sh/>

- Claude API:<https://docs.anthropic.com/>

---

## 🚀 下一步行动

**立即可以开始的任务**：

1. ✅ **项目初始化**（现在就可以做）

   ```bash
   npx create-next-app@latest morpho-gpt --typescript --tailwind --app
   ```

2. ✅ **获取 API Keys**

   - Anthropic API Key:<https://console.anthropic.com/>

   - Vaults.fyi API Key（可选）：<https://vaults.fyi/api>

   - Alchemy/Infura RPC:<https://www.alchemy.com/>

3. ✅ **使用 Coding Agent 开发**

   - 将上面的 Prompts 复制给 Claude Code

   - 按照 Phase 1-6 的顺序执行

   - 每个 Phase 完成后测试功能

4. ✅ **准备 Demo**

   - 录制 3 分钟演示视频

   - 准备 X (Twitter) 帖子

   - 准备 GitHub README

**需要我帮你做什么？**

- 🔧 生成完整的 Coding Agent Prompts?

- 📝 准备 X 帖子文案？

- 🎥 制定 Demo 录制脚本？

- 📊 创建项目 Roadmap？

告诉我你想先做什么，我立即帮你准备！🚀
