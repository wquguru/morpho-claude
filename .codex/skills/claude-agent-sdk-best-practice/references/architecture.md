# Architecture Reference

## SDK Architecture

The Claude Agent SDK is a process-spawning wrapper around the Claude Code CLI. Communication happens over stdin/stdout JSON messages.

```
Your App (Node.js)
  └── @anthropic-ai/claude-agent-sdk (sdk.mjs)
        └── Spawns: cli.js (Claude Code CLI subprocess)
              ├── stdin  ← JSON commands (prompts, tool results, control)
              ├── stdout → JSON messages (assistant, tool_use_summary, result, system)
              └── Bundled: ripgrep, tree-sitter, resvg
```

## Complete Options Type

```typescript
type Options = {
  // Execution Control
  abortController?: AbortController;
  cwd?: string;
  env?: Record<string, string | undefined>;
  executable?: 'bun' | 'deno' | 'node';
  executableArgs?: string[];
  extraArgs?: Record<string, string | null>;
  pathToClaudeCodeExecutable?: string;
  spawnClaudeCodeProcess?: (options: SpawnOptions) => SpawnedProcess;
  debug?: boolean;
  debugFile?: string;
  stderr?: (data: string) => void;

  // Model & Thinking
  model?: string;                    // 'claude-sonnet-4-6', 'claude-opus-4-6', etc.
  fallbackModel?: string;
  thinking?: ThinkingConfig;         // { type: 'adaptive' } | { type: 'enabled', budgetTokens?: number } | { type: 'disabled' }
  effort?: 'low' | 'medium' | 'high' | 'max';
  maxTurns?: number;
  maxBudgetUsd?: number;
  taskBudget?: number;               // Max tool calls per session (v0.2.91+)
  includeHookEvents?: boolean;       // Emit hook lifecycle as SDKMessages (v0.2.91+)

  // System Prompt
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };

  // Tools & Permissions
  tools?: string[] | { type: 'preset'; preset: 'claude_code' };
  allowedTools?: string[];
  disallowedTools?: string[];
  canUseTool?: CanUseTool;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'dontAsk' | 'auto';
  allowDangerouslySkipPermissions?: boolean;
  permissionPromptToolName?: string;

  // Agents
  agent?: string;
  agents?: Record<string, AgentDefinition>;

  // MCP Servers
  mcpServers?: Record<string, McpServerConfig>;
  strictMcpConfig?: boolean;

  // Session Management
  sessionId?: string;
  resume?: string;
  continue?: boolean;
  forkSession?: boolean;
  resumeSessionAt?: string;
  persistSession?: boolean;          // default: true
  enableFileCheckpointing?: boolean;
  additionalDirectories?: string[];

  // Output
  outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> };
  includePartialMessages?: boolean;
  promptSuggestions?: boolean;
  agentProgressSummaries?: boolean;

  // Hooks
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

  // Sandbox
  sandbox?: SandboxSettings;

  // Settings
  settingSources?: ('user' | 'project' | 'local')[];

  // Plugins
  plugins?: { type: 'local'; path: string }[];

  // Betas
  betas?: string[];  // e.g. 'context-1m-2025-08-07'
};
```

## Message Types (SDKMessage union)

| Type | Subtype | Description |
|------|---------|-------------|
| `system` | `init` | Session initialization (contains `session_id`) |
| `system` | `compact_boundary` | Context compaction occurred |
| `system` | `status` | Status changes (compacting) |
| `system` | `hook_started/progress/response` | Hook lifecycle |
| `system` | `task_notification` | Task completed/failed/stopped |
| `system` | `task_started` | Subagent task registered |
| `system` | `task_progress` | Background agent progress |
| `system` | `files_persisted` | File state saved |
| `assistant` | - | Full assistant response (BetaMessage) |
| `user` | - | User messages (isReplay for resumed) |
| `result` | `success` | Final result with cost/usage/structured_output |
| `result` | `error_during_execution` | Runtime error |
| `result` | `error_max_turns` | Hit maxTurns limit |
| `result` | `error_max_budget_usd` | Hit budget limit |
| `result` | `error_max_structured_output_retries` | Schema validation failed |
| `stream_event` | - | Streaming chunks (partial messages) |
| `tool_progress` | - | Tool execution progress |
| `tool_use_summary` | - | Tool use summary |
| `auth_status` | - | Authentication status |

## Result Success Fields

```typescript
type SDKResultSuccess = {
  type: 'result';
  subtype: 'success';
  result: string;
  structured_output?: unknown;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  total_cost_usd: number;
  usage: NonNullableUsage;
  modelUsage: Record<string, ModelUsage>;
  permission_denials: SDKPermissionDenial[];
  stop_reason: string | null;
  terminal_reason?: string;   // Why the session ended (v0.2.91+): 'max_turns' | 'max_budget' | 'task_budget' | etc.
};
```

## Thinking Configuration

```typescript
// Adaptive (Claude decides) - recommended for Opus 4.6+
{ type: 'adaptive' }

// Fixed budget
{ type: 'enabled', budgetTokens: 8192 }

// Disabled
{ type: 'disabled' }
```

## Sandbox Settings (Full)

```typescript
type SandboxSettings = {
  enabled?: boolean;
  failIfUnavailable?: boolean;   // default: true when enabled: true (v0.2.91+). Set false to allow fallback to no sandbox.
  autoAllowBashIfSandboxed?: boolean;
  allowUnsandboxedCommands?: boolean;
  network?: {
    allowedDomains?: string[];
    allowManagedDomainsOnly?: boolean;
    allowUnixSockets?: string[];
    allowAllUnixSockets?: boolean;
    allowLocalBinding?: boolean;
    httpProxyPort?: number;
    socksProxyPort?: number;
  };
  filesystem?: {
    allowWrite?: string[];
    denyWrite?: string[];
    denyRead?: string[];
  };
  ignoreViolations?: Record<string, string[]>;
  enableWeakerNestedSandbox?: boolean;
  excludedCommands?: string[];
};
```

## Custom Process Spawning

For running in VMs, containers, or remote environments:

```typescript
const q = query({
  prompt: "...",
  options: {
    spawnClaudeCodeProcess: (options) => {
      // options: { command, args, cwd, env, signal }
      // Return: SpawnedProcess with stdin, stdout, killed, exitCode, kill(), on()
      return myCustomSpawn(options);
    }
  }
});
```

## Built-in Tools

File: FileRead, FileWrite, FileEdit, NotebookEdit
Search: Glob, Grep
Execution: Bash, TaskOutput, TaskStop
Web: WebFetch, WebSearch
MCP: Mcp, ListMcpResources, ReadMcpResource, SubscribeMcpResource, UnsubscribeMcpResource
Agent: Agent (Task), ExitPlanMode, EnterWorktree
User: AskUserQuestion, TodoWrite
Config: Config
