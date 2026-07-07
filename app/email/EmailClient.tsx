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

function template(lead: BusinessLead, price: string, tone: string) {
  const noWebsiteLine = lead.website
    ? `I checked your current website and I think it could possibly be made clearer, faster, and easier to use on mobile.`
    : `I noticed I could not find a proper website for ${lead.name}, so I thought this might actually be useful.`;

  const friendlyStart = tone === "direct" ? `Hi ${lead.name},` : `Hi ${lead.name},\n\nHope your week is going well.`;

  return `${friendlyStart}\n\n${noWebsiteLine}\n\nI build simple websites for small local businesses: mobile-friendly, clean design, contact button, Google Maps link, services/menu/gallery section, and no confusing tech stuff.\n\nA simple first version would be ${price}, fixed price. I can also make a quick mockup first so you can see the idea before deciding anything.\n\nWould you want me to send a small example for ${lead.name}?\n\nBest,\nJonas`;
}

export default function EmailClient({ username }: { username: string }) {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState("300€");
  const [tone, setTone] = useState("friendly");
  const [subject, setSubject] = useState("Quick website idea");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("email console ready");
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => leads.find((lead) => lead.id === selectedId) || null, [leads, selectedId]);
  const mailto = useMemo(() => {
    const params = new URLSearchParams({ subject, body });
    return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
  }, [to, subject, body]);

  async function loadLeads() {
    const response = await fetch("/api/business/leads", { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(String(data.error || "lead load failed"));
    const next = Array.isArray(data.leads) ? data.leads as BusinessLead[] : [];
    setLeads(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
    setStatus(`${next.length} saved leads loaded`);
  }

  function generate() {
    const lead = selected;
    if (!lead) {
      setStatus("select a saved lead first");
      return;
    }
    setSubject(`Quick website idea for ${lead.name}`);
    setBody(template(lead, price, tone));
    setStatus(`draft generated for ${lead.name}`);
  }

  function copyDraft() {
    const text = `To: ${to || ""}\nSubject: ${subject}\n\n${body}`;
    void navigator.clipboard.writeText(text).then(
      () => setStatus("draft copied to clipboard"),
      () => setStatus("clipboard copy failed")
    );
  }

  async function markContacted() {
    if (!selected) return;
    try {
      const response = await fetch("/api/business/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status: "contacted", notes: `${selected.notes || ""}\nContacted: ${new Date().toLocaleString()}`.trim() }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "update failed"));
      await loadLeads();
      setStatus("lead marked contacted");
    } catch (error) {
      setStatus(err(error, "mark contacted failed"));
    }
  }

  async function sendResend() {
    setLoading(true);
    setStatus("sending through optional Resend API...");
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "send failed"));
      setStatus(`sent · ${String(data.id || "ok")}`);
      await markContacted();
    } catch (error) {
      setStatus(err(error, "send failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads().catch((error) => setStatus(err(error, "lead load failed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, price, tone]);

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">ADMIN ONLY</p>
            <h1 className="terminal-title">Email outreach console</h1>
            <p className="muted">Signed in as {username}. Use saved radar leads to generate simple client emails.</p>
          </div>
          <div className="row">
            <Link className="buttonlike" href="/business">client radar</Link>
            <button onClick={() => void loadLeads()} disabled={loading}>sync leads</button>
          </div>
        </div>
        <p className="muted small">Status: {status}</p>
      </section>

      <div className="email-layout">
        <section className="panel stack">
          <h2>Lead + offer</h2>
          <label className="stack small">Saved lead
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">select lead</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.status} · score {lead.score}</option>)}
            </select>
          </label>
          <label className="stack small">Recipient email
            <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="business@example.com" />
          </label>
          <div className="grid tight-grid">
            <label className="stack small">First offer price
              <input value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
            <label className="stack small">Tone
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                <option value="friendly">friendly</option>
                <option value="direct">direct</option>
              </select>
            </label>
          </div>
          {selected && (
            <div className="card stack">
              <strong>{selected.name}</strong>
              <p className="muted small">{selected.category} · {selected.website ? selected.website : "no website found"}</p>
              <p className="muted small">{selected.address}</p>
            </div>
          )}
          <div className="row">
            <button onClick={generate}>generate</button>
            <button onClick={copyDraft}>copy draft</button>
            <a className="buttonlike" href={mailto}>open mail app</a>
            <button onClick={() => void markContacted()} disabled={!selected}>mark contacted</button>
          </div>
          <button className="warn" onClick={() => void sendResend()} disabled={loading}>send via Resend API</button>
          <p className="muted small">Sending needs RESEND_API_KEY and EMAIL_FROM. Without those, use copy or mailto mode.</p>
        </section>

        <section className="panel stack">
          <h2>Draft</h2>
          <label className="stack small">Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label className="stack small">Body
            <textarea className="big-textarea" value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <pre>{`To: ${to || "[missing]"}\nSubject: ${subject}\n\n${body}`}</pre>
        </section>
      </div>
    </div>
  );
}
