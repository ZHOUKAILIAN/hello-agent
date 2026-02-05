# Project Requirements

## Overview

**hello-agent** is designed as a learning tool for understanding agent-based systems using the ReAct (Reasoning + Acting) pattern with LangChain.

## Core Requirements

### FR-1: Agent Execution API
**Priority**: High
**Status**: Implemented

The system must provide an HTTP API endpoint that accepts natural language instructions and executes them using a ReAct agent.

**Acceptance Criteria**:
- ✅ POST endpoint at `/run` accepts JSON payload
- ✅ `input` field contains user instruction (required string)
- ✅ `includeSteps` field optionally returns intermediate reasoning steps
- ✅ Returns JSON response with `output` field
- ✅ Returns 400 for invalid inputs, 500 for execution errors

**Example Request**:
```json
{
  "input": "List files in sandbox, then write a hello.txt",
  "includeSteps": false
}
```

**Example Response**:
```json
{
  "output": "I have listed the files and created hello.txt in the sandbox."
}
```

---

### FR-2: Sandboxed File Operations
**Priority**: Critical
**Status**: Implemented

All agent file operations must be restricted to a dedicated sandbox directory to prevent unintended modifications to the project or system.

**Acceptance Criteria**:
- ✅ All file operations occur within `./sandbox` directory
- ✅ Path traversal attempts (e.g., `../`) are blocked
- ✅ Sandbox directory is created automatically if missing
- ✅ Tools validate paths before execution
- ✅ Clear error messages for invalid paths

**Security Constraints**:
- Must not allow access to parent directories
- Must not allow absolute paths outside sandbox
- Must validate all user-provided paths

---

### FR-3: Tool Suite
**Priority**: High
**Status**: Implemented

The agent must have access to a minimal but useful set of tools for file manipulation and testing.

**Required Tools**:

1. **write_file**
   - Write content to a file in sandbox
   - Create parent directories if needed
   - Input: `filePath` (string), `content` (string)
   - Output: Confirmation message

2. **read_file**
   - Read content from a file in sandbox
   - Input: `filePath` (string)
   - Output: File contents (string)

3. **list_files**
   - List top-level files in sandbox
   - Input: None
   - Output: Newline-separated file names

4. **run_tests**
   - Execute whitelisted test commands
   - Input: `command` (enum: ["npm test"])
   - Output: Command output or error

**Constraints**:
- All tools must validate inputs with Zod schemas
- All tools must handle errors gracefully
- Tool descriptions must be clear for LLM understanding

---

### FR-4: Debugging Support
**Priority**: Medium
**Status**: Implemented

The system must support debugging by exposing the agent's reasoning process.

**Acceptance Criteria**:
- ✅ `includeSteps: true` returns intermediate steps
- ✅ Steps include agent thoughts and tool calls
- ✅ Steps are returned in execution order
- ✅ Steps format is compatible with LangChain's structure

**Use Case**:
Developers can understand why the agent made specific decisions by reviewing the intermediate steps.

---

### FR-5: Health Check Endpoint
**Priority**: Low
**Status**: Implemented

The system must provide a health check endpoint for monitoring.

**Acceptance Criteria**:
- ✅ GET endpoint at `/health` returns 200
- ✅ Returns JSON: `{"ok": true}`
- ✅ No authentication required
- ✅ Fast response time (<10ms)

---

## Non-Functional Requirements

### NFR-1: Performance
- Agent executor initialization cached to avoid repeated setup
- API response time target: <5s for simple tasks
- Timeout for test execution: 60 seconds
- Timeout for other operations: 30 seconds

### NFR-2: Reliability
- Graceful error handling for all API endpoints
- Clear error messages for debugging
- No silent failures
- Proper HTTP status codes

### NFR-3: Security
- Environment variables for sensitive data (API keys)
- Path traversal protection
- Command injection protection (whitelisted commands only)
- Input validation on all endpoints

### NFR-4: Maintainability
- ES Modules for modern JavaScript
- Minimal dependencies
- Clear separation of concerns (server, agent, tools)
- Comprehensive documentation

### NFR-5: Developer Experience
- Hot reload in development mode (`npm run dev`)
- Clear setup instructions
- Example curl commands
- Environment template (`.env.example`)

---

## Environment Requirements

### Runtime
- Node.js >= 20
- npm (comes with Node.js)

### External Services
- OpenAI API access (requires API key)
- Network connectivity to OpenAI endpoints

### Configuration
Required environment variables:
- `OPENAI_API_KEY`: Valid OpenAI API key
- `OPENAI_MODEL`: Model identifier (e.g., "gpt-4", "gpt-3.5-turbo")
- `PORT`: HTTP server port (default: 3000)

---

## Future Considerations

### Potential Enhancements (Not Currently Planned)
- Additional tools (e.g., web search, API calls)
- Streaming responses for long-running tasks
- Multi-turn conversations with state
- Custom prompt templates
- Rate limiting
- Authentication/authorization
- Persistent storage for agent state
- WebSocket support for real-time updates

### Constraints to Maintain
- Keep the project minimal and focused on learning
- Avoid feature creep
- Maintain sandbox security model
- Keep dependencies minimal

---

## Success Metrics

The project is successful if:
1. Developers can run it in <5 minutes after cloning
2. Agent successfully executes basic file operations
3. Intermediate steps clearly show reasoning process
4. Sandbox prevents unintended file access
5. Code is easy to understand and modify

---

## Related Documents
- [Technical Design](../design/technical-design.md)
- [Coding Standards](../standards/coding-standards.md)
- [Project Analysis](../analysis/project-analysis.md)
