import OpenAI from "openai";
import { getToolDefinitions, runTool } from "./tools/index.js";

// Docs: docs/requirements/run-lite-agent.md, docs/design/run-lite-agent.md

const DEFAULT_MAX_ITERATIONS = 6;
const DEFAULT_MAX_OUTPUT_TOKENS = 600;

function buildSystemPrompt(tools) {
  const toolLines = tools
    .map((tool) => {
      return `- ${tool.name}: ${tool.description}\n  schema: ${JSON.stringify(tool.schema)}`;
    })
    .join("\n");

  return [
    "You are a tool-using agent.",
    "You must respond with valid JSON only.",
    "Use exactly one of the following JSON shapes:",
    '{ "type": "tool", "name": "tool_name", "args": { ... } }',
    '{ "type": "final", "content": "your answer" }',
    "If a tool is needed, respond with type=tool.",
    "When you are done, respond with type=final.",
    "Do not wrap JSON in markdown fences.",
    "Available tools:",
    toolLines
  ].join("\n");
}

function normalizeModelOutput(content) {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```json/i, "```");
    text = text.replace(/^```/, "");
    if (text.endsWith("```")) {
      text = text.slice(0, -3);
    }
    text = text.trim();
  }
  return text;
}

function parseModelOutput(content) {
  const text = normalizeModelOutput(content);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error("Invalid model output format (expected JSON).");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid model output format (expected JSON object).");
  }

  if (payload.type !== "tool" && payload.type !== "final") {
    throw new Error("Invalid model output format (unknown type).");
  }

  if (payload.type === "tool") {
    if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
      throw new Error("Tool call missing name.");
    }
    if (payload.args == null) {
      payload.args = {};
    }
  }

  if (payload.type === "final") {
    if (typeof payload.content !== "string") {
      throw new Error("Final response missing content.");
    }
  }

  return payload;
}

async function callModel(client, model, messages) {
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0,
    max_tokens: DEFAULT_MAX_OUTPUT_TOKENS
  });

  const choice = response.choices?.[0]?.message?.content;
  if (!choice) {
    throw new Error("Empty model response.");
  }
  return choice;
}

export async function runLiteAgent({ input, includeSteps = false, maxIterations = DEFAULT_MAX_ITERATIONS }) {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("input must be a non-empty string.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_LITE_MODEL || process.env.OPENAI_MODEL;
  const baseURL = process.env.OPENAI_LITE_BASE_URL;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }
  if (!model) {
    throw new Error("Missing OPENAI_MODEL in environment.");
  }

  const client = new OpenAI({ apiKey, baseURL });
  const tools = getToolDefinitions();
  const steps = [];

  const messages = [
    { role: "system", content: buildSystemPrompt(tools) },
    { role: "user", content: input }
  ];

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const content = await callModel(client, model, messages);
    const action = parseModelOutput(content);

    messages.push({ role: "assistant", content });

    if (action.type === "final") {
      steps.push({ type: "final", content: action.content });
      return includeSteps ? { output: action.content, steps } : { output: action.content };
    }

    const result = await runTool(action.name, action.args || {});
    steps.push({ type: "tool", name: action.name, args: action.args || {}, result });
    const observation = JSON.stringify({
      type: "observation",
      name: action.name,
      result
    });
    messages.push({ role: "user", content: observation });
  }

  throw new Error("Exceeded max iterations.");
}
