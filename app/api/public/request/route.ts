import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { savePublicRequest } from "@/lib/publicRequest";
import { publicRequestAllowed } from "@/lib/publicThrottle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
}

function hashIp(value: string) {
  return crypto.createHash("sha256").update(`${process.env.AUTH_SECRET || "public"}:${value}`).digest("hex").slice(0, 24);
}

async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store" });
  const data = await response.json().catch(() => ({})) as { success?: boolean };
  return Boolean(data.success);
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const gate = publicRequestAllowed(hashIp(ip));
    if (!gate.allowed) {
      return NextResponse.json({ ok: false, error: `Too many requests. Try again in ${gate.retryAfter} seconds.` }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (String(body.companyWebsite || "").trim()) return NextResponse.json({ ok: true });
    const startedAt = Number(body.startedAt || 0);
    if (!startedAt || Date.now() - startedAt < 2500) return NextResponse.json({ ok: false, error: "Please wait a moment and try again." }, { status: 400 });
    if (!(await verifyTurnstile(String(body.turnstileToken || ""), ip))) return NextResponse.json({ ok: false, error: "Spam verification failed. Please try again." }, { status: 400 });

    const result = await savePublicRequest({
      requestType: body.requestType === "estimate" ? "estimate" : "contact",
      name: String(body.name || ""),
      company: String(body.company || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      website: String(body.website || ""),
      message: String(body.message || ""),
      estimate: body.estimate && typeof body.estimate === "object" ? body.estimate as any : undefined,
      sourcePath: String(body.sourcePath || "/"),
    });
    return NextResponse.json({ ok: true, requestId: result.leadId, estimate: result.estimate, notificationSent: result.notificationSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request could not be saved.";
    const status = /valid|enter|please|required/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
