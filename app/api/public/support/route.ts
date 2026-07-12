import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { addClientRequestByToken } from "@/lib/clientSites";
import { publicRequestAllowed } from "@/lib/publicThrottle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ip(req: NextRequest) { return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim(); }
function hash(value: string) { return crypto.createHash("sha256").update(`${process.env.AUTH_SECRET || "public"}:${value}`).digest("hex").slice(0, 24); }
async function verifyTurnstile(token: string, remoteip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  if (!secret) return true;
  if (!token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: token, remoteip }), cache: "no-store" });
  const data = await response.json().catch(() => ({})) as { success?: boolean };
  return Boolean(data.success);
}
async function notify(projectName: string, data: Record<string, unknown>) {
  const key = process.env.RESEND_API_KEY || "";
  const to = process.env.PUBLIC_CONTACT_TO_EMAIL || process.env.NEXT_PUBLIC_SERVICE_EMAIL || "";
  const from = process.env.PUBLIC_CONTACT_FROM_EMAIL || process.env.EMAIL_FROM || "";
  if (!key || !to || !from) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], reply_to: String(data.email || ""), subject: `[Client request] ${projectName}: ${String(data.subject || "")}`.replace(/[\r\n]/g, " "), text: `${String(data.name || "")} <${String(data.email || "")}>\nPriority: ${String(data.priority || "normal")}\nType: ${String(data.type || "change")}\n\n${String(data.message || "")}` }) });
  return response.ok;
}

export async function POST(req: NextRequest) {
  try {
    const remote = ip(req);
    const gate = publicRequestAllowed(`support:${hash(remote)}`, 8, 15 * 60 * 1000);
    if (!gate.allowed) return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (String(body.companyWebsite || "").trim()) return NextResponse.json({ ok: true });
    const startedAt = Number(body.startedAt || 0);
    if (!startedAt || Date.now() - startedAt < 2500) return NextResponse.json({ ok: false, error: "Please wait a moment and try again." }, { status: 400 });
    if (!(await verifyTurnstile(String(body.turnstileToken || ""), remote))) return NextResponse.json({ ok: false, error: "Spam verification failed." }, { status: 400 });
    const result = await addClientRequestByToken(body);
    const notificationSent = await notify(result.projectName, body).catch(() => false);
    return NextResponse.json({ ok: true, requestId: result.request.id, notificationSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request could not be saved";
    return NextResponse.json({ ok: false, error: message }, { status: /valid|recognised|required|enter/i.test(message) ? 400 : 500 });
  }
}
