import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { getArtifactStreams } from "@/lib/twitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    return NextResponse.json({ ok: true, ...(await getArtifactStreams()), fetchedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Twitch request failed" }, { status: authStatus(error) });
  }
}
