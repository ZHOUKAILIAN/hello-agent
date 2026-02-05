import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..", "..", "..");
const SANDBOX_DIR = path.resolve(repoRoot, "sandbox-lite");

export async function ensureSandbox() {
  await fs.mkdir(SANDBOX_DIR, { recursive: true });
}

export function resolveSandboxPath(userPath) {
  const target = path.resolve(SANDBOX_DIR, userPath);
  if (target !== SANDBOX_DIR && !target.startsWith(SANDBOX_DIR + path.sep)) {
    throw new Error(`Path escapes sandbox: ${userPath}`);
  }
  return target;
}

export { SANDBOX_DIR };
