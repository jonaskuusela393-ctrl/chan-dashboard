import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runBusinessAction } from "@/lib/businessSuite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}
function clean(value: unknown, max: number) { return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.INQUIRY_WEBHOOK_SECRET || "";
    const received = req.headers.get("x-inquiry-secret") || "";
    if (!expected || !safeEqual(expected, received)) return NextResponse.json({ ok: false, error: "invalid webhook secret" }, { status: 403 });
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (clean(body.website, 100)) return NextResponse.json({ ok: true });
    const leadId = clean(body.leadId, 300);
    const name = clean(body.name, 200); const email = clean(body.email, 300); const phone = clean(body.phone, 100); const message = clean(body.message, 10000);
    if (!leadId || !name || !message || (!email && !phone)) return NextResponse.json({ ok: false, error: "leadId, name, message, and email or phone are required" }, { status: 400 });
    const result = await runBusinessAction("inquiry.add", { leadId, name, email, phone, message, sourceSite: clean(body.sourceSite || req.headers.get("origin") || "", 1000), status: "new" });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "inquiry webhook failed" }, { status: 500 });
  }
}
