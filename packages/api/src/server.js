import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getExecutor } from "./agent.js";
import { runLite } from "./runLiteRoute.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..", "..");
dotenv.config({ path: path.resolve(repoRoot, ".env") });

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/run", async (req, res) => {
  try {
    const { input, includeSteps = false } = req.body || {};
    if (!input || typeof input !== "string") {
      res.status(400).json({ error: "input must be a non-empty string." });
      return;
    }

    const executor = await getExecutor();
    const result = await executor.invoke({ input });

    const response = { output: result.output };
    if (includeSteps) {
      response.steps = result.intermediateSteps;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

app.post("/run-lite", async (req, res) => {
  await runLite(req, res);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`agent API listening on http://localhost:${port}`);
});
