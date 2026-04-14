# Session Management Patterns

## V1 Session API (query-based)

### Capture Session ID

```typescript
let sessionId: string;
const q = query({ prompt: "Build a REST API", options: { model: "claude-sonnet-4-6" } });

for await (const msg of q) {
  if (msg.type === "system" && msg.subtype === "init") {
    sessionId = msg.session_id;  // ALWAYS capture this
  }
}
```

### Resume Session

```typescript
const q = query({
  prompt: "Now add authentication",
  options: { resume: sessionId }
});
```

**Preserved**: All messages, context, files modified, decisions
**NOT preserved**: env vars, tool availability, permission settings (re-specify)

### Fork Session

```typescript
const q = query({
  prompt: "Try GraphQL instead of REST",
  options: { resume: sessionId, forkSession: true }
});
// Original session unchanged, new session created
```

### Continue Session

```typescript
const q = query({
  prompt: "Add more tests",
  options: { continue: true }  // Differs from resume - continues last session
});
```

## V2 Session API (Unstable)

```typescript
import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  unstable_v2_prompt,
} from "@anthropic-ai/claude-agent-sdk";

// Create
const session = unstable_v2_createSession({
  model: "claude-sonnet-4-6",
  permissionMode: "acceptEdits",
  allowedTools: ["Read", "Write", "Edit", "Bash"],
});

// Multi-turn conversation
await session.send("Build a REST API");
for await (const msg of session.stream()) { console.log(msg); }

await session.send("Add authentication");
for await (const msg of session.stream()) { console.log(msg); }

// Cleanup (supports Symbol.asyncDispose)
session.close();

// Resume later
const resumed = unstable_v2_resumeSession(session.sessionId, { model: "claude-sonnet-4-6" });

// One-shot convenience
const result = await unstable_v2_prompt("Quick question", { model: "claude-sonnet-4-6" });
```

## Session Utilities

```typescript
import {
  forkSession,
  getSessionInfo,
  getSessionMessages,
  listSessions,
  renameSession,
  tagSession,
} from "@anthropic-ai/claude-agent-sdk";

// List past sessions
const sessions = await listSessions({ limit: 20 });
// Returns: [{ sessionId, summary, lastModified, fileSize, customTitle?, firstPrompt?, gitBranch?, cwd?, tag?, createdAt? }]

// Read metadata for one session
const info = await getSessionInfo(sessionId);
// Returns: { sessionId, summary, lastModified, ... } | undefined

// Read session history
const messages = await getSessionMessages(sessionId, { limit: 50, offset: 0, includeSystemMessages: false });

// Fork transcript into a new branch without re-running the conversation
const { sessionId: forkedId } = await forkSession(sessionId, {
  upToMessageId: "assistant-message-uuid",
  title: "Experiment branch",
});

// Add user-visible metadata to existing transcripts
await renameSession(sessionId, "Payments migration");
await tagSession(sessionId, "staging");
```

## Session Configuration Knobs

```typescript
const q = query({
  prompt: "Continue from the security audit",
  options: {
    resume: sessionId,
    resumeSessionAt: "assistant-message-uuid", // Resume from a specific point
    sessionId: "550e8400-e29b-41d4-a716-446655440000", // Optional custom UUID
    persistSession: true, // Set false for ephemeral automation
    promptSuggestions: true, // Emit prompt_suggestion after result messages
  },
});
```

- `resumeSessionAt` is useful for replaying from a known checkpoint inside an existing transcript.
- `sessionId` lets you pre-assign a UUID for correlation across systems.
- `persistSession: false` disables transcript writes entirely, so the session cannot be resumed later.
- `promptSuggestions` is session-adjacent: you must keep iterating after `result` to receive the suggestion event.

## Subagent Inspection (v0.2.89+)

```typescript
import { listSubagents, getSubagentMessages } from "@anthropic-ai/claude-agent-sdk";

// List all subagents spawned within a session
const subagents = await listSubagents(sessionId);
// Returns: [{ subagentId, parentSessionId, startedAt, ... }]

// Read a subagent's message history
const subMsgs = await getSubagentMessages(sessionId, subagentId);

// Also available as query control methods:
const subagents2 = await q.listSubagents(sessionId);
const subMsgs2 = await q.getSubagentMessages(sessionId, subagentId);
```

## Recent Additions Since 0.2.59

- New transcript utilities: `forkSession()`, `getSessionInfo()`, `renameSession()`, `tagSession()`
- New session-adjacent hooks: `PostCompact`, `Elicitation`, `ElicitationResult`, `InstructionsLoaded`
- New orchestration option: `agentProgressSummaries` for periodic subagent progress summaries
- New subagent inspection utilities: `listSubagents()`, `getSubagentMessages()` (v0.2.89+)
- `getSessionMessages` now accepts `includeSystemMessages?: boolean` (v0.2.89+)
- New execution limits: `taskBudget` (max tool calls), `includeHookEvents` (v0.2.91+)

## Session Patterns

### Sequential Development

```typescript
let sid = await startAndCapture("Create user model");
sid = await resumeAndCapture(sid, "Add validation");
sid = await resumeAndCapture(sid, "Write tests");
sid = await resumeAndCapture(sid, "Add API endpoints");
```

### A/B Exploration

```typescript
const base = await startAndCapture("Design payment system");
const stripeVersion = await forkAndCapture(base, "Implement with Stripe");
const paypalVersion = await forkAndCapture(base, "Implement with PayPal");
// Compare results, choose winner
```

### Session Rotation (Prevent Context Overflow)

```typescript
const MAX_TURNS = 50;
let turnCount = 0;
let currentSession: string;

async function safeQuery(prompt: string) {
  if (turnCount > MAX_TURNS) {
    // Start fresh with summary
    const summary = await getSummary(currentSession);
    currentSession = await startAndCapture(`Continue: ${summary}\n\n${prompt}`);
    turnCount = 0;
  } else {
    currentSession = await resumeAndCapture(currentSession, prompt);
    turnCount++;
  }
}
```

### File Checkpointing

```typescript
const q = query({
  prompt: "Refactor auth module",
  options: { enableFileCheckpointing: true }
});

let checkpointId: string;
for await (const msg of q) {
  if (msg.type === "user" && msg.uuid) {
    checkpointId = msg.uuid;  // Save for potential rollback
  }
}

// Rollback if needed
await q.rewindFiles(checkpointId);
```

## Best Practices

- Always capture `session_id` from init message
- Set `maxTurns` and `maxBudgetUsd` to prevent runaway sessions
- Use `forkSession()` for transcript branching and `options.forkSession = true` for query-time branching
- Use `getSessionInfo()` before expensive history reads if you only need summary/title metadata
- Rotate sessions proactively before hitting context limits
- Store session IDs in persistent storage for production use
- Re-specify `permissionMode`, `allowedTools`, and `env` on resume
- Use `persistSession: false` only for intentionally ephemeral automation
- Use `enableFileCheckpointing` for risky refactoring operations
