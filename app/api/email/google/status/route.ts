import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { getGmailConnection } from "@/lib/businessSuite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const connection = await getGmailConnection();
    return NextResponse.json({ ok: true, connected: Boolean(connection), email: connection?.email || "", configured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail status failed" }, { status: authStatus(error) });
  }
}
