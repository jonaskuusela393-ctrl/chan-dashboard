import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { listGmailThreads } from "@/lib/gmailApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const threads = await listGmailThreads(req.nextUrl.searchParams.get("q") || "in:inbox", Number(req.nextUrl.searchParams.get("max") || 20));
    return NextResponse.json({ ok: true, threads });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail load failed" }, { status: authStatus(error) });
  }
}
