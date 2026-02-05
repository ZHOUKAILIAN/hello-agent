import fs from "node:fs/promises";
import path from "node:path";
import { ensureSandbox, resolveSandboxPath, SANDBOX_DIR } from "./sandbox.js";

const TOOL_DEFINITIONS = [
  {
    name: "list_files",
    description: "List top-level files in sandbox-lite.",
    schema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "read_file",
    description: "Read a file under sandbox-lite. Provide a relative filePath.",
    schema: {
      type: "object",
      properties: { filePath: { type: "string" } },
      required: ["filePath"],
      additionalProperties: false
    }
  },
  {
    name: "write_file",
    description: "Write a file under sandbox-lite. Provide relative filePath and content.",
    schema: {
      type: "object",
      properties: {
        filePath: { type: "string" },
        content: { type: "string" }
      },
      required: ["filePath", "content"],
      additionalProperties: false
    }
  }
];

const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));

export function getToolDefinitions() {
  return TOOL_DEFINITIONS;
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
}

function validateArgs(name, args) {
  if (args == null || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("args must be an object.");
  }

  if (name === "list_files") {
    if (Object.keys(args).length > 0) {
      throw new Error("list_files does not accept arguments.");
    }
    return;
  }

  if (name === "read_file") {
    assertNonEmptyString(args.filePath, "filePath");
    return;
  }

  if (name === "write_file") {
    assertNonEmptyString(args.filePath, "filePath");
    assertNonEmptyString(args.content, "content");
    return;
  }
}

export async function runTool(name, args) {
  if (!TOOL_NAMES.has(name)) {
    throw new Error(`Unknown tool: ${name}`);
  }

  validateArgs(name, args);
  await ensureSandbox();

  if (name === "list_files") {
    const entries = await fs.readdir(SANDBOX_DIR, { withFileTypes: true });
    const names = entries.map((entry) => entry.name);
    return names.length ? names.join("\n") : "(empty)";
  }

  if (name === "read_file") {
    const target = resolveSandboxPath(args.filePath);
    return await fs.readFile(target, "utf8");
  }

  if (name === "write_file") {
    const target = resolveSandboxPath(args.filePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, args.content, "utf8");
    return `Wrote ${args.filePath}`;
  }

  throw new Error(`Unhandled tool: ${name}`);
}
