import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent, AgentExecutor } from "langchain/agents";
import { pull } from "langchain/hub";
import { buildTools } from "./tools.js";

let cachedExecutor = null;

export async function getExecutor() {
  if (cachedExecutor) {
    return cachedExecutor;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }
  if (!model) {
    throw new Error("Missing OPENAI_MODEL in environment.");
  }

  const tools = buildTools();
  const llm = new ChatOpenAI({
    model,
    temperature: 0
  });

  const prompt = await pull("hwchase17/react");
  const agent = await createReactAgent({ llm, tools, prompt });

  cachedExecutor = new AgentExecutor({
    agent,
    tools,
    returnIntermediateSteps: true,
    maxIterations: 6
  });

  return cachedExecutor;
}
