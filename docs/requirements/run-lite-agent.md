# Run-Lite Agent Requirements

## Overview

Introduce a minimal, hand-rolled agent implementation ("lite agent") that does **not** use LangChain, exposed via a new API endpoint (`POST /run-lite`). The project will be converted to a pnpm monorepo to keep the existing LangChain-based `/run` alongside the new lite agent.

The lite agent should be small, easy to read, and suitable for learning the fundamentals of an agent loop: prompt -> tool call -> observation -> repeat -> final answer.

---

## Core Requirements

### FR-1: Monorepo Conversion (pnpm)
**Priority**: High
**Status**: Planned

Convert the repository into a pnpm workspace with a minimal package layout.

**Acceptance Criteria**:
- Workspace configuration exists (pnpm workspace file)
- Root package.json remains private and defines workspaces
- Packages are placed under `packages/`
- Root scripts can run the API package

**Proposed Minimal Structure**:
```
packages/
  api/          # Express server (routes: /run, /run-lite)
  agent-lite/   # Hand-rolled agent loop + tool layer
```

---

### FR-2: New Endpoint: `POST /run-lite`
**Priority**: High
**Status**: Planned

Expose a new endpoint to invoke the lite agent.

**Acceptance Criteria**:
- Endpoint exists at `POST /run-lite`
- Accepts JSON body with:
  - `input` (string, required)
  - `includeSteps` (boolean, optional, default: false)
- Returns JSON response with:
  - `output` (string)
  - `steps` (optional array, present when `includeSteps=true`)
- Uses proper HTTP status codes (400 for invalid input, 500 for execution errors)

**Example Request**:
```json
{
  "input": "List files and write hello.txt",
  "includeSteps": true
}
```

**Example Response**:
```json
{
  "output": "I listed the files and created hello.txt.",
  "steps": [
    { "type": "tool", "name": "list_files", "args": {}, "result": "..." }
  ]
}
```

---

### FR-3: Hand-Rolled Agent Loop (No LangChain)
**Priority**: High
**Status**: Planned

Implement a minimal agent loop without LangChain. The loop should:
1. Send the user prompt and tool schema to the LLM
2. Parse tool calls or final answers
3. Execute tools
4. Feed observations back into the LLM
5. Stop on final answer or max iterations

**Acceptance Criteria**:
- No LangChain packages used in the lite agent implementation
- Configurable `maxIterations` (default: 6)
- Deterministic behavior preferred (temperature 0)
- Clear error messages for invalid tool calls or malformed model output

---

### FR-4: Lite Tool Layer (New, Separate from Existing Tools)
**Priority**: High
**Status**: Planned

Provide a minimal, custom tool layer for the lite agent (do not reuse existing LangChain tools).

**Minimum Tool Set**:
1. `list_files`
2. `read_file`
3. `write_file`

**Acceptance Criteria**:
- Each tool validates input (schema or explicit checks)
- All file ops are sandboxed to a dedicated directory (see FR-5)
- Tool descriptions are concise and LLM-friendly

---

### FR-5: Lite Sandbox Isolation
**Priority**: Critical
**Status**: Planned

Lite tools must only operate within a sandbox directory dedicated to the lite agent.

**Acceptance Criteria**:
- All lite file operations are restricted to `./sandbox-lite` (relative to repo root)
- Path traversal outside the sandbox is blocked
- Sandbox is created automatically if missing
- Clear errors for invalid paths

---

## Non-Functional Requirements

### NFR-1: Minimal Dependencies
- Avoid adding heavy dependencies
- Only add dependencies required for direct OpenAI API access and validation

### NFR-2: Reliability
- Graceful error handling for API and tool execution
- Timeouts to prevent infinite loops (iteration cap)

### NFR-3: Maintainability
- Small, readable modules
- Clear separation between API, agent loop, and tools

---

## Environment Requirements

### Runtime
- Node.js >= 20
- pnpm

### Configuration
Required environment variables:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (used by lite agent, unless overridden)

Optional:
- `OPENAI_LITE_MODEL` (if set, overrides `OPENAI_MODEL` for /run-lite)
- `OPENAI_LITE_BASE_URL` (if set, overrides base URL for /run-lite)

---

## Out of Scope (For This Phase)
- Streaming responses
- Multi-user or persistent sessions
- Web search tools
- Authentication/authorization
- Database-backed memory

---

## Success Metrics

The lite agent work is successful if:
1. `/run-lite` works end-to-end without LangChain
2. Tools operate only within `sandbox-lite`
3. The agent can perform multi-step tool tasks reliably
4. The codebase remains simple and easy to understand

---

## Related Documents
- [Project Requirements](./project-requirements.md)
- [Technical Design](../design/technical-design.md)
- [Coding Standards](../standards/coding-standards.md)
