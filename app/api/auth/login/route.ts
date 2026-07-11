import { NextRequest, NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE, verifyLogin } from "@/lib/auth";
import { clearLoginFailures, loginAllowed, loginKey, recordLoginFailure } from "@/lib/loginThrottle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").slice(0, 120);
    const password = String(body.password || "").slice(0, 500);
    const key = loginKey(clientIp(req), username);
    const gate = loginAllowed(key);
    if (!gate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many failed attempts. Try again in ${gate.retryAfter} seconds.` },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
      );
    }

    const user = verifyLogin(username, password);
    if (!user) {
      const attempt = recordLoginFailure(key);
      const lockedSeconds = attempt.lockedUntil > Date.now() ? Math.ceil((attempt.lockedUntil - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { ok: false, error: lockedSeconds ? `Wrong username or password. Login is temporarily locked for ${lockedSeconds} seconds.` : "Wrong username or password, or auth env vars are missing." },
        { status: lockedSeconds ? 429 : 401, headers: lockedSeconds ? { "Retry-After": String(lockedSeconds) } : undefined },
      );
    }

    clearLoginFailures(key);
    const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
    res.cookies.set(SESSION_COOKIE, createSessionValue(user.username, user.role), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.min(Number(process.env.SESSION_DAYS || 14), 365)) * 86400,
    });
    return res;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Login failed" }, { status: 500 });
  }
}
