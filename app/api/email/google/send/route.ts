import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { sendGmailMessage } from "@/lib/gmailApi";
import { runBusinessAction } from "@/lib/businessSuite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const text = String(body.body || "");
    if (!to || !subject || !text) return NextResponse.json({ ok: false, error: "to, subject and body are required" }, { status: 400 });
    const sent = await sendGmailMessage({ to, cc: String(body.cc || ""), bcc: String(body.bcc || ""), subject, body: text, threadId: String(body.threadId || ""), inReplyTo: String(body.inReplyTo || ""), references: String(body.references || "") });
    await runBusinessAction("message.add", { leadId: body.leadId, channel: "email", direction: "outbound", sender: "me", recipient: to, subject, body: text, externalId: sent.id || "", threadId: sent.threadId || body.threadId || "", status: "sent", unread: false }).catch(() => undefined);
    return NextResponse.json({ ok: true, id: sent.id || "", threadId: sent.threadId || "" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail send failed" }, { status: authStatus(error) });
  }
}
