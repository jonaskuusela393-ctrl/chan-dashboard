"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BusinessMap from "./BusinessMap";

type LeadStatus =
  | "new"
  | "saved"
  | "contacted"
  | "followup"
  | "interested"
  | "won"
  | "rejected";
type BusinessTab =
  | "radar"
  | "audit"
  | "offer"
  | "pitch"
  | "demo"
  | "crm"
  | "templates"
  | "content"
  | "money";
type LeadFilter =
  "opportunity" | "no_site" | "upgrade_site" | "has_contact" | "all";

type BusinessLead = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  contactFormUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  whatsappUrl: string;
  messengerUrl: string;
  contactStatus: string;
  siteQuality: string;
  siteNotes: string;
  lastScannedAt: string;
  website: string;
  mapsUrl: string;
  rating: number | null;
  userRatingCount: number | null;
  lat: number;
  lng: number;
  score: number;
  status: LeadStatus;
  notes: string;
  offerPrice: string;
  packageName: string;
  nextFollowUp: string;
  lastContacted: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type WebsiteCheck = {
  ok?: boolean;
  url?: string;
  status?: number;
  title?: string;
  hasViewport?: boolean;
  hasContact?: boolean;
  hasModern?: boolean;
  hasMetaDescription?: boolean;
  hasH1?: boolean;
  hasHttps?: boolean;
  oldMarkup?: boolean;
  weak?: boolean;
  issues?: string[];
  responseMs?: number;
  bytes?: number;
  error?: string;
};

type ContactScan = {
  ok?: boolean;
  error?: string;
  finalUrl?: string;
  title?: string;
  emails?: string[];
  contactForms?: string[];
  contactFormUrl?: string;
  phones?: string[];
  phoneLinks?: string[];
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
  whatsappUrl?: string;
  messengerUrl?: string;
  contactStatus?: string;
  siteQuality?: string;
  siteNotes?: string;
  upgradeScore?: number;
  scannedAt?: string;
  renderedFallback?: boolean;
  pagesScanned?: Array<{
    url: string;
    status: number;
    title: string;
    bytes: number;
    responseMs?: number;
    hasViewport: boolean;
    hasMetaDescription?: boolean;
    hasH1?: boolean;
    hasContactWords: boolean;
    hasForm: boolean;
    hasOldMarkup: boolean;
  }>;
};

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function safeLead(value: unknown): BusinessLead | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<BusinessLead> & {
    id?: unknown;
    name?: unknown;
  };
  const id = text(input.id).trim();
  const name = text(input.name).trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    category: text(input.category) || "business",
    address: text(input.address),
    phone: text(input.phone),
    email: text(input.email),
    contactFormUrl: text(input.contactFormUrl),
    facebookUrl: text(input.facebookUrl),
    instagramUrl: text(input.instagramUrl),
    linkedinUrl: text(input.linkedinUrl),
    tiktokUrl: text(input.tiktokUrl),
    whatsappUrl: text(input.whatsappUrl),
    messengerUrl: text(input.messengerUrl),
    contactStatus: text(input.contactStatus) || "unknown",
    siteQuality:
      text(input.siteQuality) ||
      (text(input.website) ? "unchecked" : "no_site"),
    siteNotes: text(input.siteNotes),
    lastScannedAt: text(input.lastScannedAt),
    website: text(input.website),
    mapsUrl: text(input.mapsUrl),
    rating:
      typeof input.rating === "number" && Number.isFinite(input.rating)
        ? input.rating
        : null,
    userRatingCount:
      typeof input.userRatingCount === "number" &&
      Number.isFinite(input.userRatingCount)
        ? input.userRatingCount
        : null,
    lat:
      typeof input.lat === "number" && Number.isFinite(input.lat)
        ? input.lat
        : 0,
    lng:
      typeof input.lng === "number" && Number.isFinite(input.lng)
        ? input.lng
        : 0,
    score:
      typeof input.score === "number" && Number.isFinite(input.score)
        ? input.score
        : 0,
    status: [
      "new",
      "saved",
      "contacted",
      "followup",
      "interested",
      "won",
      "rejected",
    ].includes(input.status as LeadStatus)
      ? (input.status as LeadStatus)
      : "new",
    notes: text(input.notes),
    offerPrice: text(input.offerPrice) || "1,490€",
    packageName: text(input.packageName) || "Complete Business Website",
    nextFollowUp: text(input.nextFollowUp),
    lastContacted: text(input.lastContacted),
    source: text(input.source) || "unknown",
    createdAt: text(input.createdAt),
    updatedAt: text(input.updatedAt),
  };
}

function safeLeads(value: unknown): BusinessLead[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(safeLead)
    .filter((lead): lead is BusinessLead => Boolean(lead));
}

const STATUSES: LeadStatus[] = [
  "new",
  "saved",
  "contacted",
  "followup",
  "interested",
  "won",
  "rejected",
];
const TABS: Array<{ key: BusinessTab; label: string }> = [
  { key: "radar", label: "Lead search" },
  { key: "audit", label: "Quick audit" },
  { key: "offer", label: "Offer builder" },
  { key: "pitch", label: "Outreach" },
  { key: "demo", label: "Site preview" },
  { key: "crm", label: "Saved leads" },
  { key: "templates", label: "Templates" },
  { key: "content", label: "Content" },
  { key: "money", label: "Summary" },
];

const NICHE_PRESETS = [
  "painter",
  "renovation",
  "cleaner",
  "barber",
  "mechanic",
  "car detailing",
  "restaurant",
  "cafe",
  "tattoo studio",
  "dog groomer",
  "photographer",
  "massage",
  "electrician",
  "plumber",
  "moving company",
  "personal trainer",
];

const CITY_PRESETS = [
  "Lohja Finland",
  "Helsinki Finland",
  "Espoo Finland",
  "Vantaa Finland",
  "Turku Finland",
  "Tampere Finland",
  "Lahti Finland",
  "Oulu Finland",
];

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Lohja Finland": { lat: 60.2486, lng: 24.0653 },
  "Helsinki Finland": { lat: 60.1699, lng: 24.9384 },
  "Espoo Finland": { lat: 60.2055, lng: 24.6559 },
  "Vantaa Finland": { lat: 60.2934, lng: 25.0378 },
  "Turku Finland": { lat: 60.4518, lng: 22.2666 },
  "Tampere Finland": { lat: 61.4978, lng: 23.7610 },
  "Lahti Finland": { lat: 60.9827, lng: 25.6615 },
  "Oulu Finland": { lat: 65.0121, lng: 25.4651 },
};

const PACKAGES = [
  {
    name: "Complete Business Website",
    price: "250€",
    text: "One-page mobile site, services, photos, contact buttons, Google Maps link.",
  },
  {
    name: "Website + Google Cleanup",
    price: "400€",
    text: "Starter website plus Google Business text, review request message, clearer service descriptions.",
  },
  {
    name: "Local Growth Pack",
    price: "650€",
    text: "Website, Google text, simple SEO pages, FAQ, review system, and first month of updates.",
  },
  {
    name: "Monthly Care",
    price: "50€/month",
    text: "Small updates, text/photo changes, backups, uptime check, and minor fixes.",
  },
];

function readJson(response: Response) {
  return response.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, any>;
    } catch {
      return { error: text };
    }
  });
}

function err(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function num(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(1)
    : "?";
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function moneyToNumber(value: string) {
  const clean = value.replace(/[^0-9.,]/g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function websiteLabel(lead: BusinessLead) {
  if (!lead.website) return "NO WEBSITE";
  try {
    return new URL(lead.website).hostname.replace(/^www\./, "");
  } catch {
    return lead.website;
  }
}

function leadContact(lead: BusinessLead) {
  if (lead.email) return lead.email;
  if (lead.contactFormUrl) return "contact form";
  if (lead.phone) return lead.phone;
  if (lead.whatsappUrl) return "WhatsApp";
  if (lead.facebookUrl || lead.instagramUrl || lead.linkedinUrl || lead.messengerUrl) return "social contact";
  return "no contact saved";
}

function hasAnyContact(lead: BusinessLead) {
  return Boolean(lead.email || lead.contactFormUrl || lead.phone || lead.whatsappUrl || lead.facebookUrl || lead.instagramUrl || lead.linkedinUrl || lead.messengerUrl);
}

function siteLabel(lead: BusinessLead) {
  if (!lead.website) return "no site";
  if (lead.siteQuality === "weak") return "weak site";
  if (lead.siteQuality === "needs_review") return "review site";
  if (lead.siteQuality === "ok") return "site ok";
  return "site unchecked";
}

function contactBadge(lead: BusinessLead) {
  if (lead.email) return "email";
  if (lead.contactFormUrl) return "form";
  if (lead.phone) return "phone";
  if (lead.whatsappUrl) return "whatsapp";
  if (lead.facebookUrl || lead.instagramUrl || lead.linkedinUrl || lead.messengerUrl) return "social";
  return "no contact";
}

function shortLeadLine(lead: BusinessLead) {
  return `${lead.category} · ${siteLabel(lead)} · ${contactBadge(lead)} · score ${lead.score}`;
}

function leadHasUpgradePotential(lead: BusinessLead | null | undefined) {
  if (!lead) return false;
  return (
    Boolean(lead.website) &&
    (lead.siteQuality === "weak" ||
      lead.siteQuality === "needs_review" ||
      lead.score >= 45)
  );
}

function auditItems(lead: BusinessLead | null, check: WebsiteCheck | null) {
  const name = lead?.name || "Selected business";
  const items = [
    {
      label: "No proper website found",
      bad: Boolean(lead && !lead.website),
      fix: "Offer a clean one-page website with photos, services, and quote buttons.",
    },
    {
      label: "No saved email/contact form",
      bad: Boolean(lead && !lead.email && !lead.contactFormUrl),
      fix: "Run the email/form finder or use the business contact form first.",
    },
    {
      label: "Existing site could use upgrading",
      bad: leadHasUpgradePotential(lead),
      fix: "Pitch a cleaner mobile page, better service text, and easier quote path.",
    },
    {
      label: "Weak mobile/contact signals",
      bad: Boolean(
        check?.weak ||
        (check && !check.hasContact) ||
        lead?.siteQuality === "weak",
      ),
      fix: "Make call/message buttons obvious above the fold.",
    },
    {
      label: "Low or risky rating",
      bad: Boolean(lead?.rating && lead.rating < 4.3),
      fix: "Offer review-request text and a better customer flow.",
    },
    {
      label: "Enough reviews to be worth targeting",
      bad: Boolean(lead?.userRatingCount && lead.userRatingCount >= 5),
      fix: "They have real customers, so a better site can actually matter.",
    },
  ];
  const score = items.filter((x) => x.bad).length * 20;
  return { name, score: Math.min(score, 100), items };
}

function pitchText(
  lead: BusinessLead | null,
  price: string,
  packageName: string,
  tone: string,
) {
  const name = lead?.name || "your business";
  const category = lead?.category || "local business";
  const hook = lead?.website
    ? "I checked your current website and I think it could be made clearer, faster, and easier to use on mobile."
    : `I noticed I could not find a proper website for ${name}, so this might actually be useful.`;
  const opener =
    tone === "direct"
      ? `Hi ${name},`
      : `Hi ${name},\n\nHope your week is going well.`;
  return `${opener}\n\n${hook}\n\nI build simple websites for small ${category} businesses: mobile-friendly, clean, fast, with contact buttons, Google Maps, services, photos, and no confusing tech stuff.\n\nThe package I would suggest is ${packageName} for ${price}. I can also make a quick mockup first so you can see the idea before deciding anything.\n\nWould you want me to send a small example for ${name}?\n\nBest,\nJonas`;
}

function finnishPitchText(
  lead: BusinessLead | null,
  price: string,
  packageName: string,
) {
  const name = lead?.name || "yrityksellenne";
  const hook = lead?.website
    ? "Katsoin nykyistä sivustoa nopeasti ja siitä voisi ehkä tehdä selkeämmän ja helpomman käyttää puhelimella."
    : `Huomasin, että en löytänyt selkeää omaa nettisivua yritykselle ${name}.`;
  return `Hei ${name},\n\n${hook}\n\nTeen pienille paikallisille yrityksille yksinkertaisia nettisivuja: mobiiliystävällinen ulkoasu, palvelut, kuvat, yhteydenottopainikkeet ja Google Maps -linkki ilman turhaa teknistä säätöä.\n\nSuosittelisin pakettia ${packageName}, hinta ${price}. Voin myös tehdä pienen esimerkkiluonnoksen ensin, niin näette idean ennen päätöstä.\n\nHaluaisitteko nähdä nopean esimerkin?\n\nTerveisin,\nJonas`;
}

function contentPack(lead: BusinessLead | null) {
  const name = lead?.name || "Your Business";
  const category = lead?.category || "local service";
  const city = lead?.address?.split("·")[0] || "your area";
  return {
    hero: `${name} — reliable ${category} in ${city}. Clear service, easy contact, and work done properly from start to finish.`,
    about: `${name} helps local customers with ${category} work without making things complicated. The site should show real photos, clear services, and a simple way to request a quote.`,
    services: `Services\n- Main ${category} work\n- Small jobs and repairs\n- Clear quote request\n- Local customer service\n- Before/after photos when possible`,
    faq: `FAQ\nQ: How do I request a quote?\nA: Use the contact form or call button and describe the job.\n\nQ: Where do you work?\nA: Mainly local nearby areas.\n\nQ: Can I send photos?\nA: Yes, photos help estimate the job faster.`,
    google: `${name} is a local ${category} business serving customers around ${city}. Contact us for clear service, easy communication, and practical help with your next job.`,
    review: `Hi, thanks for choosing ${name}. If you were happy with the work, a short Google review would really help our small business. Thank you!`,
  };
}

function demoHtml(lead: BusinessLead | null, price: string) {
  const name = lead?.name || "Example Local Business";
  const category = lead?.category || "local service";
  const city = lead?.address || "local area";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name}</title>
  <style>
    body{margin:0;background:#050505;color:#f2f2f2;font-family:Arial,sans-serif;line-height:1.5}
    header,section{max-width:980px;margin:auto;padding:42px 18px}
    nav{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #333;padding:14px 18px;position:sticky;top:0;background:#050505}
    a{color:white}.btn{display:inline-block;border:1px solid white;border-radius:999px;padding:12px 18px;text-decoration:none;margin:5px 5px 5px 0}
    .hero{min-height:55vh;display:grid;align-content:center}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.card{border:1px solid #333;border-radius:18px;padding:18px;background:#111}
    .muted{color:#aaa}.photo{height:160px;border-radius:16px;border:1px solid #333;background:linear-gradient(135deg,#222,#070707)}
  </style>
</head>
<body>
  <nav><strong>${name}</strong><a class="btn" href="#contact">Request quote</a></nav>
  <header class="hero">
    <p class="muted">${category} · ${city}</p>
    <h1>Reliable ${category} with clear contact and simple service.</h1>
    <p>Mobile-friendly example page made to help customers understand the service and contact fast.</p>
    <p><a class="btn" href="tel:${lead?.phone || ""}">Call now</a><a class="btn" href="#contact">Send message</a></p>
  </header>
  <section><h2>Services</h2><div class="grid"><div class="card">Main work</div><div class="card">Small jobs</div><div class="card">Quotes</div></div></section>
  <section><h2>Work photos</h2><div class="grid"><div class="photo"></div><div class="photo"></div><div class="photo"></div></div></section>
  <section id="contact"><h2>Contact</h2><p>Example package price for building this: ${price}.</p><p>${lead?.phone || "Phone here"} · ${lead?.email || "email@example.com"}</p><p>${lead?.email ? `<a class="btn" href="mailto:${lead.email}?subject=Quote request for ${name}">Email us</a>` : ""}${lead?.phone ? `<a class="btn" href="tel:${lead.phone.replace(/[^+\d]/g, "")}">Call us</a>` : ""}</p></section>
</body>
</html>`;
}

export default function LeadFinderClient({ username }: { username: string }) {
  const [tab, setTab] = useState<BusinessTab>("radar");
  const [query, setQuery] = useState("painter");
  const [location, setLocation] = useState("Lohja Finland");
  const [lat, setLat] = useState("60.25");
  const [lng, setLng] = useState("24.07");
  const [radius, setRadius] = useState("15000");
  const [deepSearch, setDeepSearch] = useState(true);
  const [searchPages, setSearchPages] = useState("3");
  const [searchVariants, setSearchVariants] = useState("5");
  const [searchGrid, setSearchGrid] = useState("2");
  const [restrictArea, setRestrictArea] = useState(true);
  const [persistBulkScans, setPersistBulkScans] = useState(false);
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("opportunity");
  const [minScore, setMinScore] = useState("0");
  const [results, setResults] = useState<BusinessLead[]>([]);
  const [saved, setSaved] = useState<BusinessLead[]>([]);
  const [selected, setSelected] = useState<BusinessLead | null>(null);
  const [websiteCheck, setWebsiteCheck] = useState<WebsiteCheck | null>(null);
  const [contactScan, setContactScan] = useState<ContactScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("client system ready");
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("painter");
  const [manualCity, setManualCity] = useState("Lohja Finland");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [price, setPrice] = useState("1,490€");
  const [packageName, setPackageName] = useState("Complete Business Website");
  const [tone, setTone] = useState("friendly");
  const [contentKind, setContentKind] =
    useState<keyof ReturnType<typeof contentPack>>("hero");

  const current = selected;
  const filteredResults = useMemo(() => {
    const score = Number(minScore) || 0;
    return results
      .filter((lead) => {
        if (leadFilter === "no_site") return !lead.website;
        if (leadFilter === "upgrade_site") return leadHasUpgradePotential(lead);
        if (leadFilter === "has_contact")
          return hasAnyContact(lead);
        if (leadFilter === "opportunity")
          return (
            !lead.website || leadHasUpgradePotential(lead) || lead.score >= 55
          );
        return true;
      })
      .filter((lead) => lead.score >= score)
      .sort((a, b) => b.score - a.score);
  }, [results, leadFilter, minScore]);

  const allMapLeads = useMemo(() => {
    const map = new Map<string, BusinessLead>();
    const source = results.length ? filteredResults : saved;
    source.forEach((lead) => {
      if (lead?.id) map.set(lead.id, lead);
    });
    if (selected?.id) map.set(selected.id, selected);
    return Array.from(map.values()).filter((lead) => Number.isFinite(lead.lat) && Number.isFinite(lead.lng) && (lead.lat !== 0 || lead.lng !== 0));
  }, [results.length, filteredResults, saved, selected]);

  const stats = useMemo(() => {
    const savedCount = saved.length;
    const contacted = saved.filter((lead) =>
      ["contacted", "followup", "interested", "won"].includes(lead.status),
    ).length;
    const won = saved.filter((lead) => lead.status === "won");
    const interested = saved.filter(
      (lead) => lead.status === "interested",
    ).length;
    const followups = saved.filter(
      (lead) => lead.status === "followup" || lead.nextFollowUp,
    ).length;
    const wonRevenue = won.reduce(
      (sum, lead) => sum + moneyToNumber(lead.offerPrice || price),
      0,
    );
    const pipeline = saved
      .filter((lead) => ["followup", "interested"].includes(lead.status))
      .reduce((sum, lead) => sum + moneyToNumber(lead.offerPrice || price), 0);
    return {
      savedCount,
      contacted,
      won: won.length,
      interested,
      followups,
      wonRevenue,
      pipeline,
    };
  }, [saved, price]);

  function mergeLeadLocal(next: BusinessLead) {
    setSelected(next);
    setResults((old) =>
      old.map((lead) => (lead.id === next.id ? { ...lead, ...next } : lead)),
    );
    setSaved((old) =>
      old.map((lead) => (lead.id === next.id ? { ...lead, ...next } : lead)),
    );
  }

  function isSavedLead(lead: BusinessLead) {
    return saved.some((item) => item.id === lead.id);
  }

  async function commitLead(lead: BusinessLead, patch: Partial<BusinessLead>) {
    const next = { ...lead, ...patch } as BusinessLead;
    mergeLeadLocal(next);
    if (isSavedLead(lead)) await updateLead(lead, patch);
    else await saveLead(next, (patch.status as LeadStatus) || "saved");
  }

  async function loadSaved() {
    const response = await fetch("/api/business/leads", { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(String(data.error || "lead load failed"));
    const leads = safeLeads(data.leads);
    setSaved(leads);
    return leads;
  }

  function applyCityPreset(city: string) {
    setLocation(city);
    const point = CITY_COORDS[city];
    if (point) {
      setLat(point.lat.toFixed(6));
      setLng(point.lng.toFixed(6));
    }
  }

  async function locateArea() {
    setLoading(true);
    setStatus(`locating ${location}...`);
    try {
      const response = await fetch(`/api/business/geocode?address=${encodeURIComponent(location)}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "location lookup failed"));
      setLat(Number(data.lat).toFixed(6));
      setLng(Number(data.lng).toFixed(6));
      if (data.address) setLocation(String(data.address));
      setStatus(`area located: ${Number(data.lat).toFixed(5)}, ${Number(data.lng).toFixed(5)}`);
    } catch (error) {
      setStatus(err(error, "location lookup failed; search can still use the written area name"));
    } finally {
      setLoading(false);
    }
  }

  async function search(demo = false) {
    setLoading(true);
    setWebsiteCheck(null);
    setContactScan(null);
    setStatus(demo ? "loading demo radar..." : deepSearch ? "running broad paginated Google Places search..." : "searching Google Places...");
    try {
      const params = new URLSearchParams({
        q: query,
        location,
        lat,
        lng,
        radius,
        deep: deepSearch ? "1" : "0",
        pages: searchPages,
        variants: searchVariants,
        grid: searchGrid,
        restrict: restrictArea ? "1" : "0",
      });
      if (demo) params.set("demo", "1");
      const response = await fetch(`/api/business/search?${params.toString()}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "business search failed"));
      const leads = safeLeads(data.leads);
      setResults(leads);
      setSelected(leads[0] || null);
      const details = data.demo
        ? "demo mode until GOOGLE_MAPS_API_KEY is set"
        : `${Number(data.apiRequests || 0)} Places requests · ${Array.isArray(data.queries) ? data.queries.length : 1} variants · ${Number(data.gridPoints || 1)} map cells${data.budgetReached ? " · request budget reached" : ""}`;
      setStatus(`${leads.length} unique targets loaded · ${details}${Array.isArray(data.partialErrors) && data.partialErrors.length ? ` · ${data.partialErrors.length} partial errors` : ""}`);
    } catch (error) {
      setStatus(err(error, "business search failed"));
    } finally {
      setLoading(false);
    }
  }

  async function saveLead(
    lead: BusinessLead,
    nextStatus: LeadStatus = "saved",
  ) {
    try {
      const response = await fetch("/api/business/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lead,
          status: nextStatus,
          offerPrice: lead.offerPrice || price,
          packageName: lead.packageName || packageName,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "save failed"));
      const next = safeLead(data.lead);
      if (!next) throw new Error("saved lead response was invalid");
      setSelected(next);
      setStatus(`saved lead: ${lead.name}`);
      await loadSaved();
    } catch (error) {
      setStatus(err(error, "save failed"));
    }
  }

  async function updateLead(lead: BusinessLead, patch: Partial<BusinessLead>) {
    try {
      const response = await fetch("/api/business/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...patch }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "update failed"));
      const next = safeLead(data.lead);
      if (!next) throw new Error("updated lead response was invalid");
      mergeLeadLocal(next);
      await loadSaved();
      setStatus(`updated lead: ${lead.name}`);
    } catch (error) {
      setStatus(err(error, "update failed"));
    }
  }

  async function removeLead(lead: BusinessLead) {
    try {
      const response = await fetch(
        `/api/business/leads?id=${encodeURIComponent(lead.id)}`,
        { method: "DELETE" },
      );
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "delete failed"));
      await loadSaved();
      setStatus(`removed saved lead: ${lead.name}`);
      if (selected?.id === lead.id) setSelected(null);
    } catch (error) {
      setStatus(err(error, "delete failed"));
    }
  }

  async function checkWebsite(lead: BusinessLead) {
    if (!lead.website) {
      setWebsiteCheck({
        error: "No website found. This is usually a stronger web-design lead.",
      });
      return;
    }
    setStatus("checking website...");
    setWebsiteCheck(null);
    try {
      const response = await fetch(
        `/api/business/website-check?url=${encodeURIComponent(lead.website)}`,
        { cache: "no-store" },
      );
      const data = (await readJson(response)) as WebsiteCheck;
      setWebsiteCheck(data);
      setStatus(
        data.weak
          ? "website looks weak / worth checking manually"
          : "website responded and has basic signals",
      );
    } catch (error) {
      setWebsiteCheck({ error: err(error, "website check failed") });
    }
  }

  function patchFromContactScan(lead: BusinessLead, data: ContactScan): Partial<BusinessLead> {
    return {
      email: data.emails?.[0] || lead.email || "",
      phone: lead.phone || data.phones?.[0] || "",
      contactFormUrl: data.contactFormUrl || data.contactForms?.[0] || lead.contactFormUrl || "",
      facebookUrl: data.facebookUrl || lead.facebookUrl || "",
      instagramUrl: data.instagramUrl || lead.instagramUrl || "",
      linkedinUrl: data.linkedinUrl || lead.linkedinUrl || "",
      tiktokUrl: data.tiktokUrl || lead.tiktokUrl || "",
      whatsappUrl: data.whatsappUrl || lead.whatsappUrl || "",
      messengerUrl: data.messengerUrl || lead.messengerUrl || "",
      contactStatus: data.contactStatus || lead.contactStatus || "website",
      siteQuality: data.siteQuality || lead.siteQuality || "unchecked",
      siteNotes: data.siteNotes || lead.siteNotes || "",
      lastScannedAt: data.scannedAt || new Date().toISOString(),
      score: Math.max(lead.score || 0, Number(data.upgradeScore || 0)),
    };
  }

  async function importScanContacts(lead: BusinessLead, data: ContactScan) {
    const contacts: Array<Record<string, unknown>> = [];
    for (const value of data.emails || []) contacts.push({ kind: "email", value, label: "website email", sourceUrl: data.finalUrl || lead.website, confidence: 88, primary: value === data.emails?.[0] });
    for (const value of data.phones || []) contacts.push({ kind: "phone", value, label: "website phone", sourceUrl: data.finalUrl || lead.website, confidence: 82, primary: value === data.phones?.[0] });
    for (const value of data.contactForms || []) contacts.push({ kind: "form", value, label: "contact form/page", sourceUrl: value, confidence: 76, primary: value === data.contactForms?.[0] });
    const socialPairs = [["facebook", data.facebookUrl], ["instagram", data.instagramUrl], ["linkedin", data.linkedinUrl], ["tiktok", data.tiktokUrl], ["whatsapp", data.whatsappUrl], ["messenger", data.messengerUrl]] as const;
    for (const [kind, value] of socialPairs) if (value) contacts.push({ kind, value, label: kind, sourceUrl: value, confidence: 68 });
    if (!contacts.length) return;
    await fetch("/api/business/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "contacts.import", leadId: lead.id, contacts }) });
  }

  async function persistLeadQuiet(lead: BusinessLead) {
    const response = await fetch("/api/business/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, status: lead.status === "new" ? "saved" : lead.status }),
    });
    if (!response.ok) {
      const data = await readJson(response);
      throw new Error(String(data.error || `could not save ${lead.name}`));
    }
  }

  async function scanContact(lead: BusinessLead, persist = isSavedLead(lead)) {
    if (!lead.website) {
      const next = {
        ...lead,
        siteQuality: "no_site",
        contactStatus: lead.phone ? "phone" : (lead.facebookUrl || lead.instagramUrl ? "social" : "unknown"),
        siteNotes: "No website was returned by Google Places. Use phone, Maps, or a social profile when available.",
      };
      mergeLeadLocal(next);
      setContactScan({ ok: false, error: "No website exists to crawl. The saved phone, Google Maps page, and social profiles are the available contact paths." });
      setStatus("no website to scan");
      return;
    }

    setStatus(`deep contact scan: ${lead.name}...`);
    setContactScan(null);
    try {
      const response = await fetch(`/api/business/contact-scan?url=${encodeURIComponent(lead.website)}`, { cache: "no-store" });
      const data = (await readJson(response)) as ContactScan;
      setContactScan(data);
      if (!response.ok || !data.ok) throw new Error(String(data.error || "contact scan failed"));
      const patch = patchFromContactScan(lead, data);
      const next = { ...lead, ...patch } as BusinessLead;
      mergeLeadLocal(next);
      setStatus(`${lead.name}: ${patch.email ? "email found" : patch.contactFormUrl ? "contact page/form found" : patch.whatsappUrl ? "WhatsApp found" : patch.phone ? "phone found" : patch.contactStatus || "scan complete"} · ${data.pagesScanned?.length || 0} pages checked${data.renderedFallback ? " · browser-rendered fallback used" : ""}`);
      if (persist) {
        await persistLeadQuiet({ ...next, status: next.status === "new" ? "saved" : next.status });
        await importScanContacts(next, data);
        await loadSaved();
      }
    } catch (error) {
      setContactScan((old) => old || { ok: false, error: err(error, "contact scan failed") });
      setStatus(err(error, "contact scan failed"));
    }
  }

  async function scanVisibleWebsites() {
    const targets = filteredResults.filter((lead) => lead.website);
    if (!targets.length) {
      setStatus("no visible website leads to scan");
      return;
    }
    setLoading(true);
    let completed = 0;
    let failed = 0;
    let contactsFound = 0;
    const updates = new Map<string, BusinessLead>();
    try {
      for (let offset = 0; offset < targets.length; offset += 4) {
        const batch = targets.slice(offset, offset + 4);
        setStatus(`deep scanning ${completed}/${targets.length} websites...`);
        const response = await fetch("/api/business/contact-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch.map((lead) => ({ id: lead.id, url: lead.website })) }),
        });
        const payload = await readJson(response);
        if (!response.ok) throw new Error(String(payload.error || "bulk scan failed"));
        const scanResults = Array.isArray(payload.results) ? payload.results as Array<ContactScan & { id?: string }> : [];
        const batchUpdates: BusinessLead[] = [];
        for (const scan of scanResults) {
          const lead = batch.find((item) => item.id === scan.id);
          if (!lead) continue;
          completed += 1;
          if (!scan.ok) {
            failed += 1;
            continue;
          }
          const next = { ...lead, ...patchFromContactScan(lead, scan) } as BusinessLead;
          updates.set(next.id, next);
          batchUpdates.push(next);
          if (hasAnyContact(next)) contactsFound += 1;
          const shouldPersistContacts = persistBulkScans || saved.some((item) => item.id === next.id);
          if (shouldPersistContacts) await importScanContacts(next, scan);
        }
        setResults((old) => old.map((lead) => updates.get(lead.id) || lead));
        setSaved((old) => old.map((lead) => updates.get(lead.id) || lead));
        setSelected((old) => old ? updates.get(old.id) || old : old);
        if (persistBulkScans) {
          await Promise.all(batchUpdates.map((lead) => persistLeadQuiet({ ...lead, status: lead.status === "new" ? "saved" : lead.status })));
        } else {
          const savedIds = new Set(saved.map((lead) => lead.id));
          await Promise.all(batchUpdates.filter((lead) => savedIds.has(lead.id)).map(persistLeadQuiet));
        }
      }
      if (persistBulkScans || saved.length) await loadSaved();
      setStatus(`scan complete: ${completed}/${targets.length} websites · ${contactsFound} with contact paths · ${failed} failed`);
    } catch (error) {
      setStatus(`${err(error, "bulk scan failed")} · completed ${completed}/${targets.length}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveManualLead() {
    if (!manualName.trim()) {
      setStatus("manual lead needs a business name");
      return;
    }
    const lead: BusinessLead = {
      id: `manual-${manualName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: manualName,
      category: manualCategory,
      address: manualCity,
      phone: manualPhone,
      email: manualEmail,
      contactFormUrl: "",
      facebookUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
      tiktokUrl: "",
      whatsappUrl: "",
      messengerUrl: "",
      contactStatus: manualEmail
        ? "email"
        : manualPhone
          ? "phone"
          : manualWebsite
            ? "website"
            : "unknown",
      siteQuality: manualWebsite ? "unchecked" : "no_site",
      siteNotes: "",
      lastScannedAt: "",
      website: manualWebsite,
      mapsUrl: "",
      rating: null,
      userRatingCount: null,
      lat: Number(lat) || 60.25,
      lng: Number(lng) || 24.07,
      score: manualWebsite ? 50 : 85,
      status: "saved",
      notes: "Manual lead.",
      offerPrice: price,
      packageName,
      nextFollowUp: todayPlus(3),
      lastContacted: "",
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveLead(lead, "saved");
    setManualName("");
  }

  async function exportClientSite() {
    const lead = current;
    if (!lead) {
      setStatus("select a business before exporting a site");
      return;
    }
    setLoading(true);
    setStatus(`building deployable site for ${lead.name}...`);
    try {
      const response = await fetch("/api/business/site-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, name: lead.name, category: lead.category, city: lead.address, phone: lead.phone, email: lead.email, mapsUrl: lead.mapsUrl }),
      });
      if (!response.ok) {
        const data = await readJson(response);
        throw new Error(String(data.error || "site export failed"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || `${lead.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "business-site"}.zip`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus(`exported ${filename} · connect its dashboard inquiry variables and optionally Resend in the client Vercel project`);
    } catch (error) {
      setStatus(err(error, "site export failed"));
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, label = "copied") {
    void navigator.clipboard.writeText(text).then(
      () => setStatus(label),
      () => setStatus("clipboard failed"),
    );
  }

  useEffect(() => {
    void loadSaved().catch((error) =>
      setStatus(err(error, "saved leads load failed")),
    );
  }, []);

  const audit = auditItems(current, websiteCheck);
  const content = contentPack(current);
  const pitch = pitchText(current, price, packageName, tone);
  const pitchFi = finnishPitchText(current, price, packageName);
  const demo = demoHtml(current, price);

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">ADMIN ONLY</p>
            <h1 className="terminal-title">Lead discovery workspace</h1>
            <p className="muted">
              Signed in as {username}. User 2 cannot see this page or its APIs.
              This is for finding local businesses, creating offers, pitching,
              follow-ups, and tracking money.
            </p>
          </div>
          <div className="row">
            <Link className="buttonlike" href="/email">
              email console
            </Link>
            <button onClick={() => void loadSaved()} disabled={loading}>
              sync saved
            </button>
          </div>
        </div>
        <div className="module-tabs">
          {TABS.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "active-btn" : ""}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="muted small">Status: {status}</p>
      </section>

      {tab === "radar" && (
        <>
          <div className="business-layout">
            <section className="panel stack lead-finder-panel">
              <div className="spread">
                <div>
                  <h2>Lead finder</h2>
                  <p className="muted small">
                    Broad mode searches multiple wording variants and every available Places page.
                  </p>
                </div>
                <span className={deepSearch ? "badge" : "badge warn"}>
                  {deepSearch ? "BROAD" : "QUICK"}
                </span>
              </div>
              <label className="stack small">
                Niche / keyword
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="painter, cleaner, electrician..."
                />
              </label>
              <div className="chip-row compact-chips">
                {NICHE_PRESETS.slice(0, 14).map((niche) => (
                  <button key={niche} onClick={() => setQuery(niche)}>
                    {niche}
                  </button>
                ))}
              </div>
              <label className="stack small">
                Area
                <div className="field-with-button">
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Lohja Finland"
                  />
                  <button onClick={() => void locateArea()} disabled={loading}>
                    locate
                  </button>
                </div>
              </label>
              <div className="chip-row compact-chips">
                {CITY_PRESETS.slice(0, 10).map((city) => (
                  <button key={city} onClick={() => applyCityPreset(city)}>
                    {city.replace(" Finland", "")}
                  </button>
                ))}
              </div>
              <details className="advanced-search" open>
                <summary>Search coverage and map area</summary>
                <div className="grid tight-grid advanced-search-grid">
                  <label className="stack small">
                    Latitude
                    <input value={lat} onChange={(event) => setLat(event.target.value)} />
                  </label>
                  <label className="stack small">
                    Longitude
                    <input value={lng} onChange={(event) => setLng(event.target.value)} />
                  </label>
                  <label className="stack small">
                    Radius meters
                    <input value={radius} onChange={(event) => setRadius(event.target.value)} />
                  </label>
                  <label className="stack small">
                    Places pages / query
                    <select value={searchPages} onChange={(event) => setSearchPages(event.target.value)}>
                      <option value="1">1 · fastest</option>
                      <option value="2">2</option>
                      <option value="3">3 · broadest</option>
                    </select>
                  </label>
                  <label className="stack small">
                    Search variants
                    <select value={searchVariants} onChange={(event) => setSearchVariants(event.target.value)}>
                      {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="stack small">
                    Geographic grid
                    <select value={searchGrid} onChange={(event) => setSearchGrid(event.target.value)}>
                      <option value="1">1 × 1 · center only</option>
                      <option value="2">2 × 2 · broad</option>
                      <option value="3">3 × 3 · thorough</option>
                      <option value="4">4 × 4 · maximum</option>
                    </select>
                  </label>
                  <label className="stack small">
                    Min score
                    <input value={minScore} onChange={(event) => setMinScore(event.target.value)} />
                  </label>
                </div>
                <label className="checkline">
                  <input type="checkbox" checked={deepSearch} onChange={(event) => setDeepSearch(event.target.checked)} />
                  Search multiple keyword variants and service-area businesses
                </label>
                <label className="checkline">
                  <input type="checkbox" checked={restrictArea} onChange={(event) => setRestrictArea(event.target.checked)} />
                  Keep results inside the selected radius instead of only biasing toward it
                </label>
                <label className="checkline">
                  <input type="checkbox" checked={persistBulkScans} onChange={(event) => setPersistBulkScans(event.target.checked)} />
                  Save every scanned result to Neon automatically
                </label>
              </details>
              <label className="stack small">
                Lead filter
                <select value={leadFilter} onChange={(event) => setLeadFilter(event.target.value as LeadFilter)}>
                  <option value="opportunity">best opportunities</option>
                  <option value="no_site">no website</option>
                  <option value="upgrade_site">has site but upgradeable</option>
                  <option value="has_contact">contact found</option>
                  <option value="all">all results</option>
                </select>
              </label>
              <div className="row wrap-actions">
                <button onClick={() => void search(false)} disabled={loading}>
                  {deepSearch ? "broad live search" : "quick live search"}
                </button>
                <button onClick={() => void search(true)} disabled={loading}>demo results</button>
                <button
                  onClick={() => void scanVisibleWebsites()}
                  disabled={loading || !filteredResults.some((lead) => lead.website)}
                >
                  scan all loaded sites ({filteredResults.filter((lead) => lead.website).length})
                </button>
              </div>
              <p className="muted small">
                Live search needs GOOGLE_MAPS_API_KEY. Estimated maximum is {Math.min(90, Number(searchPages) * Number(searchVariants) * Number(searchGrid) * Number(searchGrid))} Places requests before contact crawling; the server enforces a safety budget. Results are deduplicated.
              </p>
            </section>
            <BusinessMap
              leads={allMapLeads}
              selected={current}
              searchCenter={{ lat: Number(lat) || 60.25, lng: Number(lng) || 24.07 }}
              searchLabel={location}
              onSelect={(mapLead) => {
                const lead = allMapLeads.find((item) => item.id === mapLead.id);
                if (lead) setSelected(lead);
              }}
              onUseCenter={(point) => {
                setLat(point.lat.toFixed(6));
                setLng(point.lng.toFixed(6));
              }}
            />
          </div>

          <div className="business-layout bottom-layout">
            <section className="panel stack">
              <div className="spread">
                <h2>Targets</h2>
                <p className="muted small">
                  {filteredResults.length}/{results.length} visible
                </p>
              </div>
              <div className="lead-list stack">
                {filteredResults.length === 0 && (
                  <p className="muted">
                    No results yet. Press demo map or live search.
                  </p>
                )}
                {filteredResults.map((lead) => (
                  <button
                    className={`lead-row ${selected?.id === lead.id ? "active" : ""}`}
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                  >
                    <span>
                      <strong>{lead.name}</strong>
                      <span className="muted small">{shortLeadLine(lead)}</span>
                    </span>
                    <span
                      className={
                        !lead.website || lead.siteQuality === "weak"
                          ? "badge warn"
                          : "badge"
                      }
                    >
                      {siteLabel(lead)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel stack">
              <h2>Lead panel</h2>
              {!current ? (
                <p className="muted">Select a target.</p>
              ) : (
                <>
                  <div className="spread">
                    <div>
                      <p className="badge">SCORE {pct(current.score)}</p>
                      <h2>{current.name}</h2>
                      <p className="muted">
                        {current.category} · {current.address}
                      </p>
                    </div>
                    <span className={current.website ? "badge" : "badge warn"}>
                      {websiteLabel(current)}
                    </span>
                  </div>
                  <div className="grid tight-grid">
                    <p>
                      <span className="dim small">phone</span>
                      <br />
                      {current.phone || "none"}
                    </p>
                    <p>
                      <span className="dim small">email</span>
                      <br />
                      {current.email || "none"}
                    </p>
                    <p>
                      <span className="dim small">rating</span>
                      <br />
                      {num(current.rating)} ({current.userRatingCount ?? "?"})
                    </p>
                    <p>
                      <span className="dim small">offer</span>
                      <br />
                      {current.packageName || packageName} ·{" "}
                      {current.offerPrice || price}
                    </p>
                    <p>
                      <span className="dim small">contact status</span>
                      <br />
                      {contactBadge(current)}
                    </p>
                    <p>
                      <span className="dim small">site quality</span>
                      <br />
                      {siteLabel(current)}
                    </p>
                  </div>
                  <div className="row">
                    {current.mapsUrl && (
                      <a
                        className="buttonlike"
                        href={current.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        open maps
                      </a>
                    )}
                    {current.website && (
                      <a
                        className="buttonlike"
                        href={current.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        open site
                      </a>
                    )}
                    {current.contactFormUrl && (
                      <a
                        className="buttonlike"
                        href={current.contactFormUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        contact form
                      </a>
                    )}
                    {current.facebookUrl && (
                      <a
                        className="buttonlike"
                        href={current.facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        facebook
                      </a>
                    )}
                    {current.email && (
                      <a className="buttonlike" href={`mailto:${current.email}`}>email</a>
                    )}
                    {current.phone && (
                      <a className="buttonlike" href={`tel:${current.phone.replace(/[^+\d]/g, "")}`}>call</a>
                    )}
                    {current.instagramUrl && (
                      <a className="buttonlike" href={current.instagramUrl} target="_blank" rel="noreferrer">instagram</a>
                    )}
                    {current.linkedinUrl && (
                      <a className="buttonlike" href={current.linkedinUrl} target="_blank" rel="noreferrer">linkedin</a>
                    )}
                    {current.whatsappUrl && (
                      <a className="buttonlike" href={current.whatsappUrl} target="_blank" rel="noreferrer">whatsapp</a>
                    )}
                    {current.messengerUrl && (
                      <a className="buttonlike" href={current.messengerUrl} target="_blank" rel="noreferrer">messenger</a>
                    )}
                    {current.tiktokUrl && (
                      <a className="buttonlike" href={current.tiktokUrl} target="_blank" rel="noreferrer">tiktok</a>
                    )}
                    <button onClick={() => void saveLead(current, "saved")}>
                      save
                    </button>
                    <button
                      onClick={() => {
                        setTab("pitch");
                        copy(pitch, "pitch copied");
                      }}
                    >
                      copy pitch
                    </button>
                    <button onClick={() => void scanContact(current, false)}>
                      find email/form
                    </button>
                    <button onClick={() => void scanContact(current, true)}>
                      scan + save
                    </button>
                    <button onClick={() => void checkWebsite(current)}>
                      quick check
                    </button>
                  </div>
                  {(websiteCheck || contactScan) && (
                    <div className="scan-summary stack">
                      {websiteCheck && (
                        <div className="scan-card stack">
                          <div className="spread">
                            <strong>Website check</strong>
                            <span className={websiteCheck.error || websiteCheck.weak ? "badge warn" : "badge"}>
                              {websiteCheck.error ? "FAILED" : websiteCheck.weak ? "UPGRADE LEAD" : "BASIC CHECKS OK"}
                            </span>
                          </div>
                          {websiteCheck.error ? (
                            <p className="muted small">{websiteCheck.error}</p>
                          ) : (
                            <>
                              <p className="muted small">{websiteCheck.title || websiteCheck.url} · {websiteCheck.status} · {websiteCheck.responseMs ?? "?"} ms</p>
                              {!!websiteCheck.issues?.length && (
                                <div className="chip-row">{websiteCheck.issues.map((issue) => <span className="badge warn" key={issue}>{issue}</span>)}</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {contactScan && (
                        <div className="scan-card stack">
                          <div className="spread">
                            <strong>Deep contact scan</strong>
                            <span className={contactScan.ok ? "badge" : "badge warn"}>
                              {contactScan.ok ? `${contactScan.pagesScanned?.length || 0} PAGES` : "FAILED"}
                            </span>
                          </div>
                          {contactScan.error && <p className="muted small">{contactScan.error}</p>}
                          {!!contactScan.emails?.length && (
                            <div><span className="dim small">emails</span><div className="chip-row">{contactScan.emails.map((email) => <a className="buttonlike" href={`mailto:${email}`} key={email}>{email}</a>)}</div></div>
                          )}
                          {!!contactScan.contactForms?.length && (
                            <div><span className="dim small">forms / contact pages</span><div className="chip-row">{contactScan.contactForms.slice(0, 8).map((url) => <a className="buttonlike" href={url} target="_blank" rel="noreferrer" key={url}>open contact</a>)}</div></div>
                          )}
                          {!!contactScan.phones?.length && (
                            <div><span className="dim small">phones</span><div className="chip-row">{contactScan.phones.map((phone) => <a className="buttonlike" href={`tel:${phone.replace(/[^+\d]/g, "")}`} key={phone}>{phone}</a>)}</div></div>
                          )}
                          <p className="muted small">{contactScan.siteNotes || "No extra scan notes."}</p>
                        </div>
                      )}
                      <details>
                        <summary>raw scan details</summary>
                        <pre>{JSON.stringify({ websiteCheck, contactScan }, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                  {current.siteNotes && (
                    <p className="muted small">
                      site notes: {current.siteNotes}
                    </p>
                  )}
                  <div className="grid tight-grid">
                    <label className="stack small">
                      Email
                      <input
                        value={current.email || ""}
                        onChange={(event) =>
                          setSelected({ ...current, email: event.target.value })
                        }
                        onBlur={(event) =>
                          void commitLead(current, {
                            email: event.target.value,
                            contactStatus: event.target.value
                              ? "email"
                              : current.contactStatus,
                          })
                        }
                      />
                    </label>
                    <label className="stack small">
                      Contact form
                      <input
                        value={current.contactFormUrl || ""}
                        onChange={(event) =>
                          setSelected({
                            ...current,
                            contactFormUrl: event.target.value,
                          })
                        }
                        onBlur={(event) =>
                          void commitLead(current, {
                            contactFormUrl: event.target.value,
                            contactStatus: current.email
                              ? "email"
                              : event.target.value
                                ? "form"
                                : current.contactStatus,
                          })
                        }
                      />
                    </label>
                    <label className="stack small">
                      Phone
                      <input
                        value={current.phone || ""}
                        onChange={(event) =>
                          setSelected({ ...current, phone: event.target.value })
                        }
                        onBlur={(event) =>
                          void commitLead(current, {
                            phone: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="stack small">
                      Facebook
                      <input
                        value={current.facebookUrl || ""}
                        onChange={(event) => setSelected({ ...current, facebookUrl: event.target.value })}
                        onBlur={(event) => void commitLead(current, { facebookUrl: event.target.value })}
                      />
                    </label>
                    <label className="stack small">
                      Instagram
                      <input
                        value={current.instagramUrl || ""}
                        onChange={(event) => setSelected({ ...current, instagramUrl: event.target.value })}
                        onBlur={(event) => void commitLead(current, { instagramUrl: event.target.value })}
                      />
                    </label>
                    <label className="stack small">
                      LinkedIn
                      <input
                        value={current.linkedinUrl || ""}
                        onChange={(event) => setSelected({ ...current, linkedinUrl: event.target.value })}
                        onBlur={(event) => void commitLead(current, { linkedinUrl: event.target.value })}
                      />
                    </label>
                    <label className="stack small">
                      WhatsApp
                      <input
                        value={current.whatsappUrl || ""}
                        onChange={(event) => setSelected({ ...current, whatsappUrl: event.target.value })}
                        onBlur={(event) => void commitLead(current, { whatsappUrl: event.target.value })}
                      />
                    </label>
                    <label className="stack small">
                      Offer price
                      <input
                        value={current.offerPrice || price}
                        onChange={(event) =>
                          setSelected({
                            ...current,
                            offerPrice: event.target.value,
                          })
                        }
                        onBlur={(event) =>
                          void commitLead(current, {
                            offerPrice: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="stack small">
                      Follow-up date
                      <input
                        type="date"
                        value={current.nextFollowUp || ""}
                        onChange={(event) =>
                          setSelected({
                            ...current,
                            nextFollowUp: event.target.value,
                          })
                        }
                        onBlur={(event) =>
                          void commitLead(current, {
                            nextFollowUp: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="stack small">
                    Notes
                    <textarea
                      value={current.notes || ""}
                      onChange={(event) =>
                        setSelected({ ...current, notes: event.target.value })
                      }
                      onBlur={(event) =>
                        void commitLead(current, {
                          notes: event.target.value,
                          status:
                            current.status === "new" ? "saved" : current.status,
                        })
                      }
                      placeholder="what to offer, contact result, follow-up date..."
                    />
                  </label>
                  <div className="row">
                    {STATUSES.map((nextStatus) => (
                      <button
                        key={nextStatus}
                        className={
                          current.status === nextStatus ? "active-btn" : ""
                        }
                        onClick={() =>
                          void commitLead(current, {
                            status: nextStatus,
                            lastContacted:
                              nextStatus === "contacted"
                                ? new Date().toISOString()
                                : current.lastContacted,
                          })
                        }
                      >
                        {nextStatus}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}

      {tab === "audit" && (
        <section className="panel stack">
          <div className="spread">
            <div>
              <p className="badge">AUDIT SCORE {audit.score}%</p>
              <h2>Business audit: {audit.name}</h2>
            </div>
            {current?.website && (
              <button onClick={() => void checkWebsite(current)}>
                run website check
              </button>
            )}
          </div>
          <div className="grid">
            {audit.items.map((item) => (
              <div className="card stack" key={item.label}>
                <span className={item.bad ? "badge warn" : "badge"}>
                  {item.bad ? "opportunity" : "ok/manual"}
                </span>
                <strong>{item.label}</strong>
                <p className="muted small">{item.fix}</p>
              </div>
            ))}
          </div>
          <pre>{`Suggested angle:\n${current?.name || "This business"} can probably benefit from clearer mobile contact, service text, photos, Google profile text, and a simple quote path.`}</pre>
        </section>
      )}

      {tab === "offer" && (
        <section className="panel stack">
          <h2>Offer builder</h2>
          <div className="grid tight-grid">
            <label className="stack small">
              Default price
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            <label className="stack small">
              Package name
              <input
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
              />
            </label>
          </div>
          <div className="grid">
            {PACKAGES.map((pack) => (
              <div className="card stack" key={pack.name}>
                <p className="badge">{pack.price}</p>
                <h3>{pack.name}</h3>
                <p className="muted small">{pack.text}</p>
                <button
                  onClick={() => {
                    setPackageName(pack.name);
                    setPrice(pack.price);
                    if (current)
                      void commitLead(current, {
                        packageName: pack.name,
                        offerPrice: pack.price,
                      });
                  }}
                >
                  use package
                </button>
              </div>
            ))}
          </div>
          <pre>{`Current offer:\n${packageName} · ${price}\n\nSimple promise:\nI make your business easier to find, understand, and contact from phone.`}</pre>
        </section>
      )}

      {tab === "pitch" && (
        <section className="panel stack">
          <div className="spread">
            <div>
              <h2>Pitch generator</h2>
              <p className="muted small">
                English + Finnish. Copy and send manually or use Email module.
              </p>
            </div>
            <Link className="buttonlike" href="/email">
              open email module
            </Link>
          </div>
          <div className="grid tight-grid">
            <label className="stack small">
              Tone
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                <option value="friendly">friendly</option>
                <option value="direct">direct</option>
              </select>
            </label>
            <label className="stack small">
              Price
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
          </div>
          <div className="grid">
            <div className="card stack">
              <h3>English</h3>
              <textarea className="big-textarea" value={pitch} readOnly />
              <button
                onClick={() =>
                  copy(
                    `Subject: Quick website idea for ${current?.name || "your business"}\n\n${pitch}`,
                    "English pitch copied",
                  )
                }
              >
                copy English
              </button>
            </div>
            <div className="card stack">
              <h3>Finnish</h3>
              <textarea className="big-textarea" value={pitchFi} readOnly />
              <button
                onClick={() =>
                  copy(
                    `Aihe: Nopea nettisivuidea yritykselle ${current?.name || "teidän yrityksenne"}\n\n${pitchFi}`,
                    "Finnish pitch copied",
                  )
                }
              >
                copy Finnish
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "demo" && (
        <section className="panel stack">
          <div className="spread">
            <div>
              <h2>Client website generator</h2>
              <p className="muted small">
                Export a separate Vercel-ready Next.js site with a working server-side contact form.
              </p>
            </div>
            <div className="row">
              <button onClick={() => copy(demo, "static demo HTML copied")}>copy quick HTML</button>
              <button onClick={() => void exportClientSite()} disabled={loading || !current}>
                download client site ZIP
              </button>
            </div>
          </div>
          {!current && <p className="badge warn">Select a business in Lead Radar first.</p>}
          <div className="grid">
            <div className="card stack">
              <span className="badge">QUICK MOCKUP</span>
              <strong>Single HTML file</strong>
              <p className="muted small">Useful for a fast visual pitch. Contact buttons use the business phone/email when available.</p>
            </div>
            <div className="card stack">
              <span className="badge">DEPLOYABLE SITE</span>
              <strong>Next.js + Vercel contact API</strong>
              <p className="muted small">Set RESEND_API_KEY, CONTACT_TO_EMAIL, and CONTACT_FROM_EMAIL in the client project. Messages are delivered without exposing the recipient address in browser code.</p>
            </div>
          </div>
          <textarea className="big-textarea code-editor" value={demo} readOnly />
          <div className="card stack demo-preview">
            <h2>{current?.name || "Example Local Business"}</h2>
            <p className="muted">{current?.category || "local service"} · responsive landing page preview</p>
            <div className="row">
              {current?.phone ? <a className="buttonlike" href={`tel:${current.phone.replace(/[^+\d]/g, "")}`}>Call now</a> : <span className="buttonlike">Call now</span>}
              {current?.email ? <a className="buttonlike" href={`mailto:${current.email}`}>Email</a> : <span className="buttonlike">Request quote</span>}
            </div>
            <div className="grid"><div className="photo-box" /><div className="photo-box" /><div className="photo-box" /></div>
          </div>
        </section>
      )}

      {tab === "crm" && (
        <section className="panel stack">
          <div className="spread">
            <div>
              <h2>Mini CRM + manual leads</h2>
              <p className="muted small">
                {saved.length} saved leads. Status, notes, offers, and
                follow-ups are stored in Neon when DATABASE_URL is set.
              </p>
            </div>
            <button onClick={() => void loadSaved()}>refresh</button>
          </div>
          <div className="card stack">
            <h3>Add manual business</h3>
            <div className="grid tight-grid">
              <input
                placeholder="Business name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <input
                placeholder="Category"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
              />
              <input
                placeholder="City / address"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
              />
              <input
                placeholder="Phone"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
              />
              <input
                placeholder="Email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
              <input
                placeholder="Website"
                value={manualWebsite}
                onChange={(e) => setManualWebsite(e.target.value)}
              />
            </div>
            <button onClick={() => void saveManualLead()}>
              save manual lead
            </button>
          </div>
          <div className="grid">
            {saved.map((lead) => (
              <div className="card stack" key={lead.id}>
                <div className="spread">
                  <div>
                    <strong>{lead.name}</strong>
                    <p className="muted small">{shortLeadLine(lead)}</p>
                  </div>
                  <span className="badge">{lead.status}</span>
                </div>
                <p className="muted small">
                  follow-up: {lead.nextFollowUp || "none"} · offer:{" "}
                  {lead.packageName || "package"} {lead.offerPrice || price} ·{" "}
                  {siteLabel(lead)} · {contactBadge(lead)}
                </p>
                <div className="row">
                  <button
                    onClick={() => {
                      setSelected(lead);
                      setTab("radar");
                    }}
                  >
                    open
                  </button>
                  <button onClick={() => void scanContact(lead, true)}>
                    scan
                  </button>
                  <button
                    onClick={() =>
                      void updateLead(lead, {
                        status: "followup",
                        nextFollowUp: todayPlus(3),
                      })
                    }
                  >
                    follow up +3d
                  </button>
                  <button
                    onClick={() =>
                      copy(
                        pitchText(
                          lead,
                          lead.offerPrice || price,
                          lead.packageName || packageName,
                          tone,
                        ),
                        "pitch copied",
                      )
                    }
                  >
                    copy pitch
                  </button>
                  <button
                    className="danger"
                    onClick={() => void removeLead(lead)}
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "templates" && (
        <section className="panel stack">
          <h2>Template library</h2>
          <p className="muted">
            Same backend, different marketing angle. Pick one niche for outreach
            even though the service works for all.
          </p>
          <div className="grid">
            {NICHE_PRESETS.map((niche) => (
              <div className="card stack" key={niche}>
                <p className="badge">{niche}</p>
                <h3>{niche} website angle</h3>
                <p className="muted small">
                  Hero, services, gallery, quote button, Google text, review
                  request, and simple follow-up message.
                </p>
                <button
                  onClick={() => {
                    setQuery(niche);
                    setManualCategory(niche);
                    setPackageName("Complete Business Website");
                    setTab("radar");
                  }}
                >
                  use niche
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "content" && (
        <section className="panel stack">
          <h2>Text/content generator</h2>
          <label className="stack small">
            Text type
            <select
              value={contentKind}
              onChange={(event) =>
                setContentKind(event.target.value as keyof typeof content)
              }
            >
              <option value="hero">homepage hero</option>
              <option value="about">about section</option>
              <option value="services">services</option>
              <option value="faq">FAQ</option>
              <option value="google">Google Business description</option>
              <option value="review">review request</option>
            </select>
          </label>
          <textarea
            className="big-textarea"
            value={content[contentKind]}
            readOnly
          />
          <div className="row">
            <button
              onClick={() => copy(content[contentKind], "content copied")}
            >
              copy text
            </button>
            <button
              onClick={() =>
                copy(
                  Object.entries(content)
                    .map(([k, v]) => `${k.toUpperCase()}\n${v}`)
                    .join("\n\n---\n\n"),
                  "full content pack copied",
                )
              }
            >
              copy full pack
            </button>
          </div>
        </section>
      )}

      {tab === "money" && (
        <section className="panel stack">
          <h2>Money tracker</h2>
          <div className="grid">
            <div className="card">
              <p className="badge">leads</p>
              <h2>{stats.savedCount}</h2>
              <p className="muted small">saved targets</p>
            </div>
            <div className="card">
              <p className="badge">outreach</p>
              <h2>{stats.contacted}</h2>
              <p className="muted small">contacted/follow-up/interested/won</p>
            </div>
            <div className="card">
              <p className="badge">interested</p>
              <h2>{stats.interested}</h2>
              <p className="muted small">warm leads</p>
            </div>
            <div className="card">
              <p className="badge">won</p>
              <h2>{stats.won}</h2>
              <p className="muted small">closed clients</p>
            </div>
            <div className="card">
              <p className="badge">pipeline</p>
              <h2>{stats.pipeline}€</h2>
              <p className="muted small">possible follow-up/interested value</p>
            </div>
            <div className="card">
              <p className="badge">earned</p>
              <h2>{stats.wonRevenue}€</h2>
              <p className="muted small">won offer value</p>
            </div>
          </div>
          <pre>{`Simple target:\nContact 10 businesses/day.\nSend 3 demos/week.\nTry to close 1 small ${price} job first.\nThen add ${PACKAGES[3].price} care plans for recurring income.`}</pre>
        </section>
      )}
    </div>
  );
}
