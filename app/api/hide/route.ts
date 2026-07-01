import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type HideBody = {
  itemId?: number;
  itemType?: "post" | "thread" | "board";
  board?: string;
};

function isValidItemType(value: unknown): value is "post" | "thread" | "board" {
  return value === "post" || value === "thread" || value === "board";
}

function isValidBoard(board: string) {
  return /^[a-z0-9]+$/i.test(board);
}

export async function POST(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL is missing" },
        { status: 500 }
      );
    }

    const sql = neon(databaseUrl);

    await sql`
      CREATE TABLE IF NOT EXISTS hidden_items (
        id BIGSERIAL PRIMARY KEY,
        item_id BIGINT NOT NULL,
        item_type TEXT NOT NULL,
        board TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      DELETE FROM hidden_items
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    let body: HideBody;

    try {
      body = (await request.json()) as HideBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const itemId = body.itemId;
    const itemType = body.itemType;
    const board = body.board;

    if (
      typeof itemId !== "number" ||
      !Number.isSafeInteger(itemId) ||
      itemId <= 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid itemId" },
        { status: 400 }
      );
    }

    if (!isValidItemType(itemType)) {
      return NextResponse.json(
        { error: "Missing or invalid itemType" },
        { status: 400 }
      );
    }

    if (!board || typeof board !== "string" || !isValidBoard(board)) {
      return NextResponse.json(
        { error: "Missing or invalid board" },
        { status: 400 }
      );
    }

    const existing = await sql`
      SELECT id
      FROM hidden_items
      WHERE item_id = ${itemId}
      AND item_type = ${itemType}
      AND board = ${board}
      LIMIT 1
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO hidden_items (item_id, item_type, board)
        VALUES (${itemId}, ${itemType}, ${board})
      `;
    }

    return NextResponse.json({
      ok: true,
      itemId,
      itemType,
      board,
    });
  } catch (err) {
    console.error("Hide API failed:", err);

    return NextResponse.json(
      {
        error: "Hide API failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}