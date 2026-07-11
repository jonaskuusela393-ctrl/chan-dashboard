import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    requireSession(req);
    const pathname = String(req.nextUrl.searchParams.get("pathname") || "");
    if (!pathname || !pathname.startsWith("chat/")) return NextResponse.json({ ok: false, error: "Missing or invalid pathname" }, { status: 400 });
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: req.headers.get("if-none-match") || undefined,
    });
    if (!result) return new NextResponse("Not found", { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
    }
    if (result.statusCode !== 200 || !result.stream) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Length": String(result.blob.size),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "File failed" }, { status: error?.message === "Not logged in" ? 401 : 500 });
  }
}
