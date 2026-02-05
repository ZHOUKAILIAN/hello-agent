# Project Conventions

## Overview

This document captures project-specific patterns, conventions, and best practices extracted from the **hello-agent** codebase. These conventions complement the general coding standards and reflect the actual implementation patterns used in this project.

---

## Architecture Patterns

### Module-Level Caching
The project uses module-level caching for expensive resources.

```javascript
// Pattern: Module-level cache variable
let cachedExecutor = null;

export async function getExecutor() {
  if (cachedExecutor) {
    return cachedExecutor;
  }

  // Initialize expensive resource
  cachedExecutor = await initializeExecutor();
  return cachedExecutor;
}
```

**When to Use**:
- Expensive initialization (LLM clients, database connections)
- Resources that don't change during runtime
- Single-instance services

**Trade-offs**:
- ✅ Fast subsequent access
- ✅ Simple implementation
- ❌ Requires restart to change configuration
- ❌ Not suitable for multi-tenant scenarios

---

### Sandbox Pattern
All file operations are restricted to a dedicated directory.

```javascript
// Pattern: Sandbox with path validation
const SANDBOX_DIR = path.resolve(process.cwd(), "sandbox");

function resolveSandboxPath(userPath) {
  const target = path.resolve(SANDBOX_DIR, userPath);

  // Validate path doesn't escape sandbox
  if (target !== SANDBOX_DIR &&
      !target.startsWith(SANDBOX_DIR + path.sep)) {
    throw new Error(`Path escapes sandbox: ${userPath}`);
  }

  return target;
}
```

**When to Use**:
- User-provided file paths
- Untrusted input
- Isolation requirements

**Key Points**:
- Always resolve to absolute path first
- Check both equality and prefix
- Include path separator in prefix check
- Throw descriptive errors

---

### Tool Factory Pattern
Tools are created in a factory function for consistency.

```javascript
// Pattern: Tool factory
export function buildTools() {
  const tool1 = tool(async (input) => { ... }, { ... });
  const tool2 = tool(async (input) => { ... }, { ... });

  return [tool1, tool2];
}
```

**Benefits**:
- Consistent tool structure
- Easy to add/remove tools
- Centralized tool management
- Testable in isolation

---

## Error Handling Patterns

### API Error Responses
```javascript
// Pattern: Consistent error responses
app.post("/endpoint", async (req, res) => {
  try {
    // Validate input
    if (!isValid(req.body)) {
      res.status(400).json({ error: "Descriptive message" });
      return;
    }

    // Process request
    const result = await process(req.body);

    // Return success
    res.json(result);
  } catch (error) {
    // Catch-all for unexpected errors
    res.status(500).json({
      error: error.message || "Unknown error"
    });
  }
});
```

**Key Points**:
- Always return JSON (never throw to Express)
- Use appropriate status codes (400 vs 500)
- Include error messages for debugging
- Return early for validation errors

---

### Tool Error Handling
```javascript
// Pattern: Let errors bubble up
const readFileTool = tool(
  async ({ filePath }) => {
    await ensureSandbox();
    const target = resolveSandboxPath(filePath);
    return await fs.readFile(target, "utf8");
    // Don't catch errors - let agent handle them
  },
  { ... }
);
```

**Rationale**:
- Agent can see and reason about errors
- Errors appear in intermediate steps
- Simpler code (no try/catch)

---

## Configuration Patterns

### Environment Variables
```javascript
// Pattern: Validate at startup
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}
if (!model) {
  throw new Error("Missing OPENAI_MODEL in environment.");
}
```

**Key Points**:
- Validate required vars at startup (fail fast)
- Use descriptive error messages
- No default values for sensitive data
- Use optional chaining for optional vars

---

### Default Values
```javascript
// Pattern: Destructuring with defaults
const { input, includeSteps = false } = req.body || {};

// Pattern: Fallback for environment
const port = Number(process.env.PORT) || 3000;
```

**When to Use Defaults**:
- ✅ Optional parameters
- ✅ Non-sensitive configuration
- ❌ Required parameters
- ❌ Sensitive data (API keys)

---

## Validation Patterns

### Zod Schema Pattern
```javascript
// Pattern: Zod validation in tool schema
const toolName = tool(
  async (input) => {
    // Input is already validated by Zod
    // Safe to use directly
  },
  {
    name: "tool_name",
    description: "Description",
    schema: z.object({
      param1: z.string().min(1),
      param2: z.number().optional()
    })
  }
);
```

**Benefits**:
- Type-safe validation
- Clear error messages
- Self-documenting
- Runtime type checking

---

### Input Validation Pattern
```javascript
// Pattern: Early validation with clear errors
const { input, includeSteps = false } = req.body || {};

if (!input || typeof input !== "string") {
  res.status(400).json({
    error: "input must be a non-empty string."
  });
  return;
}

// Continue with validated input
```

**Key Points**:
- Check for null/undefined
- Check type
- Check constraints (min length, etc.)
- Return immediately on error

---

## Async Patterns

### Promise Wrapping
```javascript
// Pattern: Promisify callback-based APIs
function execCommand(command, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}
```

**When to Use**:
- Converting callback APIs to promises
- Need timeout or special handling
- Want to normalize error format

---

### Async Initialization
```javascript
// Pattern: Async helper function
async function ensureSandbox() {
  await fs.mkdir(SANDBOX_DIR, { recursive: true });
}

// Call before operations
await ensureSandbox();
```

**Benefits**:
- Idempotent (safe to call multiple times)
- Simple and clear
- No race conditions with `recursive: true`

---

## LangChain Patterns

### Agent Configuration
```javascript
// Pattern: Consistent agent setup
const agent = await createReactAgent({
  llm,           // Language model
  tools,         // Available tools
  prompt         // System prompt
});

const executor = new AgentExecutor({
  agent,
  tools,
  returnIntermediateSteps: true,  // Always capture
  maxIterations: 6                // Prevent runaway
});
```

**Key Configuration**:
- `returnIntermediateSteps: true`: Always capture for optional return
- `maxIterations: 6`: Prevent infinite loops
- `temperature: 0`: Deterministic behavior

---

### Tool Description Pattern
```javascript
// Pattern: Clear, LLM-friendly descriptions
{
  name: "write_file",
  description: "Write a file under ./sandbox only. Provide a relative filePath and full content.",
  schema: z.object({ ... })
}
```

**Best Practices**:
- Start with verb (Write, Read, List, Run)
- Mention constraints (sandbox only)
- Specify expected inputs
- Keep concise but complete

---

## Security Patterns

### Whitelist Pattern
```javascript
// Pattern: Explicit whitelist for commands
const allowed = new Set(["npm test"]);

if (!allowed.has(command)) {
  throw new Error(`Command not allowed: ${command}`);
}
```

**Why Set?**:
- O(1) lookup
- Clear intent
- Easy to extend

**Alternative**: Zod enum (used in schema)
```javascript
schema: z.object({
  command: z.enum(["npm test"])
})
```

---

### Path Validation Pattern
```javascript
// Pattern: Resolve then validate
const target = path.resolve(SANDBOX_DIR, userPath);

if (target !== SANDBOX_DIR &&
    !target.startsWith(SANDBOX_DIR + path.sep)) {
  throw new Error(`Path escapes sandbox: ${userPath}`);
}
```

**Why This Works**:
- `path.resolve` normalizes path (removes `..`, etc.)
- Check both equality (for sandbox root) and prefix
- `path.sep` ensures exact directory match
- Works cross-platform (Windows, Unix)

---

## Express Patterns

### Middleware Order
```javascript
// Pattern: Middleware before routes
app.use(express.json({ limit: "1mb" }));

app.get("/health", ...);
app.post("/run", ...);
```

**Standard Order**:
1. Body parsers (json, urlencoded)
2. CORS (if needed)
3. Authentication (if needed)
4. Routes
5. Error handlers (if needed)

---

### Route Handler Pattern
```javascript
// Pattern: Async route with error handling
app.post("/run", async (req, res) => {
  try {
    // 1. Extract and validate input
    const { input, includeSteps = false } = req.body || {};

    if (!input || typeof input !== "string") {
      res.status(400).json({ error: "..." });
      return;
    }

    // 2. Process request
    const result = await process(input);

    // 3. Format response
    const response = { output: result.output };
    if (includeSteps) {
      response.steps = result.intermediateSteps;
    }

    // 4. Return JSON
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});
```

---

## File System Patterns

### Directory Creation
```javascript
// Pattern: Recursive directory creation
await fs.mkdir(SANDBOX_DIR, { recursive: true });

// Pattern: Create parent directories
await fs.mkdir(path.dirname(target), { recursive: true });
```

**Benefits**:
- Idempotent (safe to call if exists)
- Creates parent directories automatically
- No need to check existence first

---

### File Operations
```javascript
// Pattern: UTF-8 encoding explicit
await fs.writeFile(target, content, "utf8");
const data = await fs.readFile(target, "utf8");
```

**Why Explicit Encoding**:
- Prevents binary/text confusion
- Self-documenting
- Consistent across operations

---

## Testing Patterns

### Manual Testing Commands
```bash
# Pattern: Documented curl commands
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"List files in sandbox"}'
```

**Best Practices**:
- Include full URL
- Specify headers explicitly
- Use single quotes for JSON
- One command per test case
- Document expected outcome

---

## Documentation Patterns

### Inline Comments
```javascript
// Pattern: Explain why, not what
// Cache executor to avoid repeated prompt downloads
let cachedExecutor = null;

// Resolve path and ensure it doesn't escape sandbox
const target = resolveSandboxPath(filePath);
```

---

### JSDoc Comments
```javascript
// Pattern: Document public APIs
/**
 * Build all available tools for the agent.
 *
 * @returns {Array<Tool>} Array of LangChain tools
 */
export function buildTools() {
  // ...
}
```

---

## Common Anti-Patterns to Avoid

### ❌ Silent Failures
```javascript
// Bad: Swallows errors
try {
  await riskyOperation();
} catch (error) {
  // Do nothing
}

// Good: Handle or propagate
try {
  await riskyOperation();
} catch (error) {
  console.error("Failed:", error);
  throw error;  // Or handle appropriately
}
```

---

### ❌ Implicit Type Coercion
```javascript
// Bad: Relies on type coercion
if (value) { ... }  // What if value is 0 or ""?

// Good: Explicit checks
if (value !== null && value !== undefined) { ... }
if (typeof value === "string" && value.length > 0) { ... }
```

---

### ❌ Overly Generic Names
```javascript
// Bad: Too generic
function process(data) { ... }
const result = doStuff();

// Good: Specific
function processAgentInput(input) { ... }
const executorResult = executeAgent();
```

---

### ❌ Magic Numbers
```javascript
// Bad: Magic number
exec(command, { timeout: 60000 });

// Good: Named constant
const TEST_TIMEOUT_MS = 60_000;
exec(command, { timeout: TEST_TIMEOUT_MS });
```

---

## Project-Specific Idioms

### Numeric Separators
```javascript
// Pattern: Use underscores for readability
const timeout = 30_000;  // 30 seconds
const maxSize = 1_000_000;  // 1 million
```

---

### Optional Chaining
```javascript
// Pattern: Safe property access
const { input, includeSteps = false } = req.body || {};
```

---

### Early Returns
```javascript
// Pattern: Guard clauses
if (!isValid) {
  return error;
}

// Main logic here
```

**Benefits**:
- Reduces nesting
- Clear error conditions
- Easier to read

---

## Related Documents
- [Coding Standards](./coding-standards.md)
- [Technical Design](../design/technical-design.md)
- [Project Requirements](../requirements/project-requirements.md)
