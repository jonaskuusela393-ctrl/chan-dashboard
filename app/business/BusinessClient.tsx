"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MAP_HEIGHT, MAP_WIDTH, WORLD_COAST_PATHS, WORLD_COUNTRY_PATHS, WORLD_LAND_PATHS, WORLD_MAP_COUNTS } from "./worldMapData";

type LeadStatus = "new" | "saved" | "contacted" | "followup" | "interested" | "won" | "rejected";
type BusinessTab = "radar" | "audit" | "offer" | "pitch" | "demo" | "crm" | "templates" | "content" | "money";
type LeadFilter = "opportunity" | "no_site" | "upgrade_site" | "has_contact" | "all";

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
  weak?: boolean;
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
  phoneLinks?: string[];
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  contactStatus?: string;
  siteQuality?: string;
  siteNotes?: string;
  upgradeScore?: number;
  scannedAt?: string;
  pagesScanned?: Array<{ url: string; status: number; title: string; bytes: number; hasViewport: boolean; hasContactWords: boolean; hasForm: boolean; hasOldMarkup: boolean }>;
};

const STATUSES: LeadStatus[] = ["new", "saved", "contacted", "followup", "interested", "won", "rejected"];
const TABS: Array<{ key: BusinessTab; label: string }> = [
  { key: "radar", label: "lead finder" },
  { key: "audit", label: "audit" },
  { key: "offer", label: "offers" },
  { key: "pitch", label: "pitch" },
  { key: "demo", label: "demo page" },
  { key: "crm", label: "crm" },
  { key: "templates", label: "templates" },
  { key: "content", label: "text gen" },
  { key: "money", label: "money" },
];

const NICHE_PRESETS = [
  "painter", "renovation", "cleaner", "barber", "mechanic", "car detailing", "restaurant", "cafe", "tattoo studio", "dog groomer", "photographer", "massage", "electrician", "plumber", "moving company", "personal trainer",
];

const CITY_PRESETS = ["Lohja Finland", "Helsinki Finland", "Espoo Finland", "Vantaa Finland", "Turku Finland", "Tampere Finland", "Lahti Finland", "Oulu Finland"];

const PACKAGES = [
  { name: "Starter Website", price: "250€", text: "One-page mobile site, services, photos, contact buttons, Google Maps link." },
  { name: "Website + Google Cleanup", price: "400€", text: "Starter website plus Google Business text, review request message, clearer service descriptions." },
  { name: "Local Growth Pack", price: "650€", text: "Website, Google text, simple SEO pages, FAQ, review system, and first month of updates." },
  { name: "Monthly Care", price: "50€/month", text: "Small updates, text/photo changes, backups, uptime check, and minor fixes." },
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
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "?";
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

function project(lng: number, lat: number) {
  const x = ((lng + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return { x: Math.max(0, Math.min(MAP_WIDTH, x)), y: Math.max(0, Math.min(MAP_HEIGHT, y)) };
}

type MapView = { x: number; y: number; w: number; h: number };

function clampMapView(view: MapView): MapView {
  const ratio = MAP_HEIGHT / MAP_WIDTH;
  const w = Math.max(65, Math.min(MAP_WIDTH, view.w));
  const h = Math.max(65 * ratio, Math.min(MAP_HEIGHT, w * ratio));
  return {
    x: Math.max(0, Math.min(MAP_WIDTH - w, view.x)),
    y: Math.max(0, Math.min(MAP_HEIGHT - h, view.y)),
    w,
    h,
  };
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
  return "no contact saved";
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
  return "no contact";
}

function shortLeadLine(lead: BusinessLead) {
  return `${lead.category} · ${siteLabel(lead)} · ${contactBadge(lead)} · score ${lead.score}`;
}

function leadHasUpgradePotential(lead: BusinessLead) {
  return Boolean(lead.website) && (lead.siteQuality === "weak" || lead.siteQuality === "needs_review" || lead.score >= 45);
}

function auditItems(lead: BusinessLead | null, check: WebsiteCheck | null) {
  const name = lead?.name || "Selected business";
  const items = [
    { label: "No proper website found", bad: Boolean(lead && !lead.website), fix: "Offer a clean one-page website with photos, services, and quote buttons." },
    { label: "No saved email/contact form", bad: Boolean(lead && !lead.email && !lead.contactFormUrl), fix: "Run the email/form finder or use the business contact form first." },
    { label: "Existing site could use upgrading", bad: Boolean(leadHasUpgradePotential(lead as BusinessLead)), fix: "Pitch a cleaner mobile page, better service text, and easier quote path." },
    { label: "Weak mobile/contact signals", bad: Boolean(check?.weak || (check && !check.hasContact) || lead?.siteQuality === "weak"), fix: "Make call/message buttons obvious above the fold." },
    { label: "Low or risky rating", bad: Boolean(lead?.rating && lead.rating < 4.3), fix: "Offer review-request text and a better customer flow." },
    { label: "Enough reviews to be worth targeting", bad: Boolean(lead?.userRatingCount && lead.userRatingCount >= 5), fix: "They have real customers, so a better site can actually matter." },
  ];
  const score = items.filter((x) => x.bad).length * 20;
  return { name, score: Math.min(score, 100), items };
}

function pitchText(lead: BusinessLead | null, price: string, packageName: string, tone: string) {
  const name = lead?.name || "your business";
  const category = lead?.category || "local business";
  const hook = lead?.website
    ? "I checked your current website and I think it could be made clearer, faster, and easier to use on mobile."
    : `I noticed I could not find a proper website for ${name}, so this might actually be useful.`;
  const opener = tone === "direct" ? `Hi ${name},` : `Hi ${name},\n\nHope your week is going well.`;
  return `${opener}\n\n${hook}\n\nI build simple websites for small ${category} businesses: mobile-friendly, clean, fast, with contact buttons, Google Maps, services, photos, and no confusing tech stuff.\n\nThe package I would suggest is ${packageName} for ${price}. I can also make a quick mockup first so you can see the idea before deciding anything.\n\nWould you want me to send a small example for ${name}?\n\nBest,\nJonas`;
}

function finnishPitchText(lead: BusinessLead | null, price: string, packageName: string) {
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
  <section id="contact"><h2>Contact</h2><p>Example package price for building this: ${price}.</p><p>${lead?.phone || "Phone here"} · ${lead?.email || "email@example.com"}</p></section>
</body>
</html>`;
}

function TerminalWorldMap({ leads, selected, onSelect }: { leads: BusinessLead[]; selected: BusinessLead | null; onSelect: (lead: BusinessLead) => void }) {
  const topLeads = leads.slice(0, 400);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ clientX: number; clientY: number; view: MapView; moved: boolean } | null>(null);
  const [view, setView] = useState<MapView>({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT });

  function zoomAt(clientX: number, clientY: number, scale: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * view.w + view.x;
    const py = ((clientY - rect.top) / rect.height) * view.h + view.y;
    const nextW = view.w * scale;
    const nextH = view.h * scale;
    setView(clampMapView({
      x: px - (px - view.x) * scale,
      y: py - (py - view.y) * scale,
      w: nextW,
      h: nextH,
    }));
  }

  function zoomCenter(scale: number) {
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    const nextW = view.w * scale;
    const nextH = view.h * scale;
    setView(clampMapView({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH }));
  }

  function focusLead(lead: BusinessLead) {
    const p = project(lead.lng, lead.lat);
    const nextW = 170;
    const nextH = nextW * (MAP_HEIGHT / MAP_WIDTH);
    setView(clampMapView({ x: p.x - nextW / 2, y: p.y - nextH / 2, w: nextW, h: nextH }));
    onSelect(lead);
  }

  function focusFinland() {
    const p = project(24.94, 61.92);
    const nextW = 115;
    const nextH = nextW * (MAP_HEIGHT / MAP_WIDTH);
    setView(clampMapView({ x: p.x - nextW / 2, y: p.y - nextH / 2, w: nextW, h: nextH }));
  }

  return (
    <div className="terminal-map panel stack">
      <div className="spread map-head">
        <div>
          <p className="badge">WORLD CLIENT RADAR</p>
          <h2>Zoomable world map</h2>
          <p className="muted small">real country borders · wheel zoom · drag pan · buttons work on phone</p>
        </div>
        <div className="map-controls row">
          <button type="button" onClick={() => zoomCenter(0.62)}>+</button>
          <button type="button" onClick={() => zoomCenter(1.45)}>-</button>
          <button type="button" onClick={focusFinland}>Finland</button>
          <button type="button" onClick={() => setView({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT })}>world</button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="world-svg real-world-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label="Zoomable world map with country borders and lead pins"
        onWheel={(event) => {
          event.preventDefault();
          zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 1.18 : 0.82);
        }}
        onDoubleClick={(event) => zoomAt(event.clientX, event.clientY, 0.55)}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { clientX: event.clientX, clientY: event.clientY, view, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg) return;
          const rect = svg.getBoundingClientRect();
          const dx = ((event.clientX - drag.clientX) / rect.width) * drag.view.w;
          const dy = ((event.clientY - drag.clientY) / rect.height) * drag.view.h;
          if (Math.abs(dx) + Math.abs(dy) > 1.5) drag.moved = true;
          setView(clampMapView({ ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy }));
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
        }}
      >
        <defs>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="scanGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" className="map-grid" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} className="map-bg" />
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#scanGrid)" opacity="0.62" />
        <g className="map-graticule" aria-hidden="true">
          {[-120, -60, 0, 60, 120].map((lon) => {
            const x = project(lon, 0).x;
            return <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
          })}
          {[-60, -30, 0, 30, 60].map((latLine) => {
            const y = project(0, latLine).y;
            return <line key={`lat-${latLine}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
          })}
        </g>
        <g className="map-land" filter="url(#softGlow)" aria-hidden="true">
          {WORLD_LAND_PATHS.map((d, index) => <path key={`land-${index}`} d={d} />)}
        </g>
        <g className="map-coast" aria-hidden="true">
          {WORLD_COAST_PATHS.map((d, index) => <path key={`coast-${index}`} d={d} />)}
        </g>
        <g className="map-countries" aria-hidden="true">
          {WORLD_COUNTRY_PATHS.map((d, index) => <path key={`country-${index}`} d={d} />)}
        </g>
        <g className="city-layer" aria-hidden="true">
          <circle cx={project(24.94, 60.17).x} cy={project(24.94, 60.17).y} r="1.6" /><text x={project(24.94, 60.17).x + 4} y={project(24.94, 60.17).y - 3}>HELSINKI</text>
          <circle cx={project(24.07, 60.25).x} cy={project(24.07, 60.25).y} r="1.6" /><text x={project(24.07, 60.25).x - 30} y={project(24.07, 60.25).y - 3}>LOHJA</text>
          <circle cx={project(25.75, 61.5).x} cy={project(25.75, 61.5).y} r="1.4" /><text x={project(25.75, 61.5).x + 4} y={project(25.75, 61.5).y - 3}>FINLAND</text>
        </g>
        <g className="pin-layer">
          {topLeads.map((lead) => {
            const p = project(lead.lng, lead.lat);
            const selectedDot = selected?.id === lead.id;
            const high = lead.score >= 70 || !lead.website;
            return (
              <g key={lead.id} onClick={() => focusLead(lead)} className="map-pin" tabIndex={0} role="button" aria-label={lead.name}>
                <circle cx={p.x} cy={p.y} r={selectedDot ? 5.5 : high ? 3.8 : 3} className={selectedDot ? "pin selected" : high ? "pin hot" : "pin"} />
                <circle cx={p.x} cy={p.y} r={selectedDot ? 10 : high ? 7 : 5.5} className="pin-ring" />
                {selectedDot && <text x={Math.min(p.x + 7, MAP_WIDTH - 110)} y={Math.max(p.y - 7, 12)}>{lead.name.slice(0, 28)}</text>}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="spread map-foot">
        <p className="muted small">Loaded {WORLD_MAP_COUNTS.countries} country-border segments, {WORLD_MAP_COUNTS.coast} coast segments, {WORLD_MAP_COUNTS.land} land polygons.</p>
        <p className="muted small">Zoom: {Math.round(MAP_WIDTH / view.w)}x · pins: {topLeads.length}</p>
      </div>
    </div>
  );
}

export default function BusinessClient({ username }: { username: string }) {
  const [tab, setTab] = useState<BusinessTab>("radar");
  const [query, setQuery] = useState("painter");
  const [location, setLocation] = useState("Lohja Finland");
  const [lat, setLat] = useState("60.25");
  const [lng, setLng] = useState("24.07");
  const [radius, setRadius] = useState("15000");
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
  const [price, setPrice] = useState("300€");
  const [packageName, setPackageName] = useState("Starter Website");
  const [tone, setTone] = useState("friendly");
  const [contentKind, setContentKind] = useState<keyof ReturnType<typeof contentPack>>("hero");

  const current = selected;
  const filteredResults = useMemo(() => {
    const score = Number(minScore) || 0;
    return results
      .filter((lead) => {
        if (leadFilter === "no_site") return !lead.website;
        if (leadFilter === "upgrade_site") return leadHasUpgradePotential(lead);
        if (leadFilter === "has_contact") return Boolean(lead.email || lead.contactFormUrl || lead.phone);
        if (leadFilter === "opportunity") return !lead.website || leadHasUpgradePotential(lead) || lead.score >= 55;
        return true;
      })
      .filter((lead) => lead.score >= score)
      .sort((a, b) => b.score - a.score);
  }, [results, leadFilter, minScore]);

  const allMapLeads = useMemo(() => {
    const map = new Map<string, BusinessLead>();
    [...results, ...saved].forEach((lead) => map.set(lead.id, lead));
    return Array.from(map.values()).filter((lead) => lead.lat || lead.lng);
  }, [results, saved]);

  const stats = useMemo(() => {
    const savedCount = saved.length;
    const contacted = saved.filter((lead) => ["contacted", "followup", "interested", "won"].includes(lead.status)).length;
    const won = saved.filter((lead) => lead.status === "won");
    const interested = saved.filter((lead) => lead.status === "interested").length;
    const followups = saved.filter((lead) => lead.status === "followup" || lead.nextFollowUp).length;
    const wonRevenue = won.reduce((sum, lead) => sum + moneyToNumber(lead.offerPrice || price), 0);
    const pipeline = saved.filter((lead) => ["followup", "interested"].includes(lead.status)).reduce((sum, lead) => sum + moneyToNumber(lead.offerPrice || price), 0);
    return { savedCount, contacted, won: won.length, interested, followups, wonRevenue, pipeline };
  }, [saved, price]);

  function mergeLeadLocal(next: BusinessLead) {
    setSelected(next);
    setResults((old) => old.map((lead) => lead.id === next.id ? { ...lead, ...next } : lead));
    setSaved((old) => old.map((lead) => lead.id === next.id ? { ...lead, ...next } : lead));
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
    const leads = Array.isArray(data.leads) ? data.leads as BusinessLead[] : [];
    setSaved(leads);
    return leads;
  }

  async function search(demo = false) {
    setLoading(true);
    setWebsiteCheck(null);
    setContactScan(null);
    setStatus(demo ? "loading demo radar..." : "searching Google Places/local radar...");
    try {
      const params = new URLSearchParams({ q: query, location, lat, lng, radius });
      if (demo) params.set("demo", "1");
      const response = await fetch(`/api/business/search?${params.toString()}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "business search failed"));
      const leads = Array.isArray(data.leads) ? data.leads as BusinessLead[] : [];
      setResults(leads);
      setSelected(leads[0] || null);
      setStatus(`${leads.length} targets loaded${data.demo ? " · demo mode until GOOGLE_MAPS_API_KEY is set" : ""}`);
    } catch (error) {
      setStatus(err(error, "business search failed"));
    } finally {
      setLoading(false);
    }
  }

  async function saveLead(lead: BusinessLead, nextStatus: LeadStatus = "saved") {
    try {
      const response = await fetch("/api/business/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, status: nextStatus, offerPrice: lead.offerPrice || price, packageName: lead.packageName || packageName }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "save failed"));
      const next = data.lead as BusinessLead;
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
      const next = data.lead as BusinessLead;
      mergeLeadLocal(next);
      await loadSaved();
      setStatus(`updated lead: ${lead.name}`);
    } catch (error) {
      setStatus(err(error, "update failed"));
    }
  }

  async function removeLead(lead: BusinessLead) {
    try {
      const response = await fetch(`/api/business/leads?id=${encodeURIComponent(lead.id)}`, { method: "DELETE" });
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
      setWebsiteCheck({ error: "No website found. This is usually a stronger web-design lead." });
      return;
    }
    setStatus("checking website...");
    setWebsiteCheck(null);
    try {
      const response = await fetch(`/api/business/website-check?url=${encodeURIComponent(lead.website)}`, { cache: "no-store" });
      const data = await readJson(response) as WebsiteCheck;
      setWebsiteCheck(data);
      setStatus(data.weak ? "website looks weak / worth checking manually" : "website responded and has basic signals");
    } catch (error) {
      setWebsiteCheck({ error: err(error, "website check failed") });
    }
  }

  async function scanContact(lead: BusinessLead, persist = isSavedLead(lead)) {
    if (!lead.website) {
      const next = { ...lead, siteQuality: "no_site", contactStatus: lead.phone ? "phone" : "unknown", siteNotes: "No website found from Google Places. Phone or manual search is the main contact path." };
      mergeLeadLocal(next);
      setContactScan({ ok: false, error: "No website to scan. This is still a good web-design lead, but email finder needs a site." });
      setStatus("no website to scan");
      return;
    }

    setStatus(`finding email/contact form for ${lead.name}...`);
    setContactScan(null);
    try {
      const response = await fetch(`/api/business/contact-scan?url=${encodeURIComponent(lead.website)}`, { cache: "no-store" });
      const data = await readJson(response) as ContactScan;
      setContactScan(data);
      if (!response.ok || !data.ok) throw new Error(String(data.error || "contact scan failed"));

      const patch: Partial<BusinessLead> = {
        email: data.emails?.[0] || lead.email || "",
        contactFormUrl: data.contactFormUrl || data.contactForms?.[0] || lead.contactFormUrl || "",
        facebookUrl: data.facebookUrl || lead.facebookUrl || "",
        instagramUrl: data.instagramUrl || lead.instagramUrl || "",
        contactStatus: data.contactStatus || lead.contactStatus || "website",
        siteQuality: data.siteQuality || lead.siteQuality || "unchecked",
        siteNotes: data.siteNotes || lead.siteNotes || "",
        lastScannedAt: data.scannedAt || new Date().toISOString(),
        score: Math.max(lead.score || 0, Number(data.upgradeScore || 0)),
      };
      const next = { ...lead, ...patch } as BusinessLead;
      mergeLeadLocal(next);
      setStatus(`${lead.name}: ${patch.email ? "email found" : patch.contactFormUrl ? "contact form found" : patch.contactStatus || "scan done"} · site ${patch.siteQuality || "checked"}`);
      if (persist) {
        if (isSavedLead(lead)) await updateLead(lead, patch);
        else await saveLead(next, "saved");
      }
    } catch (error) {
      setContactScan((old) => old || { ok: false, error: err(error, "contact scan failed") });
      setStatus(err(error, "contact scan failed"));
    }
  }

  async function scanVisibleWebsites() {
    const targets = filteredResults.filter((lead) => lead.website).slice(0, 10);
    if (!targets.length) {
      setStatus("no visible website leads to scan");
      return;
    }
    setLoading(true);
    try {
      for (let i = 0; i < targets.length; i += 1) {
        setStatus(`scanning ${i + 1}/${targets.length}: ${targets[i].name}`);
        await scanContact(targets[i], false);
      }
      setStatus(`scanned ${targets.length} website leads · switch filter to upgradeable sites/contact found`);
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
      contactStatus: manualEmail ? "email" : manualPhone ? "phone" : manualWebsite ? "website" : "unknown",
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

  function copy(text: string, label = "copied") {
    void navigator.clipboard.writeText(text).then(
      () => setStatus(label),
      () => setStatus("clipboard failed")
    );
  }

  useEffect(() => {
    void loadSaved().catch((error) => setStatus(err(error, "saved leads load failed")));
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
            <h1 className="terminal-title">Local business money dashboard</h1>
            <p className="muted">Signed in as {username}. User 2 cannot see this page or its APIs. This is for finding local businesses, creating offers, pitching, follow-ups, and tracking money.</p>
          </div>
          <div className="row">
            <Link className="buttonlike" href="/email">email console</Link>
            <button onClick={() => void loadSaved()} disabled={loading}>sync saved</button>
          </div>
        </div>
        <div className="module-tabs">
          {TABS.map((item) => <button key={item.key} className={tab === item.key ? "active-btn" : ""} onClick={() => setTab(item.key)}>{item.label}</button>)}
        </div>
        <p className="muted small">Status: {status}</p>
      </section>

      {tab === "radar" && (
        <>
          <div className="business-layout">
            <section className="panel stack">
              <h2>Lead finder</h2>
              <label className="stack small">Niche / keyword
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="painter, cleaner, barber..." />
              </label>
              <div className="chip-row">
                {NICHE_PRESETS.slice(0, 12).map((niche) => <button key={niche} onClick={() => setQuery(niche)}>{niche}</button>)}
              </div>
              <label className="stack small">Area
                <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Lohja Finland" />
              </label>
              <div className="chip-row">
                {CITY_PRESETS.slice(0, 6).map((city) => <button key={city} onClick={() => setLocation(city)}>{city.replace(" Finland", "")}</button>)}
              </div>
              <div className="grid tight-grid">
                <label className="stack small">Latitude<input value={lat} onChange={(event) => setLat(event.target.value)} /></label>
                <label className="stack small">Longitude<input value={lng} onChange={(event) => setLng(event.target.value)} /></label>
                <label className="stack small">Radius meters<input value={radius} onChange={(event) => setRadius(event.target.value)} /></label>
                <label className="stack small">Min score<input value={minScore} onChange={(event) => setMinScore(event.target.value)} /></label>
              </div>
              <label className="stack small">Lead filter
                <select value={leadFilter} onChange={(event) => setLeadFilter(event.target.value as LeadFilter)}>
                  <option value="opportunity">best opportunities</option>
                  <option value="no_site">no website</option>
                  <option value="upgrade_site">has site but upgradeable</option>
                  <option value="has_contact">contact found</option>
                  <option value="all">all results</option>
                </select>
              </label>
              <div className="row">
                <button onClick={() => void search(false)} disabled={loading}>search live</button>
                <button onClick={() => void search(true)} disabled={loading}>demo map</button>
                <button onClick={() => void scanVisibleWebsites()} disabled={loading || !filteredResults.some((lead) => lead.website)}>scan visible sites</button>
              </div>
              <p className="muted small">Live search needs GOOGLE_MAPS_API_KEY. Use “scan visible sites” to find emails/contact forms and identify weak sites worth upgrading.</p>
            </section>
            <TerminalWorldMap leads={allMapLeads} selected={current} onSelect={setSelected} />
          </div>

          <div className="business-layout bottom-layout">
            <section className="panel stack">
              <div className="spread"><h2>Targets</h2><p className="muted small">{filteredResults.length}/{results.length} visible</p></div>
              <div className="lead-list stack">
                {filteredResults.length === 0 && <p className="muted">No results yet. Press demo map or live search.</p>}
                {filteredResults.map((lead) => (
                  <button className={`lead-row ${selected?.id === lead.id ? "active" : ""}`} key={lead.id} onClick={() => setSelected(lead)}>
                    <span><strong>{lead.name}</strong><span className="muted small">{shortLeadLine(lead)}</span></span>
                    <span className={!lead.website || lead.siteQuality === "weak" ? "badge warn" : "badge"}>{siteLabel(lead)}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel stack">
              <h2>Lead panel</h2>
              {!current ? <p className="muted">Select a target.</p> : (
                <>
                  <div className="spread"><div><p className="badge">SCORE {pct(current.score)}</p><h2>{current.name}</h2><p className="muted">{current.category} · {current.address}</p></div><span className={current.website ? "badge" : "badge warn"}>{websiteLabel(current)}</span></div>
                  <div className="grid tight-grid">
                    <p><span className="dim small">phone</span><br />{current.phone || "none"}</p>
                    <p><span className="dim small">email</span><br />{current.email || "none"}</p>
                    <p><span className="dim small">rating</span><br />{num(current.rating)} ({current.userRatingCount ?? "?"})</p>
                    <p><span className="dim small">offer</span><br />{current.packageName || packageName} · {current.offerPrice || price}</p>
                    <p><span className="dim small">contact status</span><br />{contactBadge(current)}</p>
                    <p><span className="dim small">site quality</span><br />{siteLabel(current)}</p>
                  </div>
                  <div className="row">
                    {current.mapsUrl && <a className="buttonlike" href={current.mapsUrl} target="_blank" rel="noreferrer">open maps</a>}
                    {current.website && <a className="buttonlike" href={current.website} target="_blank" rel="noreferrer">open site</a>}
                    {current.contactFormUrl && <a className="buttonlike" href={current.contactFormUrl} target="_blank" rel="noreferrer">contact form</a>}
                    {current.facebookUrl && <a className="buttonlike" href={current.facebookUrl} target="_blank" rel="noreferrer">facebook</a>}
                    {current.instagramUrl && <a className="buttonlike" href={current.instagramUrl} target="_blank" rel="noreferrer">instagram</a>}
                    <button onClick={() => void saveLead(current, "saved")}>save</button>
                    <button onClick={() => { setTab("pitch"); copy(pitch, "pitch copied"); }}>copy pitch</button>
                    <button onClick={() => void scanContact(current, false)}>find email/form</button>
                    <button onClick={() => void scanContact(current, true)}>scan + save</button>
                    <button onClick={() => void checkWebsite(current)}>quick check</button>
                  </div>
                  {(websiteCheck || contactScan) && <pre>{JSON.stringify({ websiteCheck, contactScan }, null, 2)}</pre>}
                  {current.siteNotes && <p className="muted small">site notes: {current.siteNotes}</p>}
                  <div className="grid tight-grid">
                    <label className="stack small">Email<input value={current.email || ""} onChange={(event) => setSelected({ ...current, email: event.target.value })} onBlur={(event) => void commitLead(current, { email: event.target.value, contactStatus: event.target.value ? "email" : current.contactStatus })} /></label>
                    <label className="stack small">Contact form<input value={current.contactFormUrl || ""} onChange={(event) => setSelected({ ...current, contactFormUrl: event.target.value })} onBlur={(event) => void commitLead(current, { contactFormUrl: event.target.value, contactStatus: current.email ? "email" : event.target.value ? "form" : current.contactStatus })} /></label>
                    <label className="stack small">Phone<input value={current.phone || ""} onChange={(event) => setSelected({ ...current, phone: event.target.value })} onBlur={(event) => void commitLead(current, { phone: event.target.value })} /></label>
                    <label className="stack small">Offer price<input value={current.offerPrice || price} onChange={(event) => setSelected({ ...current, offerPrice: event.target.value })} onBlur={(event) => void commitLead(current, { offerPrice: event.target.value })} /></label>
                    <label className="stack small">Follow-up date<input type="date" value={current.nextFollowUp || ""} onChange={(event) => setSelected({ ...current, nextFollowUp: event.target.value })} onBlur={(event) => void commitLead(current, { nextFollowUp: event.target.value })} /></label>
                  </div>
                  <label className="stack small">Notes<textarea value={current.notes || ""} onChange={(event) => setSelected({ ...current, notes: event.target.value })} onBlur={(event) => void commitLead(current, { notes: event.target.value, status: current.status === "new" ? "saved" : current.status })} placeholder="what to offer, contact result, follow-up date..." /></label>
                  <div className="row">{STATUSES.map((nextStatus) => <button key={nextStatus} className={current.status === nextStatus ? "active-btn" : ""} onClick={() => void commitLead(current, { status: nextStatus, lastContacted: nextStatus === "contacted" ? new Date().toISOString() : current.lastContacted })}>{nextStatus}</button>)}</div>
                </>
              )}
            </section>
          </div>
        </>
      )}

      {tab === "audit" && (
        <section className="panel stack">
          <div className="spread"><div><p className="badge">AUDIT SCORE {audit.score}%</p><h2>Business audit: {audit.name}</h2></div>{current?.website && <button onClick={() => void checkWebsite(current)}>run website check</button>}</div>
          <div className="grid">
            {audit.items.map((item) => <div className="card stack" key={item.label}><span className={item.bad ? "badge warn" : "badge"}>{item.bad ? "opportunity" : "ok/manual"}</span><strong>{item.label}</strong><p className="muted small">{item.fix}</p></div>)}
          </div>
          <pre>{`Suggested angle:\n${current?.name || "This business"} can probably benefit from clearer mobile contact, service text, photos, Google profile text, and a simple quote path.`}</pre>
        </section>
      )}

      {tab === "offer" && (
        <section className="panel stack">
          <h2>Offer builder</h2>
          <div className="grid tight-grid"><label className="stack small">Default price<input value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="stack small">Package name<input value={packageName} onChange={(event) => setPackageName(event.target.value)} /></label></div>
          <div className="grid">
            {PACKAGES.map((pack) => <div className="card stack" key={pack.name}><p className="badge">{pack.price}</p><h3>{pack.name}</h3><p className="muted small">{pack.text}</p><button onClick={() => { setPackageName(pack.name); setPrice(pack.price); if (current) void commitLead(current, { packageName: pack.name, offerPrice: pack.price }); }}>use package</button></div>)}
          </div>
          <pre>{`Current offer:\n${packageName} · ${price}\n\nSimple promise:\nI make your business easier to find, understand, and contact from phone.`}</pre>
        </section>
      )}

      {tab === "pitch" && (
        <section className="panel stack">
          <div className="spread"><div><h2>Pitch generator</h2><p className="muted small">English + Finnish. Copy and send manually or use Email module.</p></div><Link className="buttonlike" href="/email">open email module</Link></div>
          <div className="grid tight-grid"><label className="stack small">Tone<select value={tone} onChange={(event) => setTone(event.target.value)}><option value="friendly">friendly</option><option value="direct">direct</option></select></label><label className="stack small">Price<input value={price} onChange={(event) => setPrice(event.target.value)} /></label></div>
          <div className="grid">
            <div className="card stack"><h3>English</h3><textarea className="big-textarea" value={pitch} readOnly /><button onClick={() => copy(`Subject: Quick website idea for ${current?.name || "your business"}\n\n${pitch}`, "English pitch copied")}>copy English</button></div>
            <div className="card stack"><h3>Finnish</h3><textarea className="big-textarea" value={pitchFi} readOnly /><button onClick={() => copy(`Aihe: Nopea nettisivuidea yritykselle ${current?.name || "teidän yrityksenne"}\n\n${pitchFi}`, "Finnish pitch copied")}>copy Finnish</button></div>
          </div>
        </section>
      )}

      {tab === "demo" && (
        <section className="panel stack">
          <div className="spread"><div><h2>Demo page generator</h2><p className="muted small">Creates a complete one-file HTML mockup you can show/send.</p></div><button onClick={() => copy(demo, "demo HTML copied")}>copy HTML</button></div>
          <textarea className="big-textarea code-editor" value={demo} readOnly />
          <div className="card stack demo-preview"><h2>{current?.name || "Example Local Business"}</h2><p className="muted">{current?.category || "local service"} · clean landing page preview</p><div className="row"><span className="buttonlike">Call now</span><span className="buttonlike">Request quote</span></div><div className="grid"><div className="photo-box" /><div className="photo-box" /><div className="photo-box" /></div></div>
        </section>
      )}

      {tab === "crm" && (
        <section className="panel stack">
          <div className="spread"><div><h2>Mini CRM + manual leads</h2><p className="muted small">{saved.length} saved leads. Status, notes, offers, and follow-ups are stored in Neon when DATABASE_URL is set.</p></div><button onClick={() => void loadSaved()}>refresh</button></div>
          <div className="card stack">
            <h3>Add manual business</h3>
            <div className="grid tight-grid"><input placeholder="Business name" value={manualName} onChange={(e) => setManualName(e.target.value)} /><input placeholder="Category" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} /><input placeholder="City / address" value={manualCity} onChange={(e) => setManualCity(e.target.value)} /><input placeholder="Phone" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} /><input placeholder="Email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} /><input placeholder="Website" value={manualWebsite} onChange={(e) => setManualWebsite(e.target.value)} /></div>
            <button onClick={() => void saveManualLead()}>save manual lead</button>
          </div>
          <div className="grid">
            {saved.map((lead) => <div className="card stack" key={lead.id}><div className="spread"><div><strong>{lead.name}</strong><p className="muted small">{shortLeadLine(lead)}</p></div><span className="badge">{lead.status}</span></div><p className="muted small">follow-up: {lead.nextFollowUp || "none"} · offer: {lead.packageName || "package"} {lead.offerPrice || price} · {siteLabel(lead)} · {contactBadge(lead)}</p><div className="row"><button onClick={() => { setSelected(lead); setTab("radar"); }}>open</button><button onClick={() => void scanContact(lead, true)}>scan</button><button onClick={() => void updateLead(lead, { status: "followup", nextFollowUp: todayPlus(3) })}>follow up +3d</button><button onClick={() => copy(pitchText(lead, lead.offerPrice || price, lead.packageName || packageName, tone), "pitch copied")}>copy pitch</button><button className="danger" onClick={() => void removeLead(lead)}>X</button></div></div>)}
          </div>
        </section>
      )}

      {tab === "templates" && (
        <section className="panel stack">
          <h2>Template library</h2>
          <p className="muted">Same backend, different marketing angle. Pick one niche for outreach even though the service works for all.</p>
          <div className="grid">
            {NICHE_PRESETS.map((niche) => <div className="card stack" key={niche}><p className="badge">{niche}</p><h3>{niche} website angle</h3><p className="muted small">Hero, services, gallery, quote button, Google text, review request, and simple follow-up message.</p><button onClick={() => { setQuery(niche); setManualCategory(niche); setPackageName("Starter Website"); setTab("radar"); }}>use niche</button></div>)}
          </div>
        </section>
      )}

      {tab === "content" && (
        <section className="panel stack">
          <h2>Text/content generator</h2>
          <label className="stack small">Text type<select value={contentKind} onChange={(event) => setContentKind(event.target.value as keyof typeof content)}><option value="hero">homepage hero</option><option value="about">about section</option><option value="services">services</option><option value="faq">FAQ</option><option value="google">Google Business description</option><option value="review">review request</option></select></label>
          <textarea className="big-textarea" value={content[contentKind]} readOnly />
          <div className="row"><button onClick={() => copy(content[contentKind], "content copied")}>copy text</button><button onClick={() => copy(Object.entries(content).map(([k, v]) => `${k.toUpperCase()}\n${v}`).join("\n\n---\n\n"), "full content pack copied")}>copy full pack</button></div>
        </section>
      )}

      {tab === "money" && (
        <section className="panel stack">
          <h2>Money tracker</h2>
          <div className="grid">
            <div className="card"><p className="badge">leads</p><h2>{stats.savedCount}</h2><p className="muted small">saved targets</p></div>
            <div className="card"><p className="badge">outreach</p><h2>{stats.contacted}</h2><p className="muted small">contacted/follow-up/interested/won</p></div>
            <div className="card"><p className="badge">interested</p><h2>{stats.interested}</h2><p className="muted small">warm leads</p></div>
            <div className="card"><p className="badge">won</p><h2>{stats.won}</h2><p className="muted small">closed clients</p></div>
            <div className="card"><p className="badge">pipeline</p><h2>{stats.pipeline}€</h2><p className="muted small">possible follow-up/interested value</p></div>
            <div className="card"><p className="badge">earned</p><h2>{stats.wonRevenue}€</h2><p className="muted small">won offer value</p></div>
          </div>
          <pre>{`Simple target:\nContact 10 businesses/day.\nSend 3 demos/week.\nTry to close 1 small ${price} job first.\nThen add ${PACKAGES[3].price} care plans for recurring income.`}</pre>
        </section>
      )}
    </div>
  );
}
