# Coding Standards

## Overview

This document defines the coding standards and conventions for the **hello-agent** project. All code must follow these guidelines to ensure consistency, maintainability, and quality.

---

## General Principles

### 1. Simplicity First
- Prefer simple, straightforward solutions
- Avoid over-engineering
- Don't add features "just in case"
- YAGNI (You Aren't Gonna Need It)

### 2. Readability Over Cleverness
- Code is read more than written
- Prefer explicit over implicit
- Avoid clever tricks that obscure intent
- Use descriptive names

### 3. Fail Fast
- Validate inputs early
- Throw errors for invalid states
- Don't silently ignore errors
- Provide clear error messages

### 4. Security by Default
- Always validate user inputs
- Never trust external data
- Use whitelists, not blacklists
- Principle of least privilege

---

## JavaScript Standards

### ES Modules
**Always** use ES modules, never CommonJS.

```javascript
// ✅ Good
import express from "express";
import { readFile } from "node:fs/promises";

// ❌ Bad
const express = require("express");
const { readFile } = require("fs/promises");
```

**Rationale**: ES modules are the standard, better for tree-shaking, and required by `"type": "module"` in package.json.

---

### Node.js Built-ins
**Always** use `node:` protocol for built-in modules.

```javascript
// ✅ Good
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";

// ❌ Bad
import fs from "fs/promises";
import path from "path";
```

**Rationale**: Explicitly marks built-in modules, prevents conflicts with npm packages.

---

### Async/Await
**Prefer** async/await over raw promises or callbacks.

```javascript
// ✅ Good
async function readConfig() {
  const data = await fs.readFile("config.json", "utf8");
  return JSON.parse(data);
}

// ❌ Bad
function readConfig() {
  return fs.readFile("config.json", "utf8")
    .then(data => JSON.parse(data));
}

// ❌ Worse
function readConfig(callback) {
  fs.readFile("config.json", "utf8", (err, data) => {
    if (err) return callback(err);
    callback(null, JSON.parse(data));
  });
}
```

**Rationale**: Async/await is more readable and handles errors naturally with try/catch.

---

### Error Handling
**Always** handle errors explicitly.

```javascript
// ✅ Good
app.post("/run", async (req, res) => {
  try {
    const result = await executor.invoke({ input: req.body.input });
    res.json({ output: result.output });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// ❌ Bad (unhandled promise rejection)
app.post("/run", async (req, res) => {
  const result = await executor.invoke({ input: req.body.input });
  res.json({ output: result.output });
});
```

**Rationale**: Unhandled errors crash the server or leave clients hanging.

---

### Input Validation
**Always** validate inputs at boundaries (API, tools).

```javascript
// ✅ Good
app.post("/run", async (req, res) => {
  const { input, includeSteps = false } = req.body || {};
  if (!input || typeof input !== "string") {
    res.status(400).json({ error: "input must be a non-empty string." });
    return;
  }
  // ... proceed
});

// ❌ Bad (no validation)
app.post("/run", async (req, res) => {
  const result = await executor.invoke({ input: req.body.input });
  // What if req.body is undefined? Or input is not a string?
});
```

**Rationale**: Invalid inputs cause cryptic errors. Validate early with clear messages.

---

### Function Design

#### Pure Functions
**Prefer** pure functions when possible.

```javascript
// ✅ Good (pure)
function resolveSandboxPath(userPath) {
  const target = path.resolve(SANDBOX_DIR, userPath);
  if (!target.startsWith(SANDBOX_DIR + path.sep)) {
    throw new Error(`Path escapes sandbox: ${userPath}`);
  }
  return target;
}

// ❌ Bad (mutates external state)
let lastPath = null;
function resolveSandboxPath(userPath) {
  lastPath = userPath;  // Side effect
  return path.resolve(SANDBOX_DIR, userPath);
}
```

**Rationale**: Pure functions are easier to test, reason about, and debug.

---

#### Single Responsibility
**Each function should do one thing well.**

```javascript
// ✅ Good
async function ensureSandbox() {
  await fs.mkdir(SANDBOX_DIR, { recursive: true });
}

function resolveSandboxPath(userPath) {
  const target = path.resolve(SANDBOX_DIR, userPath);
  if (target !== SANDBOX_DIR && !target.startsWith(SANDBOX_DIR + path.sep)) {
    throw new Error(`Path escapes sandbox: ${userPath}`);
  }
  return target;
}

// ❌ Bad (does too much)
async function validateAndWrite(userPath, content) {
  await fs.mkdir(SANDBOX_DIR, { recursive: true });
  const target = path.resolve(SANDBOX_DIR, userPath);
  if (!target.startsWith(SANDBOX_DIR)) throw new Error("Invalid path");
  await fs.writeFile(target, content);
}
```

**Rationale**: Single-responsibility functions are easier to test and reuse.

---

### Naming Conventions

#### Variables and Functions
- Use `camelCase` for variables and functions
- Use descriptive names (no single letters except loops)
- Boolean variables should be questions: `isValid`, `hasError`, `canWrite`

```javascript
// ✅ Good
const apiKey = process.env.OPENAI_API_KEY;
const isValidPath = target.startsWith(SANDBOX_DIR);
async function ensureSandbox() { ... }

// ❌ Bad
const key = process.env.OPENAI_API_KEY;  // Too vague
const valid = target.startsWith(SANDBOX_DIR);  // Not a question
async function es() { ... }  // Unclear abbreviation
```

---

#### Constants
- Use `UPPER_SNAKE_CASE` for constants
- Define at module level

```javascript
// ✅ Good
const SANDBOX_DIR = path.resolve(process.cwd(), "sandbox");
const MAX_ITERATIONS = 6;
const DEFAULT_TIMEOUT = 30_000;

// ❌ Bad
const sandboxDir = path.resolve(process.cwd(), "sandbox");
const maxIterations = 6;
```

**Rationale**: Makes constants easily identifiable.

---

#### Files and Modules
- Use `kebab-case` for filenames (if multi-word)
- Use descriptive names: `agent.js`, `tools.js`, `server.js`

```
✅ Good
src/agent.js
src/tools.js
src/server.js

❌ Bad
src/a.js
src/utils.js  (too generic)
src/AgentConfig.js  (PascalCase is for classes)
```

---

### Comments

#### When to Comment
- **Do**: Explain *why*, not *what*
- **Do**: Document non-obvious behavior
- **Do**: Explain trade-offs and decisions
- **Don't**: State the obvious

```javascript
// ✅ Good
// Cache executor to avoid repeated prompt downloads and LLM initialization
let cachedExecutor = null;

// Resolve path and ensure it doesn't escape sandbox
const target = resolveSandboxPath(filePath);

// ❌ Bad
// Set cachedExecutor to null
let cachedExecutor = null;

// Call resolveSandboxPath with filePath
const target = resolveSandboxPath(filePath);
```

---

#### JSDoc (Optional but Recommended)
Use JSDoc for public APIs and complex functions.

```javascript
/**
 * Resolves a user-provided path to an absolute path within the sandbox.
 * Throws if the path attempts to escape the sandbox.
 *
 * @param {string} userPath - Relative path provided by user
 * @returns {string} Absolute path within sandbox
 * @throws {Error} If path escapes sandbox
 */
function resolveSandboxPath(userPath) {
  // ...
}
```

---

## Project-Specific Conventions

### Tool Implementation Pattern
All tools must follow this structure:

```javascript
const toolName = tool(
  async (input) => {
    // 1. Ensure environment is ready
    await ensureSandbox();

    // 2. Validate and process input
    const validatedValue = processInput(input);

    // 3. Perform operation
    const result = await performOperation(validatedValue);

    // 4. Return result
    return result;
  },
  {
    name: "tool_name",           // snake_case
    description: "Clear, concise description for LLM understanding.",
    schema: z.object({
      param: z.string().min(1)   // Zod validation
    })
  }
);
```

**Key Points**:
- Tool names use `snake_case` (LangChain convention)
- Descriptions are clear and concise
- Zod schemas validate all inputs
- Async functions for consistency

---

### Security Patterns

#### Path Validation
**Always** validate paths before file operations.

```javascript
// ✅ Good
const target = resolveSandboxPath(userPath);
await fs.writeFile(target, content);

// ❌ Bad
const target = path.join(SANDBOX_DIR, userPath);
await fs.writeFile(target, content);  // No validation!
```

---

#### Command Execution
**Always** whitelist commands, never trust user input.

```javascript
// ✅ Good
const allowed = new Set(["npm test"]);
if (!allowed.has(command)) {
  throw new Error(`Command not allowed: ${command}`);
}

// ❌ Bad
exec(command);  // Command injection vulnerability!
```

---

### Environment Variables
**Always** validate required environment variables at startup.

```javascript
// ✅ Good
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}

// ❌ Bad
const apiKey = process.env.OPENAI_API_KEY || "default-key";
// Never use default keys for sensitive values!
```

---

## Code Organization

### Module Structure
```javascript
// 1. Imports (built-ins first, then npm packages, then local)
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { tool } from "@langchain/core/tools";
import { buildTools } from "./tools.js";

// 2. Constants
const SANDBOX_DIR = path.resolve(process.cwd(), "sandbox");
const MAX_TIMEOUT = 30_000;

// 3. Helper functions (not exported)
function resolveSandboxPath(userPath) { ... }

// 4. Main functions (exported)
export function buildTools() { ... }

// 5. Initialization (if needed)
await ensureSandbox();
```

---

### File Organization
```
src/
├── server.js      # Express app, routing, HTTP handling
├── agent.js       # Agent initialization, executor management
└── tools.js       # Tool implementations, sandbox logic
```

**Separation of Concerns**:
- `server.js`: HTTP layer only
- `agent.js`: Agent logic only
- `tools.js`: Tool implementations only

---

## Dependencies

### Adding Dependencies
**Only add dependencies when truly necessary.**

Before adding a dependency, ask:
1. Can I implement this in <50 lines?
2. Is this a well-maintained package?
3. Does it have minimal sub-dependencies?
4. Is it actively used in the ecosystem?

```bash
# ✅ Good (necessary)
npm install express          # Standard web framework
npm install langchain        # Core functionality
npm install zod              # Type-safe validation

# ❌ Bad (unnecessary)
npm install lodash           # Use native JS methods
npm install moment           # Use native Date
npm install axios            # Use native fetch
```

---

### Dependency Versions
- Use `latest` for learning projects
- Use specific versions for production
- Keep dependencies updated

```json
{
  "dependencies": {
    "express": "latest",        // For learning
    "langchain": "^0.1.0"       // For production
  }
}
```

---

## Testing

### Manual Testing Checklist
Before committing code, test:

1. **Happy Path**: Does it work as expected?
2. **Error Cases**: Does it handle errors gracefully?
3. **Edge Cases**: What about empty inputs, large files, etc.?
4. **Security**: Can it be exploited?

### Example Test Cases
```bash
# Valid request
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"List files"}'

# Invalid input (missing)
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{}'

# Invalid input (wrong type)
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":123}'

# Path traversal attempt
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"Read ../package.json"}'
```

---

## Git Practices

### Commit Messages
Follow conventional commits:

```
feat: Add new tool for directory listing
fix: Prevent path traversal in file operations
docs: Update API documentation
refactor: Simplify tool validation logic
test: Add integration tests for agent
```

### What to Commit
- ✅ Source code
- ✅ Documentation
- ✅ Configuration templates (`.env.example`)
- ❌ Environment files (`.env`)
- ❌ Node modules (`node_modules/`)
- ❌ Build artifacts
- ❌ IDE-specific files (except `.vscode/` if team uses it)

---

## Performance Guidelines

### Avoid Premature Optimization
- Don't optimize until you measure
- Readability > Performance (unless proven bottleneck)
- Profile before optimizing

### Known Bottlenecks
1. **LLM API calls**: Slowest part, can't optimize much
2. **File I/O**: Fast enough, no optimization needed
3. **Network**: Use connection pooling if needed

### Caching Strategy
- Cache expensive operations (executor initialization)
- Don't cache frequently changing data
- Keep cache invalidation simple

---

## Documentation Standards

### Code Documentation
- Document public APIs with JSDoc
- Explain non-obvious logic with comments
- Keep comments up-to-date with code

### Project Documentation
- Keep README.md user-focused
- Keep CLAUDE.md developer-focused
- Keep docs/ directory for detailed documentation

### Documentation Structure
```
docs/
├── requirements/     # What we're building
├── design/          # How we're building it
├── standards/       # How we write code (this file)
└── analysis/        # Research and exploration
```

---

## Related Documents
- [Project Requirements](../requirements/project-requirements.md)
- [Technical Design](../design/technical-design.md)
- [Project Analysis](../analysis/project-analysis.md)
