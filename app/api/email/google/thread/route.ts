import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { getGmailThread, modifyGmailThread } from "@/lib/gmailApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ ok: false, error: "thread id is required" }, { status: 400 });
    const thread = await getGmailThread(id);
    await modifyGmailThread(id, [], ["UNREAD"]).catch(() => undefined);
    return NextResponse.json({ ok: true, thread });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail thread failed" }, { status: authStatus(error) });
  }
}
