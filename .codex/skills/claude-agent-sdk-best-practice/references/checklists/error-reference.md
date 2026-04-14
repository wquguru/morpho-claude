# Error Reference

## Result Error Types

| Subtype | Cause | Solution |
|---------|-------|----------|
| `error_during_execution` | Runtime error | Check error messages, fix tool implementations |
| `error_max_turns` | Hit maxTurns limit | Increase maxTurns or break task into smaller pieces |
| `error_max_budget_usd` | Hit budget limit | Increase maxBudgetUsd or optimize prompts |
| `error_max_structured_output_retries` | Schema validation failed | Simplify schema, add descriptions |

## Assistant Message Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `authentication_failed` | Invalid or missing authentication | Check your Claude Code auth flow or token configuration |
| `billing_error` | Billing issue | Check account billing |
| `rate_limit` | Too many requests | Implement retry with backoff |
| `invalid_request` | Bad request | Check prompt/options |
| `server_error` | Anthropic server issue | Retry |
| `max_output_tokens` | Response too long | Increase limit or simplify task |

## Common Errors & Solutions

### 1. CLI Not Found
```
Error: Claude Code CLI not installed
```
**Fix**: `npm install -g @anthropic-ai/claude-code`

### 2. Authentication Failed
```
Error: authentication failed
```
**Fix**: Re-auth with `claude auth login`, or if you use token-based auth set the expected token env var for your environment (for this repo, `ANTHROPIC_AUTH_TOKEN`).

### 3. Permission Denied
```
Error: Tool use blocked
```
**Fix**: Add tool to `allowedTools` or adjust `permissionMode`

### 4. Context Length Exceeded (Session-Breaking)
```
Error: Prompt too long
```
**Critical**: Once hit, session is permanently broken. Cannot recover with /compact.
**Fix**: Fork session before hitting limit. Rotate sessions proactively.

```typescript
// Proactive rotation
if (turnCount > MAX_TURNS) {
  const summary = await getSummary(currentSession);
  currentSession = await startNew(`Continue: ${summary}`);
}
```

### 5. MCP Server Config Missing `type`
```
Error: Claude Code process exited with code 1
```
**Fix**: Always specify `type: "http"` or `type: "sse"` for URL-based MCP servers.

### 6. Unicode Line Separators in MCP Results
```
Error: JSON parse error / agent hangs
```
**Fix**: Sanitize U+2028 and U+2029 in MCP tool handlers.

```typescript
const safe = content.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
```

### 7. Orphaned Subagents
**Symptom**: Subagents continue running after parent stops
**Fix**: Implement cleanup in Stop hooks

### 8. Unbounded Memory Growth (Fixed in v0.2.51)
**Symptom**: RSS grows in long-running sessions
**Fix**: Update to v0.2.51+ (message UUID tracking now evicts old entries)

### 9. Session Close Breaks Resume (Fixed in v0.2.51)
**Symptom**: `session.close()` in V2 API kills subprocess before persisting
**Fix**: Update to v0.2.51+

### 10. Structured Output Empty Messages (Fixed in v0.2.22)
**Fix**: Update to v0.2.22+

## Error Handling Pattern

```typescript
import { query, AbortError } from "@anthropic-ai/claude-agent-sdk";

const controller = new AbortController();

try {
  const q = query({
    prompt: "...",
    options: { abortController: controller, maxTurns: 30, maxBudgetUsd: 10 }
  });

  for await (const msg of q) {
    if (msg.type === "result") {
      switch (msg.subtype) {
        case "success":
          console.log("Done:", msg.result);
          console.log(`Cost: $${msg.total_cost_usd}, Turns: ${msg.num_turns}`);
          break;
        case "error_during_execution":
          console.error("Errors:", msg.errors);
          break;
        case "error_max_turns":
          console.warn("Hit turn limit");
          break;
        case "error_max_budget_usd":
          console.warn("Hit budget limit");
          break;
        case "error_max_structured_output_retries":
          console.error("Schema validation failed repeatedly");
          break;
      }
    }
  }
} catch (err) {
  if (err instanceof AbortError) {
    console.log("Query aborted");
  } else {
    console.error("Fatal:", err);
  }
}
```

## MCP Server Status Values

| Status | Meaning |
|--------|---------|
| `connected` | Server is running and healthy |
| `failed` | Server failed to start (check `error` field) |
| `needs-auth` | Server requires authentication |
| `pending` | Server is starting up |
| `disabled` | Server is toggled off |
