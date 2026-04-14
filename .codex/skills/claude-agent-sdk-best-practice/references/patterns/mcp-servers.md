# MCP Servers Patterns

## In-Process Server (Best for Custom Tools)

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-service",
  version: "1.0.0",
  tools: [
    tool(
      "get_user",
      "Fetch user profile by ID",
      {
        userId: z.string().uuid().describe("User UUID"),
        includeHistory: z.boolean().default(false).describe("Include activity history"),
      },
      async (args) => {
        try {
          const user = await db.getUser(args.userId);
          return { content: [{ type: "text", text: JSON.stringify(user) }] };
        } catch (err) {
          return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
        }
      },
      { annotations: { readOnly: true } }
    ),
  ],
});
```

## Four Transport Types

```typescript
mcpServers: {
  // 1. In-process SDK server
  "tools": server,  // McpSdkServerConfigWithInstance

  // 2. Stdio (local process)
  "local": {
    type: "stdio",  // optional, default
    command: "npx",
    args: ["@modelcontextprotocol/server-filesystem"],
    env: { ALLOWED_PATHS: "/tmp" },
  },

  // 3. HTTP (Streamable HTTP) - MUST specify type
  "remote": {
    type: "http",
    url: "https://api.example.com/mcp",
    headers: { Authorization: "Bearer token" },
  },

  // 4. SSE (Server-Sent Events) - MUST specify type
  "stream": {
    type: "sse",
    url: "https://stream.example.com/mcp",
    headers: { Authorization: "Bearer token" },
  },
}
```

## Tool Naming Convention

Format: `mcp__<server-name>__<tool-name>`

```typescript
allowedTools: [
  "mcp__my-service__get_user",
  "mcp__my-service__update_user",
  "mcp__local__read_file",
]
```

## Runtime MCP Management

```typescript
const q = query({ prompt: "...", options: { mcpServers: { ... } } });

// Check status
const status = await q.mcpServerStatus();
// Returns: [{ name, status: 'connected'|'failed'|'needs-auth'|'pending'|'disabled', error?, tools?, config? }]

// Reconnect failed server
await q.reconnectMcpServer("my-server");

// Toggle server on/off
await q.toggleMcpServer("my-server", false);

// Replace dynamic servers
await q.setMcpServers({ "new-server": newConfig });
```

## Zod Schema Best Practices

```typescript
// GOOD: Descriptive with constraints
{
  email: z.string().email().describe("User email address"),
  age: z.number().int().min(0).max(150).describe("Age in years"),
  role: z.enum(["admin", "user", "guest"]).describe("Access role"),
  tags: z.array(z.string()).max(10).optional().describe("Optional tags"),
}

// BAD: No descriptions, no constraints
{
  email: z.string(),
  age: z.number(),
  role: z.string(),
}
```

## Tool Annotations

```typescript
tool("name", "desc", schema, handler, {
  annotations: {
    readOnly: true,       // Tool doesn't modify state
    destructive: false,   // Tool doesn't destroy data
    openWorld: true,      // Tool accesses external resources
  }
})
```

## Common Gotcha: Missing `type` Field

```typescript
// WRONG - causes cryptic "process exited with code 1"
mcpServers: { "api": { url: "https://..." } }

// CORRECT - always specify type for URL-based servers
mcpServers: { "api": { type: "http", url: "https://..." } }
```

## Unicode Sanitization in Handlers

```typescript
// External data may contain U+2028/U+2029 which breaks JSON parsing
async (args) => {
  const data = await fetchExternal(args);
  const safe = JSON.stringify(data)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return { content: [{ type: "text", text: safe }] };
}
```
