import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { board: string } }
) {
  const board = params.board;

  if (!board) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }

  const res = await fetch(
    `https://a.4cdn.org/${board}/catalog.json`,
    {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      {
        error: "4chan request failed",
        status: res.status,
        body: text,
      },
      { status: 502 }
    );
  }

  let data;
  try {
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON from 4chan" },
      { status: 502 }
    );
  }

  return NextResponse.json(data);
}