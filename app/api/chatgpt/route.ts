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
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-2.0-flash",
    passwordRemoved: true,
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Missing GEMINI_API_KEY in Vercel." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json({ error: "Empty message." }, { status: 400 });
    }

    const history = cleanHistory(body?.history);

    // Convert your history into Gemini format
    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            role: "system",
            parts: [
              {
                text: "You are ChatGPT inside a private custom dashboard terminal UI. Answer clearly, directly, and practically. Keep formatting readable in a terminal.",
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "[empty response]";

    return new Response(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("GEMINI_TERMINAL_ERROR:", message);

    return Response.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
