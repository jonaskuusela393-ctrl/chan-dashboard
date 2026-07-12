import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { googleAuthorizationUrl } from "@/lib/gmailApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectUri(req: NextRequest) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.APP_BASE_URL || req.nextUrl.origin}/api/email/google/callback`;
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    return NextResponse.redirect(googleAuthorizationUrl(redirectUri(req), req.nextUrl.searchParams.get("returnTo") || undefined));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gmail connection failed" }, { status: authStatus(error) });
  }
}
