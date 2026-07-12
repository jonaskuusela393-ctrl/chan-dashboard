import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { getBusinessWorkspace, runBusinessAction } from "@/lib/businessSuite";
import { sendTwilioSms } from "@/lib/twilioApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest) {
  return (process.env.APP_BASE_URL || req.nextUrl.origin).replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const workspace = await getBusinessWorkspace(req.nextUrl.searchParams.get("leadId") || "");
    return NextResponse.json({ ok: true, messages: workspace.messages.filter((message: { channel: string }) => message.channel === "sms"), configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "SMS load failed" }, { status: authStatus(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const to = String(body.to || "").trim();
    const text = String(body.body || "").trim();
    if (!to || !text) return NextResponse.json({ ok: false, error: "phone number and message are required" }, { status: 400 });
    const sent = await sendTwilioSms({ to, body: text, statusCallback: `${baseUrl(req)}/api/sms/status` });
    await runBusinessAction("message.add", { leadId: body.leadId, channel: "sms", direction: "outbound", sender: sent.from, recipient: sent.to, subject: "", body: text, externalId: sent.sid, threadId: sent.to, status: sent.status, unread: false });
    return NextResponse.json({ ok: true, ...sent });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "SMS send failed" }, { status: authStatus(error) });
  }
}
