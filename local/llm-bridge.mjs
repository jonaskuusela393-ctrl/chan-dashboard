import http from "node:http";

const PORT = Number(process.env.LOCAL_LLM_BRIDGE_PORT || 43111);
const HOST = process.env.LOCAL_LLM_BRIDGE_HOST || "127.0.0.1";
const TOKEN = process.env.LOCAL_LLM_TOKEN || "";
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const DEFAULT_MODEL = process.env.LOCAL_LLM_MODEL || "llama3.1";
const NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || 2048);

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

function allowed(req) {
  if (!TOKEN) return true;
  return req.headers.authorization === `Bearer ${TOKEN}`;
}

function cleanMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : m?.role === "system" ? "system" : "user",
      content: String(m?.content || "").slice(0, 12000)
    }))
    .filter((m) => m.content.trim())
    .slice(-20);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 200, { ok: true });
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/health") {
      return send(res, 200, { ok: true, bridge: "local-llm", ollama: OLLAMA_URL, model: DEFAULT_MODEL });
    }

    if (url.pathname !== "/api/chat" || req.method !== "POST") {
      return send(res, 404, { error: "not found" });
    }

    if (!allowed(req)) return send(res, 401, { error: "unauthorized" });

    const body = await readJson(req);
    const model = String(body.model || DEFAULT_MODEL).replace(/[^a-zA-Z0-9._:/-]/g, "").slice(0, 120) || DEFAULT_MODEL;
    const messages = cleanMessages(body.messages);
    if (!messages.length) return send(res, 400, { error: "missing messages" });

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { num_predict: NUM_PREDICT }
      })
    });
    const data = await ollamaRes.json().catch(() => ({}));
    if (!ollamaRes.ok) {
      return send(res, 502, { error: data.error || `Ollama returned ${ollamaRes.status}` });
    }

    return send(res, 200, {
      reply: data.message?.content || data.response || "",
      model
    });
  } catch (err) {
    return send(res, 500, { error: err?.message || "bridge failed" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`local LLM bridge: http://${HOST}:${PORT}`);
  console.log(`Ollama: ${OLLAMA_URL}`);
  console.log(TOKEN ? "token required" : "WARNING: no LOCAL_LLM_TOKEN set");
});
