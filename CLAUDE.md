# Claude Development Guide

## Project Overview

**hello-agent** is a minimal LangChain + ReAct JavaScript API that demonstrates agent basics with tool calling. It also includes a hand-rolled lite agent exposed via `/run-lite`. The project provides sandboxed environments for experimenting with prompt engineering and agent workflows.

### Key Features
- HTTP API endpoints (`POST /run`, `POST /run-lite`) for agent execution
- Sandboxed file operations restricted to `./sandbox` (LangChain) and `./sandbox-lite` (lite agent)
- Optional intermediate step logging for debugging
- LangChain integration with OpenAI models and a direct OpenAI API integration for the lite agent

### Tech Stack
- **Runtime**: Node.js >=20
- **Framework**: Express.js
- **Agent Framework**: LangChain (ReAct pattern)
- **LLM Provider**: OpenAI
- **Validation**: Zod

---

## MANDATORY: Documentation-First Workflow

**CRITICAL REQUIREMENT**: All code changes MUST follow this documentation-first process:

### Before Writing ANY Code:

1. **Document the Requirement**
   - Create/update documentation in `docs/requirements/`
   - Clearly define what needs to be built and why
   - Include acceptance criteria and constraints

2. **Design the Solution**
   - Create/update technical design in `docs/design/`
   - Document architecture decisions and trade-offs
   - Include API contracts, data models, and component interactions

3. **Review Standards**
   - Check `docs/standards/` for coding conventions
   - Ensure design aligns with project patterns
   - Document any new patterns or deviations

4. **Get Approval**
   - Present documentation for review
   - Discuss approach and alternatives
   - Only proceed to implementation after approval

### Implementation Rules:

- ❌ **NEVER** write code without prior documentation
- ❌ **NEVER** skip the design phase for "quick fixes"
- ❌ **NEVER** assume you understand requirements without documenting them
- ✅ **ALWAYS** update docs when requirements or designs change
- ✅ **ALWAYS** reference relevant docs in code comments
- ✅ **ALWAYS** keep documentation in sync with implementation

---

## Project Structure

```
hello-agent/
├── packages/
│   ├── api/
│   │   └── src/       # Express API server + LangChain agent
│   └── agent-lite/
│       └── src/       # Hand-rolled lite agent + tools
├── sandbox/           # LangChain agent sandbox
├── sandbox-lite/      # Lite agent sandbox
├── docs/              # Project documentation (see below)
├── .env               # Environment configuration (gitignored)
├── .env.example       # Environment template
├── package.json       # Workspace scripts
└── README.md          # User-facing documentation
```

---

## Documentation Structure

All project documentation lives in the `docs/` directory:

```
docs/
├── requirements/     # Feature requirements and specifications
├── design/          # Technical designs and architecture decisions
├── standards/       # Coding standards and project conventions
└── analysis/        # Project analysis and research notes
```

### When to Create Documentation:

- **requirements/**: Before implementing any new feature or change
- **design/**: Before writing code for non-trivial changes
- **standards/**: When establishing or updating coding patterns
- **analysis/**: When researching problems or exploring solutions

---

## Development Workflow

### 1. Setup
```bash
pnpm install
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and OPENAI_MODEL (optional: OPENAI_LITE_MODEL, OPENAI_LITE_BASE_URL)
```

### 2. Development
```bash
pnpm run dev  # Start with hot reload
```

### 3. Testing
```bash
# Test the LangChain API
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"List files in sandbox, then write a hello.txt"}'

# Test with intermediate steps
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d '{"input":"List files","includeSteps":true}'

# Test the lite agent
curl -X POST http://localhost:3000/run-lite \
  -H "content-type: application/json" \
  -d '{"input":"List files in sandbox-lite, then write hello.txt"}'
```

---

## Coding Standards

See `docs/standards/coding-standards.md` for detailed conventions.

### Key Principles:
- **ES Modules**: Use `import`/`export` (type: "module" in package.json)
- **Async/Await**: Prefer over promises and callbacks
- **Error Handling**: Always validate inputs and handle errors gracefully
- **Security**: All file operations must stay within sandbox
- **Minimal Dependencies**: Only add dependencies when truly necessary

---

## Architecture Decisions

### Why ReAct Pattern?
The ReAct (Reasoning + Acting) pattern allows the agent to:
1. Reason about what action to take
2. Execute the action using tools
3. Observe the result
4. Repeat until the task is complete

This makes the agent's decision-making process transparent and debuggable.

### Why Sandbox?
All file operations are restricted to `./sandbox` to prevent:
- Accidental modification of project files
- Security vulnerabilities from path traversal
- Unintended side effects during experimentation

### Why Cached Executor?
The agent executor is cached to avoid:
- Repeated prompt downloads from LangChain Hub
- Multiple LLM client initializations
- Unnecessary overhead on subsequent requests

---

## Common Tasks

### Adding a New Tool
1. Document the tool's purpose in `docs/requirements/`
2. Design the tool interface in `docs/design/`
3. Implement in `packages/api/src/tools.js` following existing patterns
4. Add to `buildTools()` return array
5. Test thoroughly with sandbox restrictions

### Modifying the Agent
1. Document why the change is needed
2. Design the modification approach
3. Update `packages/api/src/agent.js`
4. Test with various inputs to ensure stability

### Changing API Behavior
1. Document the API change requirement
2. Design backward compatibility strategy (if needed)
3. Update `packages/api/src/server.js`
4. Update API documentation in README.md

---

## Security Considerations

- **Path Traversal**: `resolveSandboxPath()` prevents escaping sandboxes
- **Command Injection**: `run_tests` tool only allows whitelisted commands
- **Input Validation**: All tool inputs validated with Zod schemas
- **API Keys**: Never commit `.env` file (in `.gitignore`)

---

## Troubleshooting

### Agent Not Responding
- Check `OPENAI_API_KEY` is set correctly
- Verify `OPENAI_MODEL` is valid (e.g., "gpt-4", "gpt-3.5-turbo")
- Check network connectivity to OpenAI API

### Tool Execution Errors
- Ensure sandbox directory exists and is writable
- Verify file paths don't attempt to escape sandbox
- Check tool input validation with Zod schemas

### Performance Issues
- Consider reducing `maxIterations` in agent executor
- Monitor OpenAI API rate limits
- Check for large file operations in sandbox

---

## Resources

- [LangChain Documentation](https://js.langchain.com/)
- [ReAct Pattern Paper](https://arxiv.org/abs/2210.03629)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

## Questions or Issues?

Before making changes:
1. Check existing documentation in `docs/`
2. Review coding standards
3. Create requirement and design docs
4. Discuss approach before implementing
