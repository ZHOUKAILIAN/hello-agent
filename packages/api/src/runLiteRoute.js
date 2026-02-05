import { runLiteAgent } from "agent-lite";

// Docs: docs/requirements/run-lite-agent.md, docs/design/run-lite-agent.md

export async function runLite(req, res) {
  try {
    const { input, includeSteps = false } = req.body || {};
    if (!input || typeof input !== "string") {
      res.status(400).json({ error: "input must be a non-empty string." });
      return;
    }

    const result = await runLiteAgent({ input, includeSteps });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Unknown error" });
  }
}
