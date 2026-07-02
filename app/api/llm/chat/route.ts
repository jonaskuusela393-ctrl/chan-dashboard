import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Msg = { role: "system" | "user" | "assistant"; content: string };

function cleanModel(value: unknown) {
  return String(value || process.env.LOCAL_LLM_MODEL || "llama3.1")
    .replace(/[^a-zA-Z0-9._:/-]/g, "")
    .slice(0, 120);
}

function cleanMessages(value: unknown): Msg[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((m): m is { role?: unknown; content?: unknown } => {
      return !!m && typeof m === "object";
    })
    .map((m): Msg => {
      const role: Msg["role"] =
        m.role === "assistant"
          ? "assistant"
          : m.role === "system"
            ? "system"
            : "user";

      return {
        role,
        content: typeof m.content === "string" ? m.content.slice(0, 8000) : "",
      };
    })
    .filter((m) => m.content.trim().length > 0)
    .slice(-20);
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "local-model-through-tunnel",
    configured: Boolean(process.env.LOCAL_LLM_URL),
    model: process.env.LOCAL_LLM_MODEL || "llama3.1"
  });
}

export async function POST(req: NextRequest) {
  try {
    const requiredKey = process.env.DASHBOARD_ACCESS_KEY;
    if (requiredKey) {
      const supplied = req.headers.get("x-dashboard-key") || "";
      if (supplied !== requiredKey) return jsonError("Wrong or missing dashboard key.", 401);
    }

    const baseUrl = (process.env.LOCAL_LLM_URL || "").replace(/\/+$/, "");
    if (!baseUrl) {
      return jsonError("LOCAL_LLM_URL is not set in Vercel. Set it to your PC tunnel URL, for example https://xxxxx.trycloudflare.com");
    }

    const body = await req.json().catch(() => ({}));
    const model = cleanModel(body.model);
    const messages = cleanMessages(body.messages);
    if (!messages.length) return jsonError("missing messages", 400);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.LOCAL_LLM_TIMEOUT_MS || 55000));

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LOCAL_LLM_TOKEN ? { Authorization: `Bearer ${process.env.LOCAL_LLM_TOKEN}` } : {})
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Local LLM bridge returned ${res.status}`);

    return NextResponse.json({
      reply: String(data.reply || "").trim() || "(empty response)",
      model: data.model || model
    });
  } catch (err: any) {
    const message = err?.name === "AbortError"
      ? "Local model timed out. Use a smaller model, shorter prompt, or raise LOCAL_LLM_TIMEOUT_MS/maxDuration."
      : err?.message || "Local LLM failed";
    return jsonError(message, 500);
  }
}
