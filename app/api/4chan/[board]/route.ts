import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteProps = {
  params: Promise<{
    board: string;
  }>;
};

function isValidBoard(board: string) {
  return /^[a-z0-9]+$/i.test(board);
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { board } = await params;

  if (!board || !isValidBoard(board)) {
    return NextResponse.json(
      { error: "Invalid board" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://a.4cdn.org/${board}/catalog.json`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("4chan catalog API failed:", res.status, text.slice(0, 300));

      return NextResponse.json(
        {
          error: "4chan catalog fetch failed",
          status: res.status,
        },
        { status: 502 }
      );
    }

    try {
      JSON.parse(text);
    } catch {
      console.error("4chan catalog returned non-JSON:", text.slice(0, 300));

      return NextResponse.json(
        { error: "4chan returned non-JSON response" },
        { status: 502 }
      );
    }

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Catalog proxy fetch failed:", err);

    return NextResponse.json(
      { error: "Fetch failed" },
      { status: 500 }
    );
  }
}