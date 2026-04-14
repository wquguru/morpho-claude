# Hooks Deep Dive

## Hook Architecture

```typescript
hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

interface HookCallbackMatcher {
  matcher?: string;          // Pattern to match (e.g., tool name for PreToolUse)
  hooks: HookCallback[];     // Array of callbacks
  timeout?: number;          // Timeout in seconds
}

type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

## All 22 Hook Events

### Tool Lifecycle
| Event | When | Can Do |
|-------|------|--------|
| `PreToolUse` | Before tool execution | Approve/block/modify input, add context |
| `PostToolUse` | After tool success | Add context, update MCP output |
| `PostToolUseFailure` | After tool failure | Add context |

### Permission
| Event | When | Can Do |
|-------|------|--------|
| `PermissionRequest` | Permission needed | Allow/deny with updated input/permissions |

### Elicitation
| Event | When | Can Do |
|-------|------|--------|
| `Elicitation` | MCP server requests user input or auth | Accept/decline or shape response flow |
| `ElicitationResult` | Elicitation completes | Audit accepted/declined responses |

### User Input
| Event | When | Can Do |
|-------|------|--------|
| `UserPromptSubmit` | User sends prompt | Add context, modify prompt |

### Session Lifecycle
| Event | When | Can Do |
|-------|------|--------|
| `SessionStart` | On startup/resume/clear/compact | Add system message |
| `SessionEnd` | Session ends | Cleanup (exit reason provided) |
| `Stop` | Agent stops | Cleanup, access last assistant message |
| `Setup` | On init or maintenance | Initialize state |

### Agent Lifecycle
| Event | When | Can Do |
|-------|------|--------|
| `SubagentStart` | Subagent spawned | Track delegation |
| `SubagentStop` | Subagent completed | Aggregate results |
| `TeammateIdle` | Teammate becomes idle | Coordinate work |
| `TaskCompleted` | Task completes | Process results |

### System
| Event | When | Can Do |
|-------|------|--------|
| `PreCompact` | Before context compaction | Save state |
| `PostCompact` | After context compaction | Restore derived state, audit compaction |
| `Notification` | Agent notification | Display/log |
| `ConfigChange` | Settings file changed | Audit, block |
| `InstructionsLoaded` | CLAUDE.md or instruction file loaded | Inspect instruction source, audit load path |
| `WorktreeCreate` | Git worktree created | Track |
| `WorktreeRemove` | Git worktree removed | Cleanup |

## Hook Output Types

```typescript
// Synchronous output
type SyncHookJSONOutput = {
  continue?: boolean;           // Continue processing
  suppressOutput?: boolean;     // Hide output
  stopReason?: string;          // Stop agent with reason
  decision?: 'approve' | 'block';  // For PreToolUse
  systemMessage?: string;       // Inject system message
  reason?: string;              // Explanation
  hookSpecificOutput?: ...;     // Event-specific data
};

// Async output (for long-running hooks)
type AsyncHookJSONOutput = {
  async: true;
  asyncTimeout?: number;        // Custom timeout
};
```

## Practical Examples

### Audit Logger

```typescript
hooks: {
  PreToolUse: [{
    hooks: [async (input) => {
      console.log(`[AUDIT] Tool: ${input.tool_name}, Input: ${JSON.stringify(input.tool_input)}`);
      return {};
    }]
  }],
  PostToolUse: [{
    hooks: [async (input) => {
      await db.log({
        tool: input.tool_name,
        input: input.tool_input,
        output: input.tool_response,
        timestamp: new Date(),
      });
      return {};
    }]
  }],
}
```

### Bash Command Guard

```typescript
hooks: {
  PreToolUse: [{
    matcher: "Bash",
    hooks: [async (input) => {
      const cmd = input.tool_input?.command || "";
      const blocked = ["rm -rf", "dd if=", "mkfs", "> /dev/", "shutdown"];
      if (blocked.some(p => cmd.includes(p))) {
        return { decision: "block", reason: `Blocked dangerous command: ${cmd}` };
      }
      return { decision: "approve" };
    }]
  }],
}
```

### Session Context Injection

```typescript
hooks: {
  SessionStart: [{
    hooks: [async (input) => {
      const context = await loadProjectContext();
      return { systemMessage: `Project context:\n${context}` };
    }]
  }],
}
```

### Permission Request Handler

```typescript
hooks: {
  PermissionRequest: [{
    hooks: [async (input) => {
      // Auto-approve read operations
      if (["Read", "Grep", "Glob"].includes(input.tool_name)) {
        return {
          hookSpecificOutput: {
            allow: true,
            updatedPermissions: [{ type: "addRules", rules: [...], destination: "session" }]
          }
        };
      }
      // Block everything else
      return {
        hookSpecificOutput: {
          allow: false,
          message: "Only read operations allowed",
        }
      };
    }]
  }],
}
```

### Subagent Tracking

```typescript
const activeSubagents = new Set<string>();

hooks: {
  SubagentStart: [{
    hooks: [async (input) => {
      activeSubagents.add(input.agent_id);
      console.log(`Subagent started: ${input.agent_type} (${input.agent_id})`);
      return {};
    }]
  }],
  SubagentStop: [{
    hooks: [async (input) => {
      activeSubagents.delete(input.agent_id);
      console.log(`Subagent stopped: ${input.agent_id}`);
      return {};
    }]
  }],
  Stop: [{
    hooks: [async () => {
      if (activeSubagents.size > 0) {
        console.warn(`Orphaned subagents: ${[...activeSubagents].join(", ")}`);
      }
      return {};
    }]
  }],
}
```

### Config Change Auditor (v0.2.49+)

```typescript
hooks: {
  ConfigChange: [{
    hooks: [async (input) => {
      // input.source: 'user' | 'project' | 'local' | 'policy' | 'skills'
      console.log(`Config changed: ${input.source} - ${input.file_path}`);
      // Return { decision: "block" } to prevent the change
      return {};
    }]
  }],
}
```
