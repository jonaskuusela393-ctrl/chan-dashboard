import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { deleteBusinessEntity, getBusinessWorkspace, runBusinessAction } from "@/lib/businessSuite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fail(error: unknown, status?: number) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error || "Business operation failed") }, { status: status || authStatus(error) });
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const workspace = await getBusinessWorkspace(req.nextUrl.searchParams.get("leadId") || "");
    return NextResponse.json({ ok: true, ...workspace });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || "");
    if (!action) return fail(new Error("action is required"), 400);
    const result = await runBusinessAction(action, body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAdmin(req);
    const entity = req.nextUrl.searchParams.get("entity") || "";
    const id = Number(req.nextUrl.searchParams.get("id") || 0);
    await deleteBusinessEntity(entity, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
