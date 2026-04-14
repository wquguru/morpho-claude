# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MorphoClaude** is an AI-driven DeFi yield optimization tool for Morpho Vaults, built for the DeFi Mullet Hackathon #1 (AI x Earn track). It uses Claude Agent SDK to analyze and recommend optimal vault allocations, with LI.FI Earn API for execution.

The authoritative technical spec is `docs/specv2.md`.

## Tech Stack

- **Next.js 16.1.1** (App Router, React 19.2, Turbopack, async params)
- **TypeScript**, **Tailwind CSS**, **shadcn/ui** (`npx shadcn@latest`, NOT `shadcn-ui`)
- **@anthropic-ai/claude-agent-sdk@0.2.101** with `zod ^4.0.0` (ESM only)
- **wagmi + viem** for wallet/blockchain (NOT ethers.js)
- **@apollo/client** for Morpho GraphQL API
- **recharts** for data visualization

## Architecture

Three-layer architecture with AI agent orchestration:

1. **Data Layer** (`lib/morpho/`, `lib/lifi/`): Morpho GraphQL API + LI.FI Earn API for vault data and user positions
2. **AI Layer** (`lib/ai/`, `lib/mcp/`): Claude Agent SDK orchestrator with two in-process MCP servers (`morpho-tools`, `lifi-tools`), three subagents (`risk-analyzer`, `yield-optimizer`, `gas-estimator`), and structured JSON output
3. **Execution Layer** (`lib/executor/`): viem-based ERC-4626 withdraw + LI.FI Composer deposit quotes

The AI agent uses MCP tools to fetch data on-demand rather than embedding data in prompts. Structured output (`outputFormat` with JSON schema) replaces regex-based JSON extraction.

## Critical API Details

### LI.FI Earn API (`earn.li.fi`)
- Endpoint: `GET /v1/earn/vaults` (NOT `/v1/vaults`)
- Portfolio: `GET /v1/earn/portfolio/{addr}/positions` (NOT `/v1/portfolio/{addr}`)
- Pagination: use `nextCursor` field
- APY fields (`apy.reward`, `apy7d`) can be `null` — default to 0
- TVL (`analytics.tvl.usd`) is a **string** — must `parseFloat()`
- Check `isTransactional === true` before deposit quotes

### LI.FI Composer (`li.quest`)
- Quote endpoint: **GET** `/v1/quote` (NOT POST)
- Requires `x-lifi-api-key` header (from `portal.li.fi`)
- `toToken` = vault address for Morpho deposits

## Next.js 16 Patterns

- `params`, `searchParams`, `cookies()`, `headers()` are **async** — must `await`
- Use `proxy.ts` instead of `middleware.ts`
- Use `"use cache"` directive for opt-in caching (no implicit caching)
- Client components need `'use client'` directive for hooks

## Skills Reference

The `.codex/skills/` directory contains detailed reference guides:
- `claude-agent-sdk-best-practice/SKILL.md` — SDK API, MCP patterns, hooks, structured output
- `nextjs/SKILL.md` — Next.js 16 breaking changes, 25 error solutions
- `shadcn-ui/SKILL.md` — Component installation and patterns
- `vercel-react-best-practices/` — React performance rules

## Environment Variables

```
ANTHROPIC_API_KEY=         # Required for Claude Agent SDK
LIFI_API_KEY=              # Required for Composer quotes
NEXT_PUBLIC_ALCHEMY_KEY=   # RPC provider
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # Optional
```
