import { NextRequest, NextResponse } from "next/server";
import { updateExternalMessageStatus } from "@/lib/businessSuite";
import { validateTwilioSignature } from "@/lib/twilioApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicUrl(req: NextRequest) {
  const base = (process.env.APP_BASE_URL || req.nextUrl.origin).replace(/\/$/, "");
  return `${base}/api/sms/status`;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => { params[key] = String(value); });
  const signature = req.headers.get("x-twilio-signature") || "";
  if (!validateTwilioSignature(publicUrl(req), params, signature)) return new NextResponse("invalid signature", { status: 403 });
  await updateExternalMessageStatus("sms", String(params.MessageSid || params.SmsSid || ""), String(params.MessageStatus || params.SmsStatus || "unknown"), { errorCode: params.ErrorCode || "", errorMessage: params.ErrorMessage || "" }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
