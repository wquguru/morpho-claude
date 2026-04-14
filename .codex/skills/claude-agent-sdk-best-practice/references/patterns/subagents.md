# Subagent Patterns

## AgentDefinition (Complete)

```typescript
type AgentDefinition = {
  description: string;                          // When to use (required)
  prompt: string;                               // System prompt (required)
  tools?: string[];                             // Allowed tools
  disallowedTools?: string[];                   // Blocked tools
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  mcpServers?: AgentMcpServerSpec[];            // MCP servers for this agent
  skills?: string[];                            // Skills to load
  maxTurns?: number;                            // Turn limit
  criticalSystemReminder_EXPERIMENTAL?: string; // Persistent reminder
};
```

## Runtime Agent Spawn (Task Tool)

```typescript
// The main agent spawns subagents via the Task/Agent tool
interface AgentInput {
  description: string;       // 3-5 word task description
  prompt: string;            // Task for the agent
  subagent_type: string;     // Agent name from agents config
  model?: 'sonnet' | 'opus' | 'haiku';
  resume?: string;           // Agent ID to resume
  run_in_background?: boolean;
  max_turns?: number;
  isolation?: 'worktree';   // Git worktree isolation
  mode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan';
}
```

## Design Patterns

### CI/CD Pipeline

```typescript
agents: {
  "linter": {
    description: "Run linting and formatting checks",
    prompt: "Run ESLint, Prettier, and TypeScript type checking. Report all violations.",
    tools: ["Bash", "Read"],
    model: "haiku",
    maxTurns: 5,
  },
  "tester": {
    description: "Run test suites and verify coverage",
    prompt: "Run all tests. Report failures with file:line references. Fail if coverage < 80%.",
    tools: ["Bash", "Read"],
    model: "haiku",
    maxTurns: 10,
  },
  "security-scanner": {
    description: "Scan for security vulnerabilities",
    prompt: "Check for exposed secrets, dependency vulnerabilities, OWASP issues. Block on critical.",
    tools: ["Read", "Grep", "Bash"],
    model: "sonnet",
    maxTurns: 15,
  },
  "deployer": {
    description: "Deploy application to target environment",
    prompt: "Deploy to staging first, verify health, then production. Always have rollback ready.",
    tools: ["Bash", "Read"],
    model: "sonnet",
    maxTurns: 20,
  },
}
```

### Multi-Reviewer Code Review

```typescript
agents: {
  "style-checker": {
    description: "Check code style and formatting",
    tools: ["Read", "Grep"],
    model: "haiku",
    maxTurns: 5,
    prompt: "Check formatting, naming conventions, import ordering. Quick pass only.",
  },
  "logic-reviewer": {
    description: "Review business logic and algorithms",
    tools: ["Read", "Grep", "Glob"],
    model: "sonnet",
    maxTurns: 15,
    prompt: "Review algorithmic correctness, edge cases, performance. Suggest improvements.",
  },
  "security-reviewer": {
    description: "Review for security vulnerabilities",
    tools: ["Read", "Grep"],
    model: "sonnet",
    maxTurns: 10,
    prompt: "Check for injection, XSS, auth bypass, data exposure. FAIL on critical issues.",
  },
}
```

### Worktree Isolation

```typescript
// Agents can work in isolated git worktrees
agents: {
  "feature-builder": {
    description: "Build features in isolated worktree",
    prompt: "Implement the feature. Work in your isolated worktree.",
    tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
    model: "sonnet",
  },
}

// At runtime, the main agent can spawn with isolation:
// Agent tool: { subagent_type: "feature-builder", isolation: "worktree", ... }
```

## Model Selection Guide

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Linting, formatting | haiku | Fast, deterministic |
| Test running | haiku | Speed over reasoning |
| Code review | sonnet | Balance of speed and analysis |
| Security audit | sonnet | Needs careful analysis |
| Architecture design | opus | Complex reasoning |
| Simple file operations | haiku | Cost-effective |
| Deployment | sonnet | Reliability matters |

## Known Issue: Orphaned Subagents

Subagents don't auto-stop when parent stops. Implement cleanup:

```typescript
hooks: {
  Stop: [{
    hooks: [async () => {
      // Track and cleanup active subagents
      console.log("Parent stopping - cleaning up subagents");
      return {};
    }]
  }],
}
```

## Best Practices

- Give each agent a single, clear responsibility
- Use `maxTurns` to prevent runaway agents
- Match model to task complexity (haiku for simple, sonnet for analysis, opus for reasoning)
- Restrict tools to minimum needed per agent
- Use descriptive `description` fields - the main agent uses these to decide delegation
- Test agents independently before orchestrating
- Use `run_in_background: true` for parallel independent tasks
- Use `isolation: "worktree"` when agents modify files concurrently
