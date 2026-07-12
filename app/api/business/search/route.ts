import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanText, type BusinessLead } from "@/lib/localStore";
import { runBusinessAction } from "@/lib/businessSuite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GooglePlace = {
  id?: string;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
};

type SearchResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: { message?: string };
};

const QUERY_VARIANTS: Record<string, string[]> = {
  painter: ["painter", "painting contractor", "house painter", "maalari", "maalausliike"],
  renovation: ["renovation company", "home renovation", "remontti", "remonttiliike"],
  cleaner: ["cleaning service", "home cleaner", "siivouspalvelu", "siivousyritys"],
  barber: ["barber", "barbershop", "parturi", "parturi-kampaamo"],
  mechanic: ["car repair", "auto mechanic", "autokorjaamo", "autohuolto"],
  "car detailing": ["car detailing", "car wash detailing", "auton detailing", "autopesula"],
  electrician: ["electrician", "electrical contractor", "sähköasentaja", "sähköurakoitsija"],
  plumber: ["plumber", "plumbing contractor", "putkimies", "LVI yritys"],
  "moving company": ["moving company", "movers", "muuttofirma", "muuttopalvelu"],
  roofer: ["roofing company", "roofer", "kattoremontti", "kattofirma"],
  landscaper: ["landscaper", "landscaping company", "viherrakentaminen", "pihapalvelu"],
  restaurant: ["restaurant", "ravintola"],
  cafe: ["cafe", "coffee shop", "kahvila"],
  photographer: ["photographer", "valokuvaaja"],
  massage: ["massage therapist", "massage", "hieronta", "hieroja"],
};

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function category(place: GooglePlace) {
  const label = place.primaryTypeDisplayName?.text || place.primaryType;
  const first = label || (place.types || []).find((type) => !["point_of_interest", "establishment"].includes(type));
  return cleanText((first || "business").replace(/_/g, " "), 80);
}

function score(place: GooglePlace) {
  let value = 20;
  if (!place.websiteUri) value += 34;
  if (place.nationalPhoneNumber || place.internationalPhoneNumber) value += 14;
  if (typeof place.rating === "number" && place.rating > 0 && place.rating < 4.3) value += 12;
  if (typeof place.userRatingCount === "number" && place.userRatingCount >= 5) value += 8;
  if ((place.types || []).some((type) => ["restaurant", "cafe", "bar", "beauty_salon", "hair_care", "car_repair", "painter", "plumber", "electrician", "moving_company", "roofing_contractor", "general_contractor", "store"].includes(type))) value += 8;
  if (place.websiteUri) value += 4;
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") value -= 35;
  return Math.max(0, Math.min(value, 100));
}

function normalize(place: GooglePlace, matchedQuery = ""): BusinessLead {
  const id = cleanText(place.id || `${place.displayName?.text || "place"}-${place.formattedAddress || "unknown"}`, 180);
  return {
    id,
    name: cleanText(place.displayName?.text || "Unnamed business", 180),
    category: category(place),
    address: cleanText(place.formattedAddress || "Service-area business (no public street address)", 260),
    phone: cleanText(place.internationalPhoneNumber || place.nationalPhoneNumber || "", 80),
    email: "",
    contactFormUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    tiktokUrl: "",
    whatsappUrl: "",
    messengerUrl: "",
    contactStatus: place.websiteUri ? "website" : (place.internationalPhoneNumber || place.nationalPhoneNumber ? "phone" : "unknown"),
    siteQuality: place.websiteUri ? "unchecked" : "no_site",
    siteNotes: matchedQuery ? `Found with search: ${matchedQuery}` : "",
    lastScannedAt: "",
    website: cleanText(place.websiteUri || "", 500),
    mapsUrl: cleanText(place.googleMapsUri || (place.id ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}` : ""), 600),
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    lat: Number(place.location?.latitude || 0),
    lng: Number(place.location?.longitude || 0),
    score: score(place),
    status: "new",
    notes: place.businessStatus && place.businessStatus !== "OPERATIONAL" ? `Google status: ${place.businessStatus}` : "",
    offerPrice: "1,490€",
    packageName: "Complete Business Website",
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
  const nextLat = lat + (Math.sin(i * 1.8) * 0.07);
  const nextLng = lng + (Math.cos(i * 1.3) * 0.13);
  return {
    id: `demo-${keyword}-${i}`,
    name: `${names[i % names.length]} ${i + 1}`,
    category: cats[i % cats.length],
    address: `${location || "Local area"} · demo street ${i + 1}`,
    phone: `+358 40 ${String(1000000 + i * 731).slice(0, 7)}`,
    email: noWebsite ? "" : `info@example-${i + 1}.local`,
    contactFormUrl: noWebsite ? "" : `https://example-${i + 1}.local/contact`,
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    tiktokUrl: "",
    whatsappUrl: "",
    messengerUrl: "",
    contactStatus: noWebsite ? "phone" : "email",
    siteQuality: noWebsite ? "no_site" : (i % 2 === 0 ? "weak" : "unchecked"),
    siteNotes: noWebsite ? "No website found in demo." : "Demo scan data: example email/contact form.",
    lastScannedAt: noWebsite ? "" : new Date().toISOString(),
    website: noWebsite ? "" : `https://example-${i + 1}.local`,
    mapsUrl: "",
    rating: i % 4 === 0 ? 3.9 : 4.4,
    userRatingCount: 8 + i * 7,
    lat: nextLat,
    lng: nextLng,
    score: noWebsite ? 82 - (i % 5) * 3 : 48 + (i % 4) * 6,
    status: "new",
    notes: "Demo lead shown because GOOGLE_MAPS_API_KEY is missing or demo mode is enabled.",
    offerPrice: "1,490€",
    packageName: "Complete Business Website",
    nextFollowUp: "",
    lastContacted: "",
    source: "demo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function unique(values: string[], max: number) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    const value = cleanText(raw, 120);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
    if (output.length >= max) break;
  }
  return output;
}

function queryVariants(query: string, maxVariants: number) {
  const explicit = query.split(/[\n,;|]+/).map((part) => part.trim()).filter(Boolean);
  if (explicit.length > 1) return unique(explicit, maxVariants);
  const key = query.trim().toLowerCase();
  const variants = QUERY_VARIANTS[key] || [query];
  return unique([query, ...variants], maxVariants);
}

function restrictionRectangle(lat: number, lng: number, radius: number) {
  const latDelta = radius / 111_320;
  const cos = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const lngDelta = radius / (111_320 * cos);
  return {
    low: { latitude: Math.max(-90, lat - latDelta), longitude: Math.max(-180, lng - lngDelta) },
    high: { latitude: Math.min(90, lat + latDelta), longitude: Math.min(180, lng + lngDelta) },
  };
}

function geographicGrid(lat: number, lng: number, radius: number, size: number) {
  const n = Math.max(1, Math.min(Math.trunc(size), 4));
  if (n === 1 || !Number.isFinite(lat) || !Number.isFinite(lng)) return [{ lat, lng, radius, label: "center" }];
  const span = radius * 0.78;
  const cellRadius = Math.max(700, Math.min(50000, (radius / n) * 1.55));
  const cos = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
  const points: Array<{ lat: number; lng: number; radius: number; label: string }> = [];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const northMeters = n === 1 ? 0 : -span + (2 * span * y) / (n - 1);
      const eastMeters = n === 1 ? 0 : -span + (2 * span * x) / (n - 1);
      points.push({
        lat: Math.max(-89, Math.min(89, lat + northMeters / 111_320)),
        lng: Math.max(-179.999, Math.min(179.999, lng + eastMeters / (111_320 * cos))),
        radius: cellRadius,
        label: `${y + 1}/${x + 1}`,
      });
    }
  }
  return points;
}

async function googleTextSearch({ key, textQuery, lat, lng, radius, restrict, pageToken }: {
  key: string;
  textQuery: string;
  lat: number;
  lng: number;
  radius: number;
  restrict: boolean;
  pageToken?: string;
}) {
  const body: Record<string, unknown> = {
    textQuery,
    pageSize: 20,
    languageCode: "fi",
    regionCode: "FI",
    includePureServiceAreaBusinesses: true,
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    if (restrict) body.locationRestriction = { rectangle: restrictionRectangle(lat, lng, radius) };
    else body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius } };
  }
  if (pageToken) body.pageToken = pageToken;

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.types,places.primaryType,places.primaryTypeDisplayName,places.businessStatus,nextPageToken",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as SearchResponse;
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || `Google Places returned ${response.status}`), { status: response.status });
  return data;
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const q = cleanText(req.nextUrl.searchParams.get("q") || "restaurant", 120);
    const location = cleanText(req.nextUrl.searchParams.get("location") || "Lohja Finland", 160);
    const lat = Number(req.nextUrl.searchParams.get("lat") || "60.25");
    const lng = Number(req.nextUrl.searchParams.get("lng") || "24.07");
    const radius = Math.max(500, Math.min(Number(req.nextUrl.searchParams.get("radius") || 15000), 50000));
    const demo = req.nextUrl.searchParams.get("demo") === "1";
    const deep = req.nextUrl.searchParams.get("deep") === "1";
    const restrict = req.nextUrl.searchParams.get("restrict") !== "0";
    const requestedPages = Number(req.nextUrl.searchParams.get("pages") || (deep ? 3 : 1));
    const requestedVariants = Number(req.nextUrl.searchParams.get("variants") || (deep ? 5 : 2));
    const requestedGrid = Number(req.nextUrl.searchParams.get("grid") || (deep ? 2 : 1));
    const pagesPerQuery = Math.max(1, Math.min(requestedPages, 3));
    const variants = queryVariants(q, Math.max(1, Math.min(requestedVariants, 6)));
    const grid = Math.max(1, Math.min(Math.trunc(requestedGrid), 4));
    const searchPoints = geographicGrid(lat, lng, radius, grid);
    const requestBudget = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("budget") || 90), 120));
    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "";

    if (!key || demo) {
      const leads = Array.from({ length: 24 }, (_, i) => demoLead(i, q || "business", location, Number.isFinite(lat) ? lat : 60.25, Number.isFinite(lng) ? lng : 24.07));
      return NextResponse.json({ ok: true, demo: true, query: q, queries: variants, location, leads, count: leads.length, apiRequests: 0, grid, warning: "Set GOOGLE_MAPS_API_KEY to use live Google Places data." });
    }

    const merged = new Map<string, BusinessLead>();
    const errors: string[] = [];
    let apiRequests = 0;
    outer: for (const point of searchPoints) {
      for (const variant of variants) {
        let pageToken = "";
        const textQuery = `${variant} in ${location}`;
        for (let page = 0; page < pagesPerQuery; page += 1) {
          if (apiRequests >= requestBudget) break outer;
          try {
            const data = await googleTextSearch({ key, textQuery, lat: point.lat, lng: point.lng, radius: point.radius, restrict, pageToken: pageToken || undefined });
            apiRequests += 1;
            for (const place of Array.isArray(data.places) ? data.places : []) {
              if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;
              const lead = normalize(place, variant);
              const old = merged.get(lead.id);
              const matchNote = `grid ${point.label}, ${variant}`;
              if (!old || lead.score > old.score) merged.set(lead.id, old ? { ...old, ...lead, siteNotes: `${old.siteNotes}; also matched ${matchNote}` } : { ...lead, siteNotes: `${lead.siteNotes}; ${matchNote}` });
            }
            pageToken = cleanText(data.nextPageToken || "", 2000);
            if (!pageToken) break;
          } catch (error: any) {
            errors.push(`${variant} @ ${point.label}: ${error?.message || "search failed"}`);
            break;
          }
        }
      }
    }

    const leads = Array.from(merged.values()).sort((a, b) => b.score - a.score);
    if (!leads.length && errors.length) return jsonError(errors.join(" | "), 502);
    await runBusinessAction("search.save", {
      query: q,
      location,
      bounds: { lat, lng, radius, grid, restrict },
      status: apiRequests >= requestBudget ? "budget_reached" : errors.length ? "partial" : "complete",
      foundCount: leads.length,
      scannedCount: 0,
      apiRequests,
      cursor: { pagesPerQuery, variants, gridPoints: searchPoints.length, requestBudget },
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      demo: false,
      query: q,
      queries: variants,
      location,
      leads,
      count: leads.length,
      apiRequests,
      pagesPerQuery,
      grid,
      gridPoints: searchPoints.length,
      requestBudget,
      budgetReached: apiRequests >= requestBudget,
      restrict,
      partialErrors: errors,
    });
  } catch (error: any) {
    return jsonError(error?.message || "Business search failed", error?.status || authStatus(error));
  }
}
