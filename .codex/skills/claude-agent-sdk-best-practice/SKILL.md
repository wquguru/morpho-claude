---
name: claude-agent-sdk-best-practice
description: |
  Claude Agent SDK v0.2.101 best practices and complete API reference. Use when: building AI agents with @anthropic-ai/claude-agent-sdk, designing multi-agent systems, configuring MCP servers, implementing hooks/permissions, using structured outputs, managing sessions, or troubleshooting SDK errors. Covers query() API, V2 session API, 22 hook events, sandbox, worktree isolation, and current public configuration options.
allowed-tools: "Read,Glob,Grep,Bash,Write,Edit,Task"
version: "1.2.0"
---

# Claude Agent SDK Best Practice Guide

**Package**: `@anthropic-ai/claude-agent-sdk@0.2.101` | **Peer dep**: `zod ^4.0.0` | **Node.js**: >= 18 | **ESM only**

---

## Quick Reference

### Core Concepts

| Concept | Description | Key API |
|---------|-------------|---------|
| `query()` | Primary V1 API - returns async generator | `query({ prompt, options })` |
| V2 Session | Multi-turn persistent session (unstable) | `unstable_v2_createSession()` |
| Agents | Subagent definitions for task delegation | `options.agents` |
| MCP Servers | Custom tools via Model Context Protocol | `createSdkMcpServer()`, `tool()` |
| Hooks | 22 event callbacks for middleware | `options.hooks` |
| Structured Output | JSON schema validated responses | `options.outputFormat` |
| Permissions | Fine-grained tool access control | `canUseTool`, `permissionMode` |
| Sandbox | Secure execution isolation | `options.sandbox` |

### Essential Imports

```typescript
import {
  forkSession,                    // Fork existing transcript into a new branch
  getSessionInfo,                 // Read single-session metadata
  getSessionMessages,             // Read session history
  listSessions,                   // List past sessions
  listSubagents,                  // List subagents for a session (v0.2.89+)
  getSubagentMessages,            // Read subagent message history (v0.2.89+)
  query,                          // V1 API
  renameSession,                  // Set custom transcript title
  tagSession,                     // Set/clear transcript tag
  createSdkMcpServer,            // In-process MCP server
  tool,                           // MCP tool helper
  unstable_v2_createSession,      // V2 session API
  unstable_v2_resumeSession,      // V2 resume
  unstable_v2_prompt,             // V2 one-shot
} from "@anthropic-ai/claude-agent-sdk";
```

### Key Configuration Patterns

```typescript
// Minimal agent
const q = query({ prompt: "Analyze this code", options: { model: "claude-sonnet-4-6" } });

// Production agent with safety
const q = query({
  prompt: "Deploy to staging",
  options: {
    model: "claude-sonnet-4-6",
    permissionMode: "default",
    allowedTools: ["Read", "Grep", "Glob", "Bash"],
    sandbox: { enabled: true, autoAllowBashIfSandboxed: true },
    maxTurns: 20,
    maxBudgetUsd: 5.0,
    thinking: { type: "adaptive" },
  }
});

// CI/CD headless agent
const q = query({
  prompt: taskFromCI,
  options: {
    model: "claude-sonnet-4-6",
    permissionMode: "bypassPermissions",
    settingSources: ["project"],
    sandbox: { enabled: true },
    maxBudgetUsd: 10.0,
    taskBudget: 50,                        // Max tool calls (v0.2.91+)
    includeHookEvents: true,               // Emit hook lifecycle messages (v0.2.91+)
    outputFormat: { type: "json_schema", schema: resultSchema },
  }
});
```

---

## Query API (V1) - Core Pattern

```typescript
const q = query({ prompt: "...", options: { ... } });

for await (const message of q) {
  switch (message.type) {
    case "system":
      if (message.subtype === "init") sessionId = message.session_id;
      break;
    case "assistant":
      // Full assistant response with BetaMessage
      break;
    case "result":
      if (message.subtype === "success") {
        console.log(message.result);
        console.log(message.structured_output); // if outputFormat set
        console.log(`Cost: $${message.total_cost_usd}`);
      }
      break;
  }
}
```

### Query Control Methods

```typescript
const q = query({ prompt: "..." });
await q.interrupt();                          // Interrupt current turn
await q.setModel("claude-opus-4-6");          // Switch model mid-session
await q.setPermissionMode("acceptEdits");     // Change permissions
q.close();                                    // Force terminate

// Introspection
const agents = await q.supportedAgents();
const models = await q.supportedModels();
const status = await q.mcpServerStatus();
const account = await q.accountInfo();
const usage = await q.getContextUsage();      // Token budget breakdown by category (v0.2.86+)
const settings = await q.getSettings();       // Applied settings: model, effort, etc. (v0.2.72+)

// Subagent inspection (v0.2.89+)
const subagents = await q.listSubagents(sessionId);
const subMsgs = await q.getSubagentMessages(sessionId, subagentId);

// MCP management
await q.reconnectMcpServer("my-server");
await q.toggleMcpServer("my-server", false);
await q.setMcpServers({ "new-server": config });
await q.enableChannel("my-server", "channel-name"); // Activate MCP channel (v0.2.84+)

// Plugin management (v0.2.85+)
await q.reloadPlugins();

// File checkpointing (requires enableFileCheckpointing: true)
await q.rewindFiles(userMessageId);
```

---

## Structured Output

```typescript
const q = query({
  prompt: "Analyze this PR",
  options: {
    outputFormat: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
          issues: { type: "array", items: { type: "string" } }
        },
        required: ["summary", "risk_level", "issues"]
      }
    }
  }
});

for await (const msg of q) {
  if (msg.type === "result" && msg.subtype === "success") {
    const output = msg.structured_output; // Guaranteed to match schema
  }
}
```

**Error**: If validation fails repeatedly → `subtype: "error_max_structured_output_retries"`

---

## Agent Definitions (Subagents)

```typescript
options: {
  agents: {
    "code-reviewer": {
      description: "Review code for bugs and style issues",
      prompt: "You are a code reviewer. Check for bugs, security issues, and style.",
      tools: ["Read", "Grep", "Glob"],
      model: "sonnet",
      maxTurns: 15,
    },
    "test-runner": {
      description: "Run test suites and report results",
      prompt: "Run all tests. Report failures clearly with file:line references.",
      tools: ["Bash", "Read"],
      model: "haiku",
      maxTurns: 10,
    },
    "architect": {
      description: "Design system architecture for complex features",
      prompt: "You design software architecture. Consider scalability and maintainability.",
      model: "opus",
      skills: ["system-design-patterns"],
    }
  }
}
```

**AgentDefinition fields**: `description` (required), `prompt` (required), `tools?`, `disallowedTools?`, `model?` ('sonnet'|'opus'|'haiku'|'inherit'), `mcpServers?`, `skills?`, `maxTurns?`, `criticalSystemReminder_EXPERIMENTAL?`

**Runtime spawn** (Agent tool): supports `run_in_background`, `isolation: "worktree"` (git worktree), `mode`, `resume` (agent ID)

---

## MCP Servers

### In-Process Server (Recommended)

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-tools",
  version: "1.0.0",
  tools: [
    tool(
      "search_tickets",
      "Search support tickets by keyword",
      {
        query: z.string().describe("Search keyword"),
        status: z.enum(["open", "closed", "all"]).describe("Filter by status"),
      },
      async (args) => {
        const results = await db.searchTickets(args.query, args.status);
        return { content: [{ type: "text", text: JSON.stringify(results) }] };
      },
      { annotations: { readOnly: true } }  // MCP tool annotations
    )
  ]
});

// Use in query
query({ prompt: "...", options: { mcpServers: { "my-tools": server } } });
```

### External Servers

```typescript
mcpServers: {
  // Stdio
  "fs": { command: "npx", args: ["@modelcontextprotocol/server-filesystem"] },
  // HTTP (MUST specify type)
  "api": { type: "http", url: "https://api.example.com/mcp", headers: { Authorization: "Bearer ..." } },
  // SSE
  "stream": { type: "sse", url: "https://stream.example.com/mcp" },
}
```

**Tool naming**: `mcp__<server-name>__<tool-name>` (double underscores)

---

## Hooks (22 Events)

```typescript
hooks: {
  PreToolUse: [{ matcher: "Bash", hooks: [async (input) => {
    const command = (input.tool_input as { command?: string }).command ?? "";
    if (command.includes("rm -rf")) {
      return { decision: "block", reason: "Destructive command blocked" };
    }
    return { decision: "approve" };
  }] }],

  PostToolUse: [{ hooks: [async (input) => {
    await auditLog(input.tool_name, input.tool_input, input.tool_response);
    return {};
  }] }],

  SessionStart: [{ hooks: [async (input) => {
    return { systemMessage: "Additional context for this session" };
  }] }],

  Stop: [{ hooks: [async (input) => {
    await cleanup();
    return {};
  }] }],
}
```

**All 22 events**: PreToolUse, PostToolUse, PostToolUseFailure, Notification, UserPromptSubmit, SessionStart, SessionEnd, Stop, SubagentStart, SubagentStop, PreCompact, PostCompact, PermissionRequest, Setup, TeammateIdle, TaskCompleted, Elicitation, ElicitationResult, ConfigChange, WorktreeCreate, WorktreeRemove, InstructionsLoaded

---

## Permission System

```typescript
// Permission modes: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'dontAsk' | 'auto'

// Custom permission callback
canUseTool: async (toolName, input, options) => {
  // options: { signal, suggestions?, blockedPath?, decisionReason?, toolUseID, agentID? }

  if (["Read", "Grep", "Glob"].includes(toolName))
    return { behavior: "allow" };

  if (toolName === "Bash" && /rm\s+-rf|dd\s+if=/.test(input.command))
    return { behavior: "deny", message: "Destructive command blocked" };

  return { behavior: "allow", updatedInput: input };
  // Can also return updatedPermissions for persistent rule changes
}
```

---

## V2 Session API (Unstable)

```typescript
// Create session
const session = unstable_v2_createSession({
  model: "claude-sonnet-4-6",
  permissionMode: "acceptEdits",
  allowedTools: ["Read", "Write", "Edit", "Bash"],
});

// Send message and stream response
await session.send("Build a REST API for user management");
for await (const msg of session.stream()) {
  console.log(msg);
}

// Continue conversation
await session.send("Now add authentication");
for await (const msg of session.stream()) { ... }

// Cleanup (supports Symbol.asyncDispose)
session.close();

// Resume later
const resumed = unstable_v2_resumeSession(session.sessionId, { ... });
```

---

## Anti-Patterns & Common Mistakes

### 1. Missing `type` on URL-based MCP servers
```typescript
// WRONG - cryptic "process exited with code 1"
mcpServers: { "api": { url: "https://..." } }
// CORRECT
mcpServers: { "api": { type: "http", url: "https://..." } }
```

### 2. Unicode line separators in MCP tool results
```typescript
// Sanitize external data in MCP handlers
const sanitized = content.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
```

### 3. Using bypassPermissions in production
```typescript
// WRONG - security risk
permissionMode: "bypassPermissions"
// CORRECT - use sandbox + specific permissions
permissionMode: "default",
sandbox: { enabled: true, autoAllowBashIfSandboxed: true },
canUseTool: async (tool, input) => { /* fine-grained logic */ }
```

### 4. Not capturing session ID
```typescript
// ALWAYS capture for resume/fork
for await (const msg of q) {
  if (msg.type === "system" && msg.subtype === "init") {
    sessionId = msg.session_id;  // Save this!
  }
}
```

### 5. Ignoring maxTurns and maxBudgetUsd
```typescript
// ALWAYS set limits in production
options: { maxTurns: 30, maxBudgetUsd: 10.0 }
```

### 6. Sandbox failing silently when unavailable
```typescript
// sandbox.failIfUnavailable defaults to true when enabled: true (v0.2.91+)
// If the sandbox binary is missing, the query will THROW instead of running unsandboxed
// WRONG for environments where sandbox may not be installed
sandbox: { enabled: true }
// CORRECT for graceful degradation
sandbox: { enabled: true, failIfUnavailable: false }
// CORRECT for explicit hard requirement
sandbox: { enabled: true, failIfUnavailable: true }
```

### 7. Orphaned subagents on parent stop
```typescript
// Subagents don't auto-stop when parent stops
// Use Stop hook for cleanup
hooks: { Stop: [{ hooks: [async () => { await cleanupSubagents(); }] }] }
```

---

## Code Review Checklist

- [ ] `maxTurns` and `maxBudgetUsd` set for all production queries
- [ ] `permissionMode` appropriate for environment (never bypass in prod without sandbox)
- [ ] `canUseTool` blocks destructive commands
- [ ] Session ID captured from init message if resume/fork needed
- [ ] MCP server configs include `type` field for URL-based servers
- [ ] Zod schemas use `.describe()` on all fields
- [ ] MCP tool handlers sanitize Unicode (U+2028, U+2029)
- [ ] Error handling covers all `SDKResultError` subtypes
- [ ] `AbortController` passed for cancellation support
- [ ] Subagent cleanup handled in Stop hooks
- [ ] `settingSources` explicitly set (default is `[]` - no filesystem settings)
- [ ] Sandbox enabled for untrusted input scenarios

---

## Reference Docs

- Architecture & full Options type: [references/architecture.md](references/architecture.md)
- MCP server patterns: [references/patterns/mcp-servers.md](references/patterns/mcp-servers.md)
- Hooks deep dive: [references/patterns/hooks.md](references/patterns/hooks.md)
- Session management: [references/patterns/sessions.md](references/patterns/sessions.md)
- Error reference: [references/checklists/error-reference.md](references/checklists/error-reference.md)
- Subagent patterns: [references/patterns/subagents.md](references/patterns/subagents.md)
- Sandbox & security: [references/patterns/sandbox-security.md](references/patterns/sandbox-security.md)

---

**Last verified**: 2026-04-11 | **SDK version**: 0.2.101 | **Claude Code parity**: v2.1.101
