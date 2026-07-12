import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { modifyGmailThread } from "@/lib/gmailApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const id = String(body.id || "");
    const action = String(body.action || "");
    if (!id) return NextResponse.json({ ok: false, error: "thread id is required" }, { status: 400 });
    if (action === "archive") await modifyGmailThread(id, [], ["INBOX"]);
    else if (action === "unread") await modifyGmailThread(id, ["UNREAD"], []);
    else if (action === "read") await modifyGmailThread(id, [], ["UNREAD"]);
    else return NextResponse.json({ ok: false, error: "unknown Gmail action" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail action failed" }, { status: authStatus(error) });
  }
}
