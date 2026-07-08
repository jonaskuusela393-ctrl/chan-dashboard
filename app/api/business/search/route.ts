import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanText, type BusinessLead } from "@/lib/localStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GooglePlace = {
  id?: string;
  types?: string[];
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
};

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function category(types?: string[]) {
  const first = (types || []).find((type) => !["point_of_interest", "establishment"].includes(type));
  return cleanText((first || "business").replace(/_/g, " "), 80);
}

function score(place: GooglePlace) {
  let value = 20;
  if (!place.websiteUri) value += 34;
  if (place.nationalPhoneNumber || place.internationalPhoneNumber) value += 14;
  if (typeof place.rating === "number" && place.rating > 0 && place.rating < 4.3) value += 12;
  if (typeof place.userRatingCount === "number" && place.userRatingCount >= 5) value += 8;
  if ((place.types || []).some((type) => ["restaurant", "cafe", "bar", "beauty_salon", "hair_care", "car_repair", "painter", "plumber", "electrician", "moving_company", "store"].includes(type))) value += 8;
  if (place.websiteUri) value += 4;
  return Math.max(0, Math.min(value, 100));
}

function normalize(place: GooglePlace): BusinessLead {
  const id = cleanText(place.id || `${place.displayName?.text || "place"}-${place.formattedAddress || "unknown"}`, 180);
  return {
    id,
    name: cleanText(place.displayName?.text || "Unnamed business", 180),
    category: category(place.types),
    address: cleanText(place.formattedAddress || "", 260),
    phone: cleanText(place.internationalPhoneNumber || place.nationalPhoneNumber || "", 80),
    email: "",
    website: cleanText(place.websiteUri || "", 260),
    mapsUrl: cleanText(place.googleMapsUri || (place.id ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}` : ""), 320),
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    lat: Number(place.location?.latitude || 0),
    lng: Number(place.location?.longitude || 0),
    score: score(place),
    status: "new",
    notes: "",
    offerPrice: "300€",
    packageName: "Starter Website",
    nextFollowUp: "",
    lastContacted: "",
    source: "google-places",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function demoLead(i: number, keyword: string, location: string, lat: number, lng: number): BusinessLead {
  const names = ["Northline Café", "Kivi Auto Repair", "Quiet Pine Barber", "Harbor Tattoo", "Lakeview Painter", "Old Road Restaurant", "Raccoon Works", "Metsä Bike Service"];
  const cats = ["cafe", "car repair", "hair care", "tattoo studio", "painter", "restaurant", "web target", "repair shop"];
  const noWebsite = i % 3 !== 1;
  const nextLat = lat + (Math.sin(i * 1.8) * 0.23);
  const nextLng = lng + (Math.cos(i * 1.3) * 0.42);
  return {
    id: `demo-${keyword}-${i}`,
    name: `${names[i % names.length]} ${i + 1}`,
    category: cats[i % cats.length],
    address: `${location || "Local area"} · demo street ${i + 1}`,
    phone: `+358 40 ${String(1000000 + i * 731).slice(0, 7)}`,
    email: "",
    website: noWebsite ? "" : `https://example-${i + 1}.local`,
    mapsUrl: "",
    rating: i % 4 === 0 ? 3.9 : 4.4,
    userRatingCount: 8 + i * 7,
    lat: nextLat,
    lng: nextLng,
    score: noWebsite ? 82 - (i % 5) * 3 : 48 + (i % 4) * 6,
    status: "new",
    notes: "Demo lead shown because GOOGLE_MAPS_API_KEY is missing or demo mode is enabled.",
    offerPrice: "300€",
    packageName: "Starter Website",
    nextFollowUp: "",
    lastContacted: "",
    source: "demo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const q = cleanText(req.nextUrl.searchParams.get("q") || "restaurant", 120);
    const location = cleanText(req.nextUrl.searchParams.get("location") || "Lohja Finland", 160);
    const lat = Number(req.nextUrl.searchParams.get("lat") || "60.25");
    const lng = Number(req.nextUrl.searchParams.get("lng") || "24.07");
    const radius = Math.max(1000, Math.min(Number(req.nextUrl.searchParams.get("radius") || 15000), 50000));
    const demo = req.nextUrl.searchParams.get("demo") === "1";
    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "";

    if (!key || demo) {
      const leads = Array.from({ length: 16 }, (_, i) => demoLead(i, q || "business", location, Number.isFinite(lat) ? lat : 60.25, Number.isFinite(lng) ? lng : 24.07));
      return NextResponse.json({ ok: true, demo: true, query: q, location, leads, count: leads.length, warning: "Set GOOGLE_MAPS_API_KEY to use live Google Places data." });
    }

    const body: Record<string, unknown> = {
      textQuery: `${q} in ${location}`,
      pageSize: 20,
      languageCode: "en",
    };

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.locationBias = {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      };
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.types,places.businessStatus",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return jsonError(data?.error?.message || `Google Places returned ${response.status}`, response.status);
    const leads = (Array.isArray(data.places) ? data.places : []).map(normalize).filter((lead: BusinessLead) => lead.name);

    return NextResponse.json({ ok: true, demo: false, query: q, location, leads, count: leads.length });
  } catch (error: any) {
    return jsonError(error?.message || "Business search failed", authStatus(error));
  }
}
