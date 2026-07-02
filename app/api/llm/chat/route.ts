import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Msg = {
  role: "system" | "user" | "assistant";
  content: string;
};

type BridgeResponse = {
  reply?: unknown;
  model?: unknown;
  message?: {
    role?: unknown;
    content?: unknown;
  };
  response?: unknown;
  error?: unknown;
  messageText?: unknown;
};

function cleanModel(value: unknown) {
  return String(value || process.env.LOCAL_LLM_MODEL || "llama3.1")
    .replace(/[^a-zA-Z0-9._:/-]/g, "")
    .slice(0, 120)
    .trim() || "llama3.1";
}

function cleanBaseUrl(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function cleanMessages(value: unknown): Msg[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message): message is { role?: unknown; content?: unknown } => {
      return Boolean(message) && typeof message === "object";
    })
    .map((message): Msg => {
      const role: Msg["role"] =
        message.role === "assistant"
          ? "assistant"
          : message.role === "system"
            ? "system"
            : "user";

      const content =
        typeof message.content === "string" ? message.content.slice(0, 8000) : "";

      return {
        role,
        content,
      };
    })
    .filter((message) => message.content.trim().length > 0)
    .slice(-24);
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function safeEqual(a: string, b: string) {
  if (!a || !b) {
    return false;
  }

  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

async function readJsonOrText(response: Response): Promise<BridgeResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
    };
  }
}

function getBridgeReply(data: BridgeResponse) {
  if (typeof data.reply === "string") {
    return data.reply.trim();
  }

  if (typeof data.message?.content === "string") {
    return data.message.content.trim();
  }

  if (typeof data.response === "string") {
    return data.response.trim();
  }

  if (typeof data.messageText === "string") {
    return data.messageText.trim();
  }

  return "";
}

function getBridgeError(data: BridgeResponse, fallback: string) {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  return fallback;
}

export async function GET(req: NextRequest) {
  const requiredKey = process.env.DASHBOARD_ACCESS_KEY;

  if (requiredKey) {
    const supplied = req.headers.get("x-dashboard-key") || "";

    if (!safeEqual(supplied, requiredKey)) {
      return jsonError("Wrong or missing dashboard key.", 401);
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "local-model-through-tunnel",
    configured: Boolean(process.env.LOCAL_LLM_URL),
    hasToken: Boolean(process.env.LOCAL_LLM_TOKEN),
    protected: Boolean(requiredKey),
    model: process.env.LOCAL_LLM_MODEL || "llama3.1",
    timeoutMs: Number(process.env.LOCAL_LLM_TIMEOUT_MS || 55000),
  });
}

export async function POST(req: NextRequest) {
  try {
    const requiredKey = process.env.DASHBOARD_ACCESS_KEY;

    if (requiredKey) {
      const supplied = req.headers.get("x-dashboard-key") || "";

      if (!safeEqual(supplied, requiredKey)) {
        return jsonError("Wrong or missing dashboard key.", 401);
      }
    }

    const baseUrl = cleanBaseUrl(process.env.LOCAL_LLM_URL);

    if (!baseUrl) {
      return jsonError(
        "LOCAL_LLM_URL is not set in Vercel. Set it to your PC tunnel URL, for example https://xxxxx.trycloudflare.com",
        500
      );
    }

    if (!/^https?:\/\//i.test(baseUrl)) {
      return jsonError("LOCAL_LLM_URL must start with http:// or https://", 500);
    }

    const body = await req.json().catch(() => ({}));

    const model = cleanModel(body.model);
    const messages = cleanMessages(body.messages);

    if (!messages.length) {
      return jsonError("missing messages", 400);
    }

    const timeoutMs = Math.min(
      Math.max(Number(process.env.LOCAL_LLM_TIMEOUT_MS || 55000), 1000),
      59000
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(process.env.LOCAL_LLM_TOKEN
            ? {
                Authorization: `Bearer ${process.env.LOCAL_LLM_TOKEN}`,
              }
            : {}),
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await readJsonOrText(response);

    if (!response.ok) {
      throw new Error(
        getBridgeError(data, `Local LLM bridge returned ${response.status}`)
      );
    }

    const reply = getBridgeReply(data);

    return NextResponse.json({
      ok: true,
      reply: reply || "(empty response)",
      model:
        typeof data.model === "string" && data.model.trim()
          ? data.model
          : model,
    });
  } catch (error: any) {
    const message =
      error?.name === "AbortError"
        ? "Local model timed out. Use a smaller model, shorter prompt, or raise LOCAL_LLM_TIMEOUT_MS."
        : error?.message || "Local LLM failed";

    return jsonError(message, 500);
  }
}