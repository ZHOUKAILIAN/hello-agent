import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..", "..");
const SANDBOX_DIR = path.resolve(repoRoot, "sandbox");

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

export function buildTools() {
  const writeFileTool = tool(
    async ({ filePath, content }) => {
      await ensureSandbox();
      const target = resolveSandboxPath(filePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
      return `Wrote ${filePath}`;
    },
    {
      name: "write_file",
      description: "Write a file under ./sandbox only. Provide a relative filePath and full content.",
      schema: z.object({
        filePath: z.string().min(1),
        content: z.string().min(1)
      })
    }
  );

  const readFileTool = tool(
    async ({ filePath }) => {
      await ensureSandbox();
      const target = resolveSandboxPath(filePath);
      return await fs.readFile(target, "utf8");
    },
    {
      name: "read_file",
      description: "Read a file under ./sandbox only. Provide a relative filePath.",
      schema: z.object({
        filePath: z.string().min(1)
      })
    }
  );

  const listFilesTool = tool(
    async () => {
      await ensureSandbox();
      const entries = await fs.readdir(SANDBOX_DIR, { withFileTypes: true });
      const names = entries.map((entry) => entry.name);
      return names.length ? names.join("\n") : "(empty)";
    },
    {
      name: "list_files",
      description: "List top-level files in ./sandbox.",
      schema: z.object({})
    }
  );

  const runTestsTool = tool(
    async ({ command }) => {
      const allowed = new Set(["npm test"]);
      if (!allowed.has(command)) {
        throw new Error(`Command not allowed: ${command}`);
      }
      const output = await execCommand(command, 60_000);
      return output || "(no output)";
    },
    {
      name: "run_tests",
      description: "Run the test command. Only npm test is allowed.",
      schema: z.object({
        command: z.enum(["npm test"])
      })
    }
  );

  return [writeFileTool, readFileTool, listFilesTool, runTestsTool];
}
