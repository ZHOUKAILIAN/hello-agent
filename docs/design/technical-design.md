# Technical Design

## System Architecture

### High-Level Overview

```
┌─────────────────┐
│   HTTP Client   │
└────────┬────────┘
         │ POST /run
         │
         ▼
┌─────────────────┐
│  Express Server │ (server.js)
│   - Routing     │
│   - Validation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Executor  │ (agent.js)
│   - ReAct Loop  │
│   - LLM Calls   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Suite     │ (tools.js)
│   - File Ops    │
│   - Validation  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Sandbox Dir    │
│  (./sandbox)    │
└─────────────────┘
```

---

## Component Design

### 1. Server Layer (`src/server.js`)

**Responsibilities**:
- HTTP request handling
- Input validation
- Response formatting
- Error handling

**Design Decisions**:

**Why Express?**
- Minimal, unopinionated framework
- Well-documented and stable
- Sufficient for simple API needs

**Why JSON Middleware?**
- Standard format for API communication
- Built-in parsing and validation
- 1MB limit prevents abuse

**Endpoints**:

#### `GET /health`
```javascript
// Purpose: Service health check
// Response: { ok: true }
// Use case: Load balancer health checks, monitoring
```

#### `POST /run`
```javascript
// Input validation:
// - body.input: string (required, non-empty)
// - body.includeSteps: boolean (optional, default: false)

// Error responses:
// - 400: Invalid input (missing or wrong type)
// - 500: Execution error (agent failure, timeout, etc.)

// Success response:
// {
//   output: string,
//   steps?: Array<IntermediateStep>  // if includeSteps=true
// }
```

---

### 2. Agent Layer (`src/agent.js`)

**Responsibilities**:
- Agent initialization
- Executor caching
- LLM configuration
- Prompt management

**Design Decisions**:

**Why Cache the Executor?**
```javascript
let cachedExecutor = null;  // Module-level cache

// Benefits:
// 1. Avoid repeated prompt downloads from LangChain Hub
// 2. Reuse LLM client connection
// 3. Faster response times after first request
// 4. Reduced API calls to LangChain Hub

// Trade-off:
// - Executor configuration is static (requires restart to change)
// - Acceptable for this use case (learning tool)
```

**Why ReAct Pattern?**
- Transparent reasoning process
- Self-correcting behavior
- Easy to debug
- Industry-standard pattern

**Configuration**:
```javascript
{
  agent: ReactAgent,
  tools: [write_file, read_file, list_files, run_tests],
  returnIntermediateSteps: true,  // Always capture for optional return
  maxIterations: 6,               // Prevent infinite loops
  temperature: 0                  // Deterministic responses
}
```

**Why `maxIterations: 6`?**
- Prevents runaway loops
- Sufficient for most simple tasks
- Can be adjusted based on use case

**Why `temperature: 0`?**
- Consistent, reproducible behavior
- Better for tool calling (less creative, more precise)
- Easier to debug

---

### 3. Tool Layer (`src/tools.js`)

**Responsibilities**:
- Tool implementation
- Sandbox enforcement
- Input validation
- Error handling

**Design Pattern**:
```javascript
// All tools follow this pattern:
const toolName = tool(
  async (input) => {
    // 1. Validate environment (ensure sandbox exists)
    // 2. Validate input (implicit via Zod schema)
    // 3. Perform operation
    // 4. Return result or throw error
  },
  {
    name: "tool_name",
    description: "Clear description for LLM",
    schema: z.object({ /* Zod validation */ })
  }
);
```

---

#### Tool: `write_file`

**Purpose**: Write content to a file in the sandbox

**Schema**:
```javascript
{
  filePath: z.string().min(1),  // Relative path within sandbox
  content: z.string().min(1)    // File contents
}
```

**Implementation Details**:
```javascript
// 1. Ensure sandbox exists
await ensureSandbox();

// 2. Resolve and validate path
const target = resolveSandboxPath(filePath);
// Throws if path escapes sandbox

// 3. Create parent directories
await fs.mkdir(path.dirname(target), { recursive: true });

// 4. Write file
await fs.writeFile(target, content, "utf8");

// 5. Return confirmation
return `Wrote ${filePath}`;
```

**Security**: Path validation prevents traversal attacks

---

#### Tool: `read_file`

**Purpose**: Read content from a file in the sandbox

**Schema**:
```javascript
{
  filePath: z.string().min(1)  // Relative path within sandbox
}
```

**Implementation Details**:
```javascript
// 1. Ensure sandbox exists
await ensureSandbox();

// 2. Resolve and validate path
const target = resolveSandboxPath(filePath);

// 3. Read and return content
return await fs.readFile(target, "utf8");
// Throws if file doesn't exist
```

**Error Handling**: Node.js throws clear errors for missing files

---

#### Tool: `list_files`

**Purpose**: List top-level files in sandbox

**Schema**:
```javascript
z.object({})  // No parameters
```

**Implementation Details**:
```javascript
// 1. Ensure sandbox exists
await ensureSandbox();

// 2. Read directory entries
const entries = await fs.readdir(SANDBOX_DIR, { withFileTypes: true });

// 3. Extract names
const names = entries.map(entry => entry.name);

// 4. Return formatted list
return names.length ? names.join("\n") : "(empty)";
```

**Design Choice**: Only top-level to keep it simple. Recursive listing could be added as a separate tool.

---

#### Tool: `run_tests`

**Purpose**: Execute whitelisted test commands

**Schema**:
```javascript
{
  command: z.enum(["npm test"])  // Only allow npm test
}
```

**Implementation Details**:
```javascript
// 1. Whitelist validation (redundant with Zod, but explicit)
const allowed = new Set(["npm test"]);
if (!allowed.has(command)) {
  throw new Error(`Command not allowed: ${command}`);
}

// 2. Execute with timeout
const output = await execCommand(command, 60_000);

// 3. Return output
return output || "(no output)";
```

**Security**:
- Enum schema prevents arbitrary commands
- Explicit whitelist as defense-in-depth
- Timeout prevents hanging processes

---

### 4. Security Layer

#### Path Validation

```javascript
function resolveSandboxPath(userPath) {
  // 1. Resolve to absolute path within sandbox
  const target = path.resolve(SANDBOX_DIR, userPath);

  // 2. Verify it's within sandbox
  if (target !== SANDBOX_DIR &&
      !target.startsWith(SANDBOX_DIR + path.sep)) {
    throw new Error(`Path escapes sandbox: ${userPath}`);
  }

  // 3. Return validated path
  return target;
}

// Blocks:
// - "../../../etc/passwd"
// - "/etc/passwd"
// - "../../package.json"

// Allows:
// - "hello.txt"
// - "subdir/file.txt"
// - "./file.txt"
```

**Why This Approach?**
- Simple and effective
- Works on all platforms (Windows, Unix)
- Clear error messages
- No regex complexity

---

#### Command Execution

```javascript
function execCommand(command, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        // Include stderr for debugging
        reject(new Error(`${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}
```

**Security Features**:
- Timeout prevents hanging
- Error includes stderr for debugging
- No shell injection (command is validated before calling)

---

## Data Flow

### Typical Request Flow

```
1. Client sends POST /run with input

2. Express validates JSON body
   ├─ Missing input? → 400 error
   └─ Valid? → Continue

3. getExecutor() returns cached executor
   ├─ First call? → Initialize agent
   └─ Subsequent? → Return cache

4. executor.invoke({ input })
   ├─ LLM reasons about task
   ├─ Selects tool to use
   ├─ Executes tool
   ├─ Observes result
   └─ Repeats until done or maxIterations

5. Format response
   ├─ Always include output
   └─ Conditionally include steps

6. Return JSON to client
```

---

## Error Handling Strategy

### Server Layer
```javascript
try {
  // Validate input
  if (!input || typeof input !== "string") {
    res.status(400).json({ error: "..." });
    return;
  }

  // Execute agent
  const result = await executor.invoke({ input });

  // Return success
  res.json(response);
} catch (error) {
  // Catch all execution errors
  res.status(500).json({ error: error.message || "Unknown error" });
}
```

**Design Choice**: Always return JSON, never throw unhandled errors

---

### Agent Layer
```javascript
// Environment validation
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}
if (!model) {
  throw new Error("Missing OPENAI_MODEL in environment.");
}

// LangChain handles:
// - Network errors
// - API errors
// - Timeout errors
// - Tool execution errors
```

**Design Choice**: Fail fast on configuration errors

---

### Tool Layer
```javascript
// Each tool validates:
// 1. Sandbox exists (or create it)
// 2. Path is valid (throw if not)
// 3. Operation succeeds (throw if not)

// Example errors:
// - "Path escapes sandbox: ../../../etc/passwd"
// - "ENOENT: no such file or directory"
// - "Command not allowed: rm -rf /"
```

**Design Choice**: Descriptive error messages for debugging

---

## Performance Considerations

### Caching Strategy
- **Executor**: Cached at module level
- **Prompt**: Downloaded once from LangChain Hub
- **LLM Client**: Reused across requests

### Bottlenecks
1. **LLM API Calls**: Slowest part (1-5s per call)
2. **File I/O**: Fast, not a concern
3. **Network**: Depends on OpenAI API latency

### Optimization Opportunities (Not Implemented)
- Streaming responses for long tasks
- Prompt caching (if supported by LangChain)
- Connection pooling (if needed)

---

## Testing Strategy

### Manual Testing
```bash
# Basic functionality
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"List files in sandbox"}'

# With intermediate steps
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"Write hello.txt","includeSteps":true}'

# Error cases
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"Read ../package.json"}'
# Should fail with sandbox error
```

### Future: Automated Testing
- Unit tests for tools (sandbox validation, path resolution)
- Integration tests for agent execution
- E2E tests for API endpoints

---

## Deployment Considerations

### Environment Setup
```bash
# Required
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"

# Optional
export PORT="3000"
```

### Process Management
- Use `npm start` for production
- Use `npm run dev` for development (hot reload)
- Consider PM2 or similar for production

### Monitoring
- Health check endpoint: `GET /health`
- Log agent errors for debugging
- Monitor OpenAI API usage and costs

---

## Scalability Considerations

### Current Limitations
- Single-threaded (Node.js event loop)
- No request queuing
- No rate limiting
- Stateless (no conversation history)

### If Scaling Needed
1. Add rate limiting per client
2. Implement request queuing
3. Add horizontal scaling (multiple instances)
4. Add load balancer
5. Consider async job processing

**Note**: Current design is intentionally simple for learning purposes.

---

## Alternative Designs Considered

### Why Not WebSocket?
- HTTP is simpler for this use case
- No need for bidirectional communication
- Easier to test with curl

### Why Not Streaming?
- Adds complexity
- Not needed for short tasks
- Can be added later if needed

### Why Not Database?
- No persistent state needed
- Stateless design is simpler
- Sandbox is ephemeral

### Why Not Multiple Sandboxes?
- Single sandbox is simpler
- No multi-tenancy requirements
- Can be added if needed (e.g., per-session sandboxes)

---

## Related Documents
- [Project Requirements](../requirements/project-requirements.md)
- [Coding Standards](../standards/coding-standards.md)
- [Project Analysis](../analysis/project-analysis.md)
