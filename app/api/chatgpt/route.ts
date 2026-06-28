import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function cleanHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => {
      if (!item || typeof item !== "object") return false;

      const msg = item as Partial<ChatMessage>;

      return (
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string"
      );
    })
    .slice(-18)
    .map((item) => {
      const msg = item as ChatMessage;

      return {
        role: msg.role,
        content: msg.content.slice(0, 5000),
      };
    });
}

export async function GET() {
  return Response.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    hasPassword: Boolean(process.env.CHATGPT_TERMINAL_PASSWORD),
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY in Vercel." },
        { status: 500 }
      );
    }

    const realPassword = process.env.CHATGPT_TERMINAL_PASSWORD;

    if (realPassword) {
      const givenPassword = req.headers.get("x-terminal-password") || "";

      if (givenPassword !== realPassword) {
        return Response.json(
          { error: "Wrong terminal password." },
          { status: 401 }
        );
      }
    }

    const body = await req.json().catch(() => null);

    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json({ error: "Empty message." }, { status: 400 });
    }

    const history = cleanHistory(body?.history);

    const historyText = history
      .map((msg) => {
        const who = msg.role === "user" ? "USER" : "ASSISTANT";
        return `${who}: ${msg.content}`;
      })
      .join("\n\n");

    const input = historyText
      ? `Previous conversation:\n\n${historyText}\n\nNew message:\n${message}`
      : message;

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "You are ChatGPT inside a private custom dashboard terminal UI. Answer clearly, directly, and practically.",
      input,
    });

    return new Response(response.output_text || "[empty response]", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("CHATGPT_TERMINAL_ERROR:", message);

    return Response.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}