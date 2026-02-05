import express from "express";
import dotenv from "dotenv";
import { getExecutor } from "./agent.js";

dotenv.config();

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

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`agent API listening on http://localhost:${port}`);
});
