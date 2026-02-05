# hello-agent

A minimal LangChain + ReAct JS API that lets you learn agent basics with tool calling.

## What this project does
- Exposes a small HTTP API (`POST /run`) to run a ReAct agent.
- Uses LangChain tools to read/write files inside `./sandbox` only.
- Optionally returns ReAct intermediate steps for learning/debugging.
- Designed for experimenting with prompt engineering and agent workflows.

## Setup

```bash
npm i
cp .env.example .env
```

## Run

```bash
npm run dev
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

## Notes
- Tools are restricted to the `./sandbox` folder.
- You must set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env`.
