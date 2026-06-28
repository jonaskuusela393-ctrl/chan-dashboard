import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((msg) => {
      return (
        msg &&
        typeof msg === "object" &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string"
      );
    })
    .slice(-20)
    .map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, 6000),
    }));
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const savedPassword = process.env.CHAT_TERMINAL_PASSWORD;

    if (savedPassword) {
      const givenPassword = req.headers.get("x-chat-password") || "";

      if (givenPassword !== savedPassword) {
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
      return Response.json({ error: "Message is empty." }, { status: 400 });
    }

    const history = cleanMessages(body?.history);

    const transcript = history
      .map((msg) => {
        const name = msg.role === "user" ? "USER" : "ASSISTANT";
        return `${name}: ${msg.content}`;
      })
      .join("\n\n");

    const input = transcript
      ? `Conversation so far:\n${transcript}\n\nNew USER message:\n${message}`
      : message;

    const stream = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      instructions:
        "You are ChatGPT running inside Jonas's custom dashboard terminal UI. Answer clearly, directly, and helpfully. Keep formatting readable in a terminal. Do not claim to be the ChatGPT website.",
      input,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(encoder.encode(event.delta));
            }

            if (event.type === "response.refusal.delta") {
              controller.enqueue(encoder.encode(event.delta));
            }

            if (event.type === "error") {
              controller.enqueue(
                encoder.encode("\n\n[error] Something went wrong.")
              );
            }
          }

          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              "\n\n[error] Stream failed. Check server logs and API key."
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Server error while talking to OpenAI." },
      { status: 500 }
    );
  }
}