# Run-Lite Agent Technical Design

## Goals

- Provide a minimal, hand-rolled agent loop without LangChain
- Expose the lite agent via `POST /run-lite`
- Keep the system readable and modular in a pnpm monorepo
- Ensure all lite tools are sandboxed and safe

---

## Monorepo Layout (pnpm)

```
hello-agent/
  pnpm-workspace.yaml
  package.json
  packages/
    api/
      src/
        server.js
        runLiteRoute.js
        langchain/...
    agent-lite/
      src/
        index.js
        agent.js
        tools/
          index.js
          sandbox.js
```

**Notes**:
- `packages/api` owns HTTP routing and input validation
- `packages/agent-lite` owns the agent loop and tool execution
- Existing LangChain `/run` remains in `packages/api/src/langchain` (or similar) to keep the lite agent separate

---

## API Contract

### `POST /run-lite`

**Request Body**:
```json
{
  "input": "string",
  "includeSteps": true
}
```

**Response Body**:
```json
{
  "output": "string",
  "steps": [
    {
      "type": "tool",
      "name": "list_files",
      "args": {},
      "result": "..."
    },
    {
      "type": "final",
      "content": "..."
    }
  ]
}
```

**Error Handling**:
- 400: invalid input (missing/invalid `input`)
- 500: agent errors, tool errors, malformed model output

---

## Agent Loop Design (Lite)

### Core Loop

1. Build system prompt describing tool protocol and available tools
2. Send messages to the model with the user input and tool schema
3. Parse model output into one of:
   - `tool` call
   - `final` answer
4. If tool call:
   - Validate tool name and args
   - Execute tool
   - Append tool result as an observation
   - Continue loop
5. Stop on `final` or max iterations

### Output Protocol

The lite agent uses a strict JSON protocol to simplify parsing:

```json
{ "type": "tool", "name": "write_file", "args": { "filePath": "notes.txt", "content": "hi" } }
```

```json
{ "type": "final", "content": "Done." }
```

**Parsing Rules**:
- Trim model output
- Parse as JSON
- Reject non-JSON outputs with a clear error
- Enforce that `type` is `tool` or `final`

### Iteration Control

- Default `maxIterations`: 6
- If exceeded, return 500 with error "Exceeded max iterations"

---

## Tool Layer (Lite)

### Tool Set

1. `list_files`
   - Args: none
   - Result: newline-separated filenames

2. `read_file`
   - Args: `{ filePath: string }`
   - Result: file contents

3. `write_file`
   - Args: `{ filePath: string, content: string }`
   - Result: confirmation string

### Sandbox Enforcement

- Sandbox root: `./sandbox-lite`
- `resolveSandboxPath()` ensures no path traversal
- Sandbox directory created on demand
- All file ops must use `resolveSandboxPath()`

---

## Configuration

Environment variables:
- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (default model)
- `OPENAI_LITE_MODEL` (optional override for /run-lite)
- `OPENAI_LITE_BASE_URL` (optional override for /run-lite)

Model defaults:
- `temperature = 0`
- `max_output_tokens` set conservatively (e.g., 600)

---

## Dependencies

Add the smallest possible dependency for direct OpenAI API calls:
- `openai` (official SDK) **or** use native `fetch` to the OpenAI REST API

The lite agent must not import any `langchain*` packages.

---

## Error Handling

- Invalid tool name -> error with list of allowed tools
- Invalid args -> error specifying missing/invalid fields
- Tool execution errors -> bubble to API response (500)
- Model output not JSON -> error "Invalid model output format"

---

## Testing Strategy (Lite)

- Add a small set of integration checks via curl:
  - Simple tool call (list files)
  - Multi-step tool call (write + read)
  - Invalid tool name response

---

## Migration Notes

- Existing `/run` endpoint remains LangChain-based
- `/run-lite` is completely independent
- No changes to existing tool implementations (lite tools are new)

---

## Open Questions

- Whether to use the official OpenAI SDK or REST fetch
- Whether to return structured steps or a simple transcript
