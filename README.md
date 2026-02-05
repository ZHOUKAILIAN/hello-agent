# hello-agent

A minimal LangChain + ReAct JS API that lets you learn agent basics with tool calling, plus a hand-rolled lite agent.

## What this project does
- Exposes a small HTTP API (`POST /run`) to run a ReAct agent.
- Exposes a lite agent endpoint (`POST /run-lite`) with a hand-rolled loop.
- Uses LangChain tools to read/write files inside `./sandbox` only.
- Uses lite tools to read/write files inside `./sandbox-lite` only.
- Optionally returns ReAct intermediate steps for learning/debugging.
- Designed for experimenting with prompt engineering and agent workflows.

## Setup

```bash
pnpm i
cp .env.example .env
```

## Run

```bash
pnpm run dev
```

## API

```bash
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d "{\"input\":\"List files in sandbox, then write a hello.txt\"}"
```

If you want to see ReAct steps:

```bash
curl -X POST http://localhost:3000/run \
  -H "content-type: application/json" \
  -d "{\"input\":\"List files in sandbox, then write a hello.txt\",\"includeSteps\":true}"
```

Lite agent:

```bash
curl -X POST http://localhost:3000/run-lite \
  -H "content-type: application/json" \
  -d "{\"input\":\"List files in sandbox-lite, then write a hello.txt\"}"
```

## Notes
- LangChain tools are restricted to the `./sandbox` folder.
- Lite tools are restricted to the `./sandbox-lite` folder.
- You must set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env` (optional: `OPENAI_LITE_MODEL`, `OPENAI_LITE_BASE_URL` for non-OpenAI providers).
