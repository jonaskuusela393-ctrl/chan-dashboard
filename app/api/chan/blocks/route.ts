import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { listBoardBlocks, setBoardBlock } from "@/lib/db";
import { cleanBoard, validBoard } from "@/lib/chan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const session = requireAdmin(req);
    const blocks = await listBoardBlocks(session.username);
    return NextResponse.json({ ok: true, blocks });
  } catch (error: any) {
    return jsonError(error?.message || "Could not load board blocks", authStatus(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const board = cleanBoard(String(body.board || ""));
    const mode = String(body.mode || "");
    if (!validBoard(board)) return jsonError("Bad board", 400);
    const days = mode === "permanent" ? null : Number(mode);
    if (days !== null && ![1, 7, 30].includes(days)) return jsonError("Mode must be 1, 7, 30, or permanent", 400);
    await setBoardBlock(session.username, board, days);
    const blocks = await listBoardBlocks(session.username);
    return NextResponse.json({ ok: true, board, blocks });
  } catch (error: any) {
    return jsonError(error?.message || "Could not disable board", authStatus(error));
  }
}
