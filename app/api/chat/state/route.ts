import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listChatMessages, listChatMessagesAfter, listPresence, touchPresence } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req);
    await touchPresence(session.username, session.role);
    const after = Math.max(0, Number(req.nextUrl.searchParams.get("after") || 0) || 0);
    const [messages, presence] = await Promise.all([
      after > 0 ? listChatMessagesAfter(after, 100) : listChatMessages(80),
      listPresence(),
    ]);
    return NextResponse.json({ ok: true, me: { username: session.username, role: session.role }, messages, presence, incremental: after > 0 });
  } catch (error: any) {
    return jsonError(error?.message || "Chat state failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
