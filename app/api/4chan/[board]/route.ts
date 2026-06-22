import { NextRequest } from "next/server";

export async function GET(req: NextRequest, context: any) {
  const params = await Promise.resolve(context?.params);

  const board = params?.board;

  if (typeof board !== "string" || !board) {
    return new Response("Invalid board", { status: 400 });
  }

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/catalog.json`,
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "application/json",
        },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      return new Response(text, { status: 502 });
    }

    return new Response(text, {
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (err) {
    return new Response("Fetch failed", { status: 500 });
  }
}