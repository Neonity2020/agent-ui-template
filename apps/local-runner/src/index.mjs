import { createServer } from "node:http";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const args = new Set(process.argv.slice(2));
const cliArgs = process.argv.slice(2);
const optionValue = (name) => {
  const index = cliArgs.indexOf(name);
  return index === -1 ? undefined : cliArgs[index + 1];
};
const workspaceArg = optionValue("--workspace");
const portArg = optionValue("--port");

if (!workspaceArg) {
  console.error("Usage: pnpm dev -- --workspace /absolute/path [--allow-write] [--allow-bash] [--port 4242]");
  process.exit(1);
}

const workspace = resolve(workspaceArg);
const agentDir = process.env.PI_AGENT_DIR ?? join(homedir(), ".pi", "agent");
const port = Number(portArg ?? 4242);
const allowedOrigin = process.env.PI_RUNNER_ALLOWED_ORIGIN;
const tools = ["read", "grep", "find", "ls"];
if (args.has("--allow-write")) tools.push("edit", "write");
if (args.has("--allow-bash")) tools.push("bash");

const modelRuntime = await ModelRuntime.create();
const sessions = new Map();

function cors(request, response) {
  const origin = request.headers.origin;
  const isLocalBrowserOrigin = typeof origin === "string" && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  const isAllowed = origin === undefined || origin === allowedOrigin || (!allowedOrigin && isLocalBrowserOrigin);
  if (origin && isAllowed) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return isAllowed;
}

function writeSse(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function getSession(id, systemPrompt) {
  let session = sessions.get(id);
  if (session) return session;

  const resourceLoader = new DefaultResourceLoader({
    cwd: workspace,
    agentDir,
    ...(systemPrompt ? { systemPrompt } : {}),
  });
  await resourceLoader.reload();
  const created = await createAgentSession({
    cwd: workspace,
    modelRuntime,
    tools,
    resourceLoader,
    sessionManager: SessionManager.inMemory(workspace),
  });
  session = created.session;
  sessions.set(id, session);
  return session;
}

const server = createServer(async (request, response) => {
  if (!cors(request, response)) {
    response.writeHead(403).end("Origin is not allowed");
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  if (request.method === "GET" && request.url === "/health") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ status: "ok", workspace, tools }));
    return;
  }
  if (request.method !== "POST" || request.url !== "/v1/prompt") {
    response.writeHead(404).end("Not found");
    return;
  }

  const body = await new Promise((resolveBody, reject) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => resolveBody(raw));
    request.on("error", reject);
  });
  const payload = JSON.parse(body);
  const latestUserMessage = [...(Array.isArray(payload.messages) ? payload.messages : [])]
    .reverse()
    .find((message) => message?.role === "user");
  const prompt = typeof payload.prompt === "string"
    ? payload.prompt
    : latestUserMessage?.parts
        ?.filter((part) => part?.type === "text" && typeof part.text === "string")
        .map((part) => part.text)
        .join("\n");
  const sessionId = payload.sessionId ?? payload.conversationId ?? payload.id;
  if (typeof sessionId !== "string" || !prompt?.trim()) {
    response.writeHead(400).end("A session id and a user text message are required");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const textId = `pi-${crypto.randomUUID()}`;
  let started = false;
  writeSse(response, { type: "start" });
  const session = await getSession(sessionId, typeof payload.systemPrompt === "string" ? payload.systemPrompt : undefined);
  const unsubscribe = session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      if (!started) {
        writeSse(response, { type: "text-start", id: textId });
        started = true;
      }
      writeSse(response, { type: "text-delta", id: textId, delta: event.assistantMessageEvent.delta });
    }
  });
  try {
    await session.prompt(prompt);
    if (started) writeSse(response, { type: "text-end", id: textId });
    writeSse(response, { type: "finish" });
  } catch (error) {
    writeSse(response, { type: "error", errorText: error instanceof Error ? error.message : "Pi Runner failed" });
  } finally {
    unsubscribe();
    response.end();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Pi Local Runner listening on http://127.0.0.1:${port}`);
  console.log(`Workspace: ${workspace}`);
  console.log(`Enabled tools: ${tools.join(", ")}`);
});

server.on("error", (error) => {
  const detail = error.code === "EADDRINUSE"
    ? `Port ${port} is already in use. Stop the existing Runner or use --port.`
    : error.message;
  console.error(`Pi Local Runner could not start: ${detail}`);
  process.exitCode = 1;
});
