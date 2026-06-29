export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant" | "model";
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
        (msg.role === "user" ||
          msg.role === "assistant" ||
          msg.role === "model") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
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

function extractGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => {
      if (typeof part?.text === "string") return part.text;
      return "";
    })
    .join("")
    .trim();
}

export async function GET() {
  return Response.json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-2.5-flash",
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

    const history = cleanHistory(body?.history || body?.messages);

    const contents = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json().catch(() => null);

    console.log("GEMINI STATUS:", response.status);
    console.log("GEMINI DATA:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return Response.json(
        {
          error:
            data?.error?.message ||
            `Gemini request failed with status ${response.status}`,
          debug: data,
        },
        { status: response.status }
      );
    }

    const text = extractGeminiText(data);

    if (!text) {
      return Response.json({
        reply: "[empty response from Gemini]",
        debug: data,
      });
    }

    return Response.json({
      reply: text,
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