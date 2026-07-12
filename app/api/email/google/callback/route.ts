import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { exchangeGoogleCode, verifyGoogleState } from "@/lib/gmailApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (session?.role !== "admin") return NextResponse.redirect(new URL("/login", req.url));
  try {
    const error = req.nextUrl.searchParams.get("error");
    if (error) throw new Error(`Google authorization failed: ${error}`);
    const code = req.nextUrl.searchParams.get("code") || "";
    const state = req.nextUrl.searchParams.get("state") || "";
    if (!code || !state) throw new Error("Google callback is missing code or state");
    const returnTo = verifyGoogleState(state);
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.APP_BASE_URL || req.nextUrl.origin}/api/email/google/callback`;
    await exchangeGoogleCode(code, redirectUri);
    const target = new URL(returnTo, req.nextUrl.origin);
    target.searchParams.set("gmail", "connected");
    return NextResponse.redirect(target);
  } catch (error) {
    const target = new URL("/business", req.nextUrl.origin);
    target.searchParams.set("section", "inbox");
    target.searchParams.set("gmailError", error instanceof Error ? error.message : "Google callback failed");
    return NextResponse.redirect(target);
  }
}
