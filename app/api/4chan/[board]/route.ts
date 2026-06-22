import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const board = url.pathname.split("/").at(-1);

  if (!board) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }

  const res = await fetch(
    `https://a.4cdn.org/${board}/catalog.json`,
    {
      cache: "no-store",
    }
  );

  const data = await res.json();

  return NextResponse.json(data);
}