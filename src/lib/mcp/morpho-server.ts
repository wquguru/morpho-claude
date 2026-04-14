import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { fetchUSDCVaults } from "../morpho/api";
import { morphoClient } from "../morpho/client";
import { GET_VAULT_ALLOCATIONS, GET_USER_POSITIONS } from "../morpho/queries";

export const morphoToolsServer = createSdkMcpServer({
  name: "morpho-tools",
  version: "1.0.0",
  tools: [
    tool(
      "fetch_usdc_vaults",
      "Fetch all USDC-denominated Morpho vaults on Ethereum and Base with APY and TVL data",
      {},
      async () => {
        const vaults = await fetchUSDCVaults();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(vaults, null, 2) }],
        };
      },
      { annotations: { readOnlyHint: true } }
    ),

    tool(
      "fetch_vault_allocations",
      "Get the underlying market allocations for a specific Morpho vault",
      {
        vaultAddress: z.string().describe("The vault contract address"),
        chainId: z
          .number()
          .describe("Chain ID (1 = Ethereum, 8453 = Base)"),
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
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      },
      { annotations: { readOnlyHint: true } }
    ),

    tool(
      "fetch_user_positions",
      "Get user vault positions on a specific chain",
      {
        userAddress: z.string().describe("User wallet address"),
        chainId: z
          .number()
          .describe("Chain ID (1 = Ethereum, 8453 = Base)"),
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
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      },
      { annotations: { readOnlyHint: true } }
    ),
  ],
});
