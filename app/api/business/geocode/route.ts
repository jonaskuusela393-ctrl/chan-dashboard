import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/localStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const address = cleanText(req.nextUrl.searchParams.get("address") || "", 200);
    if (!address) return jsonError("missing address", 400);
    const key = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "";
    if (!key) return jsonError("GOOGLE_MAPS_API_KEY is not configured", 503);

    const params = new URLSearchParams({ address, key, language: "fi", region: "fi" });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== "OK" || !data.results?.length) {
      return jsonError(data.error_message || data.status || "location not found", response.ok ? 404 : response.status);
    }
    const first = data.results[0];
    const point = first.geometry?.location;
    const viewport = first.geometry?.viewport;
    return NextResponse.json({
      ok: true,
      address: cleanText(first.formatted_address || address, 260),
      lat: Number(point?.lat),
      lng: Number(point?.lng),
      viewport: viewport ? {
        north: Number(viewport.northeast?.lat),
        east: Number(viewport.northeast?.lng),
        south: Number(viewport.southwest?.lat),
        west: Number(viewport.southwest?.lng),
      } : null,
      placeId: cleanText(first.place_id || "", 180),
    });
  } catch (error: any) {
    return jsonError(error?.message || "geocoding failed", authStatus(error));
  }
}
