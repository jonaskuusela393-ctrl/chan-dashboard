import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { clearGmailConnection, getGmailConnection } from "@/lib/businessSuite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const connection = await getGmailConnection();
    if (connection?.accessToken) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(connection.accessToken)}`, { method: "POST" }).catch(() => undefined);
    await clearGmailConnection();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail disconnect failed" }, { status: authStatus(error) });
  }
}
