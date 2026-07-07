import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clean(value: unknown, max = 5000) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const to = clean(body.to, 320);
    const subject = clean(body.subject, 180);
    const message = clean(body.body, 10000);
    const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || "";
    const key = process.env.RESEND_API_KEY || "";

    if (!validEmail(to)) return jsonError("Recipient email is missing or invalid", 400);
    if (!subject || !message) return jsonError("Subject and body are required", 400);
    if (!key || !from) return jsonError("RESEND_API_KEY and EMAIL_FROM are not set. Use copy/mailto mode instead.", 500);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text: message }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return jsonError(data?.message || data?.error || `Resend returned ${response.status}`, response.status);
    return NextResponse.json({ ok: true, id: data?.id || "sent" });
  } catch (error: any) {
    return jsonError(error?.message || "Email send failed", authStatus(error));
  }
}
