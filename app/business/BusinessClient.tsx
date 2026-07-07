"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LeadStatus = "new" | "saved" | "contacted" | "interested" | "rejected" | "followup";

type BusinessLead = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  rating: number | null;
  userRatingCount: number | null;
  lat: number;
  lng: number;
  score: number;
  status: LeadStatus;
  notes: string;
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

const STATUSES: LeadStatus[] = ["new", "saved", "contacted", "followup", "interested", "rejected"];

function readJson(response: Response) {
  return response.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
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

function project(lng: number, lat: number) {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 520;
  return { x: Math.max(0, Math.min(1000, x)), y: Math.max(0, Math.min(520, y)) };
}

function websiteLabel(lead: BusinessLead) {
  if (!lead.website) return "NO WEBSITE";
  try {
    return new URL(lead.website).hostname.replace(/^www\./, "");
  } catch {
    return lead.website;
  }
}

function emailBody(lead: BusinessLead) {
  return `Hi ${lead.name},\n\nI noticed your business and wanted to send a quick idea. I build simple modern websites for small local businesses: mobile-friendly, fast, clean black/white style if wanted, contact button, Google Maps link, gallery/menu/services section, and easy updates.\n\nI could make a simple first version for a fixed affordable price, with no confusing tech stuff for you.\n\nWould you want me to send a short example/mockup for ${lead.name}?\n\nBest,\nJonas`;
}

function TerminalWorldMap({ leads, selected, onSelect }: { leads: BusinessLead[]; selected: BusinessLead | null; onSelect: (lead: BusinessLead) => void }) {
  const topLeads = leads.slice(0, 120);

  return (
    <div className="terminal-map panel">
      <div className="spread map-head">
        <div>
          <p className="badge">WORLD CLIENT RADAR</p>
          <h2>Terminal map</h2>
        </div>
        <p className="muted small">black water · glowing green land · pins from Places/search</p>
      </div>

      <svg className="world-svg" viewBox="0 0 1000 520" role="img" aria-label="Stylized terminal world map">
        <defs>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="scanGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" className="map-grid" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="1000" height="520" className="map-bg" />
        <rect x="0" y="0" width="1000" height="520" fill="url(#scanGrid)" opacity="0.65" />
        <line x1="0" y1="260" x2="1000" y2="260" className="map-axis" />
        <line x1="500" y1="0" x2="500" y2="520" className="map-axis" />

        <g className="continent" filter="url(#softGlow)">
          <path d="M132 88 L190 70 L238 88 L266 122 L252 155 L284 188 L260 225 L287 272 L265 322 L230 350 L204 316 L170 300 L154 260 L119 245 L92 205 L73 155 L92 114 Z" />
          <path d="M262 288 L307 326 L331 386 L314 455 L284 500 L254 461 L239 405 L215 363 L229 328 Z" />
          <path d="M470 94 L548 78 L614 98 L663 132 L646 174 L694 205 L664 236 L605 225 L563 244 L520 218 L467 231 L426 194 L441 145 Z" />
          <path d="M510 235 L565 238 L608 285 L603 352 L574 418 L539 482 L510 427 L483 360 L451 313 L470 263 Z" />
          <path d="M650 155 L735 132 L833 164 L904 222 L866 276 L774 253 L717 284 L666 242 Z" />
          <path d="M807 355 L864 365 L908 417 L890 462 L835 451 L792 407 Z" />
          <path d="M324 116 L367 108 L394 132 L377 157 L334 152 Z" />
          <path d="M452 40 L562 30 L646 47 L606 72 L501 74 Z" />
          <path d="M392 432 L435 420 L461 444 L454 484 L406 490 L372 463 Z" />
        </g>

        <g className="map-lines">
          <path d="M170 95 L178 188 L138 238 M216 86 L214 170 L250 210 M100 155 L198 158 L263 139" />
          <path d="M250 320 L288 365 L274 442 M221 362 L323 386 M270 292 L247 398" />
          <path d="M486 98 L496 218 M543 82 L546 238 M606 96 L592 224 M431 156 L658 161 M455 198 L624 208" />
          <path d="M500 252 L560 305 L544 418 M469 300 L596 342 M523 242 L513 426" />
          <path d="M691 160 L706 265 M754 142 L772 254 M827 166 L814 266 M662 205 L884 224" />
        </g>

        <g className="map-water-detail">
          <path d="M548 110 C520 127 526 153 553 166 C588 154 584 123 548 110 Z" />
          <path d="M584 278 C558 304 560 348 588 365 C623 333 615 293 584 278 Z" />
          <path d="M189 204 C160 226 177 248 207 239 C219 220 207 207 189 204 Z" />
          <path d="M770 207 C748 222 757 240 785 238 C802 223 795 209 770 207 Z" />
        </g>

        <g className="city-layer">
          <circle cx="563" cy="131" r="2.5" /><text x="570" y="127">HELSINKI</text>
          <circle cx="548" cy="130" r="2.3" /><text x="505" y="126">LOHJA</text>
          <circle cx="483" cy="154" r="2.2" /><text x="489" y="151">LONDON</text>
          <circle cx="645" cy="176" r="2.2" /><text x="652" y="173">ISTANBUL</text>
          <circle cx="780" cy="218" r="2.2" /><text x="787" y="215">DELHI</text>
        </g>

        <g className="pin-layer">
          {topLeads.map((lead) => {
            const p = project(lead.lng, lead.lat);
            const selectedDot = selected?.id === lead.id;
            const high = lead.score >= 70 || !lead.website;
            return (
              <g key={lead.id} onClick={() => onSelect(lead)} className="map-pin" tabIndex={0} role="button" aria-label={lead.name}>
                <circle cx={p.x} cy={p.y} r={selectedDot ? 9 : high ? 6 : 4.5} className={selectedDot ? "pin selected" : high ? "pin hot" : "pin"} />
                <circle cx={p.x} cy={p.y} r={selectedDot ? 17 : high ? 12 : 9} className="pin-ring" />
                {selectedDot && <text x={Math.min(p.x + 12, 900)} y={Math.max(p.y - 12, 18)}>{lead.name.slice(0, 28)}</text>}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default function BusinessClient({ username }: { username: string }) {
  const [query, setQuery] = useState("restaurant");
  const [location, setLocation] = useState("Lohja Finland");
  const [lat, setLat] = useState("60.25");
  const [lng, setLng] = useState("24.07");
  const [radius, setRadius] = useState("15000");
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(true);
  const [minScore, setMinScore] = useState("0");
  const [results, setResults] = useState<BusinessLead[]>([]);
  const [saved, setSaved] = useState<BusinessLead[]>([]);
  const [selected, setSelected] = useState<BusinessLead | null>(null);
  const [websiteCheck, setWebsiteCheck] = useState<WebsiteCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("client radar ready");

  const filteredResults = useMemo(() => {
    const score = Number(minScore) || 0;
    return results
      .filter((lead) => (onlyNoWebsite ? !lead.website : true))
      .filter((lead) => lead.score >= score)
      .sort((a, b) => b.score - a.score);
  }, [results, onlyNoWebsite, minScore]);

  const allMapLeads = useMemo(() => {
    const map = new Map<string, BusinessLead>();
    [...results, ...saved].forEach((lead) => map.set(lead.id, lead));
    return Array.from(map.values()).filter((lead) => lead.lat || lead.lng);
  }, [results, saved]);

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

  async function saveLead(lead: BusinessLead, status: LeadStatus = "saved") {
    try {
      const response = await fetch("/api/business/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, status }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "save failed"));
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
      setSelected(next);
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

  function copyEmail(lead: BusinessLead) {
    const text = `Subject: Quick website idea for ${lead.name}\n\n${emailBody(lead)}`;
    void navigator.clipboard.writeText(text).then(
      () => setStatus("email copied to clipboard"),
      () => setStatus("clipboard failed; use the email module copy box")
    );
  }

  useEffect(() => {
    void loadSaved().catch((error) => setStatus(err(error, "saved leads load failed")));
  }, []);

  const current = selected;

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">ADMIN ONLY</p>
            <h1 className="terminal-title">Local client radar</h1>
            <p className="muted">
              Signed in as {username}. Search local businesses, spot weak/no websites, save leads, and use them in the email module.
            </p>
          </div>
          <div className="row">
            <Link className="buttonlike" href="/email">email module</Link>
            <button onClick={() => void loadSaved()} disabled={loading}>sync saved</button>
          </div>
        </div>
        <p className="muted small">Status: {status}</p>
      </section>

      <div className="business-layout">
        <section className="panel stack">
          <h2>Search controls</h2>
          <label className="stack small">Business type / keyword
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="restaurant, barber, car repair..." />
          </label>
          <label className="stack small">Area
            <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Lohja Finland" />
          </label>
          <div className="grid tight-grid">
            <label className="stack small">Latitude
              <input value={lat} onChange={(event) => setLat(event.target.value)} />
            </label>
            <label className="stack small">Longitude
              <input value={lng} onChange={(event) => setLng(event.target.value)} />
            </label>
            <label className="stack small">Radius meters
              <input value={radius} onChange={(event) => setRadius(event.target.value)} />
            </label>
            <label className="stack small">Min score
              <input value={minScore} onChange={(event) => setMinScore(event.target.value)} />
            </label>
          </div>
          <label className="checkline">
            <input type="checkbox" checked={onlyNoWebsite} onChange={(event) => setOnlyNoWebsite(event.target.checked)} />
            show no-website leads first
          </label>
          <div className="row">
            <button onClick={() => void search(false)} disabled={loading}>search live</button>
            <button onClick={() => void search(true)} disabled={loading}>demo map</button>
          </div>
          <p className="muted small">Live search needs GOOGLE_MAPS_API_KEY. Demo mode lets the UI work and build with no key.</p>
        </section>

        <TerminalWorldMap leads={allMapLeads} selected={current} onSelect={setSelected} />
      </div>

      <div className="business-layout bottom-layout">
        <section className="panel stack">
          <div className="spread">
            <div>
              <h2>Targets</h2>
              <p className="muted small">{filteredResults.length}/{results.length} visible · sorted by lead score</p>
            </div>
          </div>
          <div className="lead-list stack">
            {filteredResults.length === 0 && <p className="muted">No results yet. Press demo map or live search.</p>}
            {filteredResults.map((lead) => (
              <button className={`lead-row ${selected?.id === lead.id ? "active" : ""}`} key={lead.id} onClick={() => setSelected(lead)}>
                <span>
                  <strong>{lead.name}</strong>
                  <span className="muted small">{lead.category} · {websiteLabel(lead)} · rating {num(lead.rating)} · score {lead.score}</span>
                </span>
                <span className={lead.website ? "badge" : "badge warn"}>{lead.website ? "site" : "no site"}</span>
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
                  <p className="muted">{current.category} · {current.address}</p>
                </div>
                <span className={current.website ? "badge" : "badge warn"}>{websiteLabel(current)}</span>
              </div>
              <div className="grid tight-grid">
                <p><span className="dim small">phone</span><br />{current.phone || "none"}</p>
                <p><span className="dim small">rating</span><br />{num(current.rating)} ({current.userRatingCount ?? "?"})</p>
                <p><span className="dim small">coords</span><br />{current.lat.toFixed(4)}, {current.lng.toFixed(4)}</p>
                <p><span className="dim small">source</span><br />{current.source}</p>
              </div>
              <div className="row">
                {current.mapsUrl && <a className="buttonlike" href={current.mapsUrl} target="_blank" rel="noreferrer">open maps</a>}
                {current.website && <a className="buttonlike" href={current.website} target="_blank" rel="noreferrer">open site</a>}
                <button onClick={() => void saveLead(current, "saved")}>save</button>
                <button onClick={() => copyEmail(current)}>copy email</button>
                <button onClick={() => void checkWebsite(current)}>check site</button>
              </div>
              {websiteCheck && (
                <pre>{JSON.stringify(websiteCheck, null, 2)}</pre>
              )}
              <label className="stack small">Notes
                <textarea value={current.notes || ""} onChange={(event) => setSelected({ ...current, notes: event.target.value })} onBlur={(event) => void updateLead(current, { notes: event.target.value, status: current.status === "new" ? "saved" : current.status })} placeholder="what to offer, contact result, follow-up date..." />
              </label>
              <div className="row">
                {STATUSES.map((status) => (
                  <button key={status} className={current.status === status ? "active-btn" : ""} onClick={() => void updateLead(current, { status })}>{status}</button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="panel stack">
        <div className="spread">
          <div>
            <h2>Saved leads</h2>
            <p className="muted small">Stored locally in .dashboard-data/business-leads.json on the PC running this dashboard.</p>
          </div>
          <span className="badge">{saved.length} saved</span>
        </div>
        <div className="grid">
          {saved.map((lead) => (
            <div className="card stack" key={lead.id}>
              <div className="spread">
                <div>
                  <strong>{lead.name}</strong>
                  <p className="muted small">{lead.status} · {lead.category} · score {lead.score}</p>
                </div>
                <span className={lead.website ? "badge" : "badge warn"}>{lead.website ? "site" : "no site"}</span>
              </div>
              <p className="muted small">{lead.address}</p>
              <div className="row">
                <button onClick={() => setSelected(lead)}>open</button>
                <button onClick={() => copyEmail(lead)}>copy email</button>
                <button className="danger" onClick={() => void removeLead(lead)}>X</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
