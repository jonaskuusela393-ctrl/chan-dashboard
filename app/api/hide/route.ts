import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HideBody = {
  itemId?: number;
  itemType?: "post" | "thread" | "board";
  board?: string;
};

function isValidItemType(value: unknown): value is "post" | "thread" | "board" {
  return value === "post" || value === "thread" || value === "board";
}

export async function POST(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        {
          error: "DATABASE_URL is missing",
        },
        { status: 500 }
      );
    }

    const sql = neon(databaseUrl);
    const body = (await request.json()) as HideBody;

    const itemId = body.itemId;
    const itemType = body.itemType;
    const board = body.board;

    if (!Number.isInteger(itemId)) {
      return NextResponse.json(
        {
          error: "Missing or invalid itemId",
        },
        { status: 400 }
      );
    }

    if (!isValidItemType(itemType)) {
      return NextResponse.json(
        {
          error: "Missing or invalid itemType",
        },
        { status: 400 }
      );
    }

    if (!board || typeof board !== "string") {
      return NextResponse.json(
        {
          error: "Missing or invalid board",
        },
        { status: 400 }
      );
    }

    await sql`
      CREATE TABLE IF NOT EXISTS hidden_items (
        id BIGSERIAL PRIMARY KEY,
        item_id BIGINT NOT NULL,
        item_type TEXT NOT NULL,
        board TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT hidden_items_unique UNIQUE (item_id, item_type, board)
      )
    `;

    await sql`
      INSERT INTO hidden_items (item_id, item_type, board)
      VALUES (${itemId}, ${itemType}, ${board})
      ON CONFLICT (item_id, item_type, board)
      DO NOTHING
    `;

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