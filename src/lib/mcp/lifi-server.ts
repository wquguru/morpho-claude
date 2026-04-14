import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const EARN_API = "https://earn.li.fi";
const COMPOSER_API = "https://li.quest";

export const lifiToolsServer = createSdkMcpServer({
  name: "lifi-tools",
  version: "1.0.0",
  tools: [
    tool(
      "discover_vaults",
      "Discover Morpho vaults from LI.FI Earn API with filtering and pagination",
      {
        chains: z
          .string()
          .optional()
          .describe("Comma-separated chain identifiers, e.g. 'eth,base'"),
        tokens: z
          .string()
          .optional()
          .describe("Token symbol filter, e.g. 'USDC'"),
        sort: z.enum(["apy", "tvl"]).optional().describe("Sort field"),
        cursor: z
          .string()
          .optional()
          .describe("Pagination cursor from previous response"),
      },
      async (args) => {
        const url = new URL(`${EARN_API}/v1/earn/vaults`);
        url.searchParams.set("protocols", "morpho");
        if (args.chains) url.searchParams.set("chains", args.chains);
        if (args.tokens) url.searchParams.set("tokens", args.tokens);
        if (args.sort) url.searchParams.set("sort", args.sort);
        if (args.cursor) url.searchParams.set("cursor", args.cursor);

        const res = await fetch(url.toString());
        const data = await res.json();

        // Normalize: parse TVL strings, handle null APY
        // API returns vaults under `data` key, not `vaults`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vaults = (data.data ?? []).map((v: any) => ({
          name: v.name,
          address: v.address,
          chainId: v.chainId,
          network: v.network,
          protocol: v.protocol?.name ?? "unknown",
          tvl: v.analytics?.tvl?.usd ? parseFloat(v.analytics.tvl.usd) : 0,
          apy: {
            base: v.analytics?.apy?.base ?? 0,
            reward: v.analytics?.apy?.reward ?? 0,
            total: v.analytics?.apy?.total ?? 0,
          },
          isTransactional: v.isTransactional ?? false,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                vaults,
                nextCursor: data.nextCursor ?? null,
              }),
            },
          ],
        };
      },
      { annotations: { readOnlyHint: true } }
    ),

    tool(
      "get_deposit_quote",
      "Get a deposit quote from LI.FI Composer for a vault deposit transaction (GET request)",
      {
        fromChain: z
          .string()
          .describe("Source chain, e.g. 'eth' or 'base'"),
        toChain: z
          .string()
          .describe("Destination chain, e.g. 'eth' or 'base'"),
        fromToken: z
          .string()
          .describe("Source token address (e.g. USDC address)"),
        vaultAddress: z
          .string()
          .describe("Target vault address (used as toToken)"),
        fromAmount: z
          .string()
          .describe("Amount in smallest unit (e.g. 1000000 for 1 USDC)"),
        userAddress: z.string().describe("User wallet address"),
      },
      async (args) => {
        // IMPORTANT: /v1/quote is GET, not POST
        const url = new URL(`${COMPOSER_API}/v1/quote`);
        url.searchParams.set("fromChain", args.fromChain);
        url.searchParams.set("toChain", args.toChain);
        url.searchParams.set("fromToken", args.fromToken);
        url.searchParams.set("toToken", args.vaultAddress);
        url.searchParams.set("fromAmount", args.fromAmount);
        url.searchParams.set("fromAddress", args.userAddress);

        const res = await fetch(url.toString(), {
          headers: {
            "x-lifi-api-key": process.env.LIFI_API_KEY!,
          },
        });

        const quote = await res.json();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(quote, null, 2) },
          ],
        };
      },
      { annotations: { readOnlyHint: false } }
    ),

    tool(
      "get_user_positions",
      "Get user DeFi positions from LI.FI Earn portfolio API",
      {
        userAddress: z.string().describe("User wallet address"),
        chains: z
          .string()
          .optional()
          .describe("Comma-separated chains, e.g. 'eth,base'"),
      },
      async (args) => {
        const url = new URL(
          `${EARN_API}/v1/earn/portfolio/${args.userAddress}/positions`
        );
        if (args.chains) url.searchParams.set("chains", args.chains);
        url.searchParams.set("protocols", "morpho");

        const res = await fetch(url.toString());
        const data = await res.json();

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(data, null, 2) },
          ],
        };
      },
      { annotations: { readOnlyHint: true } }
    ),
  ],
});
