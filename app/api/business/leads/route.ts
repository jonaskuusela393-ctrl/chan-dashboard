import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { deleteLead, listLeads, patchLead, upsertLead, type BusinessLead } from "@/lib/localStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const leads = await listLeads();
    return NextResponse.json({ ok: true, leads, count: leads.length });
  } catch (error: any) {
    return jsonError(error?.message || "Lead load failed", authStatus(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Partial<BusinessLead>;
    if (!body.id || !body.name) return jsonError("missing lead id or name", 400);
    const lead = await upsertLead({
      id: String(body.id),
      name: String(body.name || ""),
      category: String(body.category || "business"),
      address: String(body.address || ""),
      phone: String(body.phone || ""),
      email: String(body.email || ""),
      contactFormUrl: String(body.contactFormUrl || ""),
      facebookUrl: String(body.facebookUrl || ""),
      instagramUrl: String(body.instagramUrl || ""),
      contactStatus: String(body.contactStatus || "unknown"),
      siteQuality: String(body.siteQuality || "unknown"),
      siteNotes: String(body.siteNotes || ""),
      lastScannedAt: String(body.lastScannedAt || ""),
      website: String(body.website || ""),
      mapsUrl: String(body.mapsUrl || ""),
      rating: typeof body.rating === "number" ? body.rating : null,
      userRatingCount: typeof body.userRatingCount === "number" ? body.userRatingCount : null,
      lat: Number(body.lat || 0),
      lng: Number(body.lng || 0),
      score: Number(body.score || 0),
      status: body.status || "saved",
      notes: String(body.notes || ""),
      offerPrice: String(body.offerPrice || "300€"),
      packageName: String(body.packageName || "Starter Website"),
      nextFollowUp: String(body.nextFollowUp || ""),
      lastContacted: String(body.lastContacted || ""),
      source: String(body.source || "manual"),
    });
    return NextResponse.json({ ok: true, lead });
  } catch (error: any) {
    return jsonError(error?.message || "Lead save failed", authStatus(error));
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) return jsonError("missing lead id", 400);
    const lead = await patchLead(id, body);
    return NextResponse.json({ ok: true, lead });
  } catch (error: any) {
    return jsonError(error?.message || "Lead update failed", authStatus(error));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAdmin(req);
    const id = String(req.nextUrl.searchParams.get("id") || "");
    if (!id) return jsonError("missing lead id", 400);
    const deleted = await deleteLead(id);
    return NextResponse.json({ ok: true, deleted });
  } catch (error: any) {
    return jsonError(error?.message || "Lead delete failed", authStatus(error));
  }
}
