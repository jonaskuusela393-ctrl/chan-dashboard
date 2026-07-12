import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/lib/localStore";
import { runBusinessAction } from "@/lib/businessSuite";
import { normalizePhone, validateTwilioSignature } from "@/lib/twilioApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicUrl(req: NextRequest) {
  const base = (process.env.APP_BASE_URL || req.nextUrl.origin).replace(/\/$/, "");
  return `${base}/api/sms/incoming`;
}

function loosePhone(value: string) {
  try { return normalizePhone(value); } catch { return value.replace(/\D/g, "").slice(-10); }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => { params[key] = String(value); });
  const signature = req.headers.get("x-twilio-signature") || "";
  if (!validateTwilioSignature(publicUrl(req), params, signature)) return new NextResponse("invalid signature", { status: 403 });
  try {
    const from = String(params.From || "");
    const to = String(params.To || "");
    const body = String(params.Body || "");
    const sid = String(params.MessageSid || params.SmsSid || "");
    const leads = await listLeads();
    const match = leads.find((lead) => loosePhone(lead.phone) === loosePhone(from));
    await runBusinessAction("message.add", { leadId: match?.id || "", channel: "sms", direction: "inbound", sender: from, recipient: to, body, externalId: sid, threadId: from, status: "received", unread: true, metadata: { numMedia: params.NumMedia || "0" } });
    if (match) await runBusinessAction("activity.add", { leadId: match.id, kind: "sms_reply", summary: `Received SMS from ${from}` });
  } catch {}
  return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
