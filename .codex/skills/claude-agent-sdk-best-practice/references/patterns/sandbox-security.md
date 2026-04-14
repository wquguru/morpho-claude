# Sandbox & Security Patterns

## Sandbox Configuration

```typescript
sandbox: {
  enabled: true,
  autoAllowBashIfSandboxed: true,     // Auto-approve bash in sandbox
  allowUnsandboxedCommands: false,     // Deny unsandboxable commands
  excludedCommands: ["rm", "dd"],      // Never auto-approve these

  network: {
    allowedDomains: ["api.example.com", "registry.npmjs.org"],
    allowManagedDomainsOnly: false,
    allowLocalBinding: false,
    httpProxyPort: 8080,
  },

  filesystem: {
    allowWrite: ["/tmp", "/workspace"],
    denyWrite: ["/etc", "/root", "/home"],
    denyRead: ["/etc/shadow", "/root/.ssh"],
  },
}
```

## Permission Modes

| Mode | File Edits | Bash | Use Case |
|------|-----------|------|----------|
| `default` | Prompt | Prompt | General use |
| `acceptEdits` | Auto | Prompt | Trusted refactoring |
| `bypassPermissions` | Auto | Auto | CI/CD + sandbox only |
| `plan` | Blocked | Blocked | Planning workflows |
| `dontAsk` | Blocked | Blocked | Read-only analysis |

## canUseTool Callback (Full Signature)

```typescript
canUseTool: async (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    suggestions?: PermissionUpdate[];
    blockedPath?: string;
    decisionReason?: string;
    toolUseID: string;
    agentID?: string;
  }
) => Promise<PermissionResult>

type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown>; updatedPermissions?: PermissionUpdate[] }
  | { behavior: 'deny'; message: string; interrupt?: boolean };
```

## Security Patterns

### Production Agent

```typescript
const q = query({
  prompt: taskFromUser,
  options: {
    model: "claude-sonnet-4-6",
    permissionMode: "default",
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
      excludedCommands: ["rm", "dd", "mkfs", "shutdown"],
      network: { allowedDomains: ["api.internal.com"] },
      filesystem: { denyWrite: ["/etc", "/root"] },
    },
    canUseTool: async (tool, input) => {
      // Block destructive commands
      if (tool === "Bash" && /rm\s+-rf|dd\s+if=|>\s*\/dev\//.test(input.command as string)) {
        return { behavior: "deny", message: "Destructive command blocked" };
      }
      return { behavior: "allow" };
    },
    maxTurns: 30,
    maxBudgetUsd: 10.0,
  }
});
```

### CI/CD Agent

```typescript
const q = query({
  prompt: ciTask,
  options: {
    model: "claude-sonnet-4-6",
    permissionMode: "bypassPermissions",  // OK because sandboxed
    sandbox: { enabled: true, autoAllowBashIfSandboxed: true },
    settingSources: ["project"],  // Consistent behavior
    maxTurns: 50,
    maxBudgetUsd: 20.0,
    abortController: new AbortController(),  // For timeout
  }
});
```

### Read-Only Analyzer

```typescript
const q = query({
  prompt: "Analyze this codebase for issues",
  options: {
    model: "claude-sonnet-4-6",
    permissionMode: "dontAsk",
    tools: ["Read", "Grep", "Glob"],
    disallowedTools: ["Write", "Edit", "Bash"],
  }
});
```

## AbortController for Timeouts

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min

try {
  const q = query({
    prompt: "...",
    options: { abortController: controller }
  });
  for await (const msg of q) { ... }
} catch (err) {
  if (err instanceof AbortError) {
    console.log("Query timed out");
  }
} finally {
  clearTimeout(timeout);
}
```

## Permission Updates (Persistent Rules)

```typescript
canUseTool: async (tool, input, options) => {
  return {
    behavior: "allow",
    updatedPermissions: [{
      type: "addRules",
      rules: [{ tool: "Bash", allow: true, pattern: "npm test" }],
      destination: "session",  // 'userSettings' | 'projectSettings' | 'localSettings' | 'session' | 'cliArg'
    }]
  };
}
```
