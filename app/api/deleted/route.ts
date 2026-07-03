import { NextRequest, NextResponse } from "next/server";
import { addDeleted, listDeleted } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req);
    const scope = clean(req.nextUrl.searchParams.get("scope"), 80).replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    if (!scope) return jsonError("missing scope", 400);
    const rows = await listDeleted(session.username, scope);
    return NextResponse.json({ ok: true, scope, keys: rows.map((r) => r.item_key), rows });
  } catch (error: any) {
    return jsonError(error?.message || "Could not load deleted items", error?.message === "Not logged in" ? 401 : 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const body = await req.json().catch(() => ({}));
    const scope = clean(body.scope, 80).replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    const key = clean(body.key || body.itemKey, 600);
    const label = clean(body.label || key, 300);
    if (!scope || !key) return jsonError("missing scope or key", 400);
    await addDeleted(session.username, scope, key, label);
    return NextResponse.json({ ok: true, scope, key });
  } catch (error: any) {
    return jsonError(error?.message || "Delete failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
