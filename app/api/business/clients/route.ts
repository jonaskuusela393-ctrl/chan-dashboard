import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { addClientEvent, checkClientSite, listClientWorkspace, rotateClientSupportToken, saveClientSite, updateClientRequest } from "@/lib/clientSites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fail(error: unknown, status?: number) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: status || authStatus(error) });
}

export async function GET(req: NextRequest) {
  try { requireAdmin(req); return NextResponse.json({ ok: true, ...(await listClientWorkspace()) }); }
  catch (error) { return fail(error); }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "site.save") return NextResponse.json({ ok: true, result: await saveClientSite(body) });
    if (action === "site.check") return NextResponse.json({ ok: true, result: await checkClientSite(Number(body.id || 0)) });
    if (action === "site.rotate-token") return NextResponse.json({ ok: true, result: await rotateClientSupportToken(Number(body.id || 0)) });
    if (action === "request.status") return NextResponse.json({ ok: true, result: await updateClientRequest(Number(body.id || 0), body.status) });
    if (action === "event.add") return NextResponse.json({ ok: true, result: await addClientEvent(body) });
    return fail(new Error("Unknown client action"), 400);
  } catch (error) { return fail(error); }
}
