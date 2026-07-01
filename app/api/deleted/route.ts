import { NextRequest, NextResponse } from "next/server";
import { addDeleted, hasDatabase, listDeleted } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 300) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}

export async function GET(req: NextRequest) {
  try {
    const scope = clean(req.nextUrl.searchParams.get("scope"), 80);
    if (!scope) return NextResponse.json({ error: "missing scope" }, { status: 400 });
    const rows = await listDeleted(scope);
    return NextResponse.json({ db: hasDatabase(), keys: rows.map((r) => r.item_key), rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "deleted list failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scope = clean(body.scope, 80);
    const key = clean(body.key, 500);
    const label = clean(body.label, 300);
    if (!scope || !key) return NextResponse.json({ error: "missing scope or key" }, { status: 400 });
    await addDeleted(scope, key, label);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "delete failed" }, { status: 500 });
  }
}
