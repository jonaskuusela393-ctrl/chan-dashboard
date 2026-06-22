import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { board: string } }
) {
  const url = `https://a.4cdn.org/${params.board}/catalog.json`;

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

    return NextResponse.json(data);
  } catch (err) {
    console.error("4chan API error:", err);

    return NextResponse.json(
      { error: "Failed to fetch 4chan" },
      { status: 500 }
    );
  }
}