import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { board: string } }
) {
  const board = params?.board;

  if (!board) {
    return NextResponse.json(
      { error: "Missing board" },
      { status: 400 }
    );
  }

  const url = `https://a.4cdn.org/${board}/catalog.json`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `4chan HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("Proxy error:", err);

    return NextResponse.json(
      { error: "Failed to fetch 4chan API" },
      { status: 500 }
    );
  }
}