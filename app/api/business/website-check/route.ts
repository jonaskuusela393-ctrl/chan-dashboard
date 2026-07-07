import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const input = String(req.nextUrl.searchParams.get("url") || "").trim();
    if (!input) return jsonError("missing url", 400);
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (!["http:", "https:"].includes(url.protocol)) return jsonError("only http/https allowed", 400);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "User-Agent": "private-terminal-dashboard-website-check/1.0" } });
      const html = (await response.text()).slice(0, 120000);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
      const hasContact = /(contact|yhteys|phone|tel:|mailto:)/i.test(html);
      const hasModern = /(next-data|react|vue|vite|astro|wp-content|shopify|squarespace|wix)/i.test(html);
      const weak = !hasViewport || !hasContact || html.length < 5000;
      return NextResponse.json({ ok: true, url: response.url, status: response.status, title, hasViewport, hasContact, hasModern, weak, bytes: html.length });
    } finally {
      clearTimeout(timer);
    }
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "website check timed out" : error?.message || "Website check failed", authStatus(error));
  }
}
