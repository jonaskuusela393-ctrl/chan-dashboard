import { NextRequest, NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE, verifyLogin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "");
    const password = String(body.password || "");
    const user = verifyLogin(username, password);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Wrong username or password, or auth env vars are missing." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
    res.cookies.set(SESSION_COOKIE, createSessionValue(user.username, user.role), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.min(Number(process.env.SESSION_DAYS || 30), 365)) * 86400,
    });
    return res;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Login failed" }, { status: 500 });
  }
}
