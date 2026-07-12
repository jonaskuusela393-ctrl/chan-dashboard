"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = { id: string; name: string; email: string; phone: string; website: string; status: string };
type Site = {
  id: number; leadId: string; projectName: string; productionUrl: string; previewUrl: string; domain: string; repositoryUrl: string;
  lifecycleStatus: string; availabilityStatus: string; maintenancePlan: string; domainOwner: string; hostingOwner: string;
  databaseOwner: string; sourceOwner: string; primaryContact: string; supportToken: string; launchedAt: string; maintenanceUntil: string;
  lastCheckedAt: string; lastHttpStatus: number | null; lastResponseMs: number | null; notes: string; updatedAt: string;
};
type RequestItem = { id: number; clientSiteId: number; leadId: string; requestType: string; status: string; priority: string; customerName: string; customerEmail: string; subject: string; body: string; createdAt: string };
type EventItem = { id: number; clientSiteId: number; kind: string; summary: string; createdAt: string };
type Workspace = { sites: Site[]; requests: RequestItem[]; events: EventItem[]; leads: Lead[] };
const empty: Workspace = { sites: [], requests: [], events: [], leads: [] };
const newForm = { leadId: "", projectName: "", productionUrl: "", previewUrl: "", domain: "", repositoryUrl: "", lifecycleStatus: "planning", availabilityStatus: "unknown", maintenancePlan: "handoff", domainOwner: "client", hostingOwner: "client", databaseOwner: "not_required", sourceOwner: "client_after_final_payment", primaryContact: "", launchedAt: "", maintenanceUntil: "", notes: "" };

function date(value: string) { return value ? new Date(value).toLocaleString() : "not yet"; }

export default function ClientManagementClient() {
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [form, setForm] = useState({ ...newForm });
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  async function load(select?: number) {
    setLoading(true);
    try { const response = await fetch("/api/business/clients", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load client records"); setWorkspace(data); const id = select || selectedId || data.sites?.[0]?.id || 0; setSelectedId(id); const site = data.sites?.find((item: Site) => item.id === id); if (site) setForm({ ...newForm, ...site }); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const selected = workspace.sites.find((site) => site.id === selectedId) || null;
  const requests = useMemo(() => workspace.requests.filter((item) => item.clientSiteId === selectedId), [workspace.requests, selectedId]);
  const events = useMemo(() => workspace.events.filter((item) => item.clientSiteId === selectedId), [workspace.events, selectedId]);
  function select(site: Site) { setSelectedId(site.id); setForm({ ...newForm, ...site }); }
  function chooseLead(leadId: string) { const lead = workspace.leads.find((item) => item.id === leadId); setForm({ ...newForm, leadId, projectName: lead ? `${lead.name} website` : "", productionUrl: lead?.website || "", primaryContact: lead?.email || lead?.phone || "" }); setSelectedId(0); }
  async function action(body: Record<string, unknown>, message: string) {
    setStatus(message);
    try { const response = await fetch("/api/business/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Operation failed"); const id = Number(data.result?.id || selectedId || 0); await load(id); setStatus("Saved."); return data.result; }
    catch (error) { setStatus(error instanceof Error ? error.message : "Operation failed"); return null; }
  }
  async function save() { await action({ action: "site.save", ...form }, "Saving project record..."); }
  async function check() { if (selected) await action({ action: "site.check", id: selected.id }, "Checking the live site..."); }
  async function rotate() { if (selected && confirm("Replace the current customer support code? The old code will stop working.")) await action({ action: "site.rotate-token", id: selected.id }, "Rotating support code..."); }
  async function addNote() { if (!selected || !note.trim()) return; await action({ action: "event.add", clientSiteId: selected.id, leadId: selected.leadId, kind: "note", summary: note }, "Adding note..."); setNote(""); }
  async function requestStatus(id: number, next: string) { await action({ action: "request.status", id, status: next }, "Updating request..."); }
  const live = workspace.sites.filter((site) => site.lifecycleStatus === "live").length;
  const offline = workspace.sites.filter((site) => site.availabilityStatus === "offline").length;
  const open = workspace.requests.filter((request) => !["done", "declined"].includes(request.status)).length;
  return <div className="stack">
    <section className="metric-grid"><div className="metric"><span>client projects</span><strong>{workspace.sites.length}</strong></div><div className="metric"><span>live</span><strong>{live}</strong></div><div className="metric"><span>open requests</span><strong>{open}</strong></div><div className="metric"><span>offline</span><strong>{offline}</strong></div></section>
    <div className="client-workspace">
      <section className="panel stack client-list"><div className="spread"><div><p className="badge">CLIENT RECORDS</p><h2>Managed websites</h2></div><button onClick={() => { setSelectedId(0); setForm({ ...newForm }); }}>new</button></div>
        <input placeholder="Filter projects" onChange={(event) => { const value = event.target.value.toLowerCase(); const match = workspace.sites.find((site) => site.projectName.toLowerCase().includes(value)); if (match) select(match); }} />
        {workspace.sites.map((site) => <button key={site.id} className={`client-site-row ${site.id === selectedId ? "active" : ""}`} onClick={() => select(site)}><span><strong>{site.projectName}</strong><small>{site.domain || site.productionUrl || "not published"}</small></span><span className={`site-state ${site.availabilityStatus}`}>{site.availabilityStatus}</span></button>)}
        {!workspace.sites.length && !loading && <p className="muted">No client project records yet.</p>}
      </section>
      <section className="panel stack client-editor"><div className="spread"><div><p className="badge">PROJECT CONTROL</p><h2>{selected ? selected.projectName : "Create client record"}</h2></div><div className="row"><button onClick={check} disabled={!selected || !form.productionUrl}>check site</button><button onClick={save}>save</button></div></div>
        <div className="form-grid"><label>Company<select value={form.leadId} onChange={(event) => chooseLead(event.target.value)}><option value="">Choose a CRM company</option>{workspace.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</select></label><label>Project name<input value={form.projectName} onChange={(event) => setForm({ ...form, projectName: event.target.value })}/></label><label>Lifecycle<select value={form.lifecycleStatus} onChange={(event) => setForm({ ...form, lifecycleStatus: event.target.value })}>{["planning","building","review","live","maintenance","paused","handed_off"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Availability<select value={form.availabilityStatus} onChange={(event) => setForm({ ...form, availabilityStatus: event.target.value })}>{["unknown","online","degraded","offline","maintenance"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Production URL<input value={form.productionUrl} onChange={(event) => setForm({ ...form, productionUrl: event.target.value })} placeholder="https://company.fi"/></label><label>Preview URL<input value={form.previewUrl} onChange={(event) => setForm({ ...form, previewUrl: event.target.value })}/></label><label>Domain<input value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })}/></label><label>Repository<input value={form.repositoryUrl} onChange={(event) => setForm({ ...form, repositoryUrl: event.target.value })}/></label><label>Maintenance plan<input value={form.maintenancePlan} onChange={(event) => setForm({ ...form, maintenancePlan: event.target.value })} placeholder="handoff / technical / managed / growth"/></label><label>Primary contact<input value={form.primaryContact} onChange={(event) => setForm({ ...form, primaryContact: event.target.value })}/></label><label>Launch date<input type="date" value={form.launchedAt?.slice(0,10) || ""} onChange={(event) => setForm({ ...form, launchedAt: event.target.value })}/></label><label>Maintenance until<input type="date" value={form.maintenanceUntil?.slice(0,10) || ""} onChange={(event) => setForm({ ...form, maintenanceUntil: event.target.value })}/></label></div>
        <h3>Ownership and responsibility</h3><div className="form-grid"><label>Domain owner<input value={form.domainOwner} onChange={(event) => setForm({ ...form, domainOwner: event.target.value })}/></label><label>Hosting owner<input value={form.hostingOwner} onChange={(event) => setForm({ ...form, hostingOwner: event.target.value })}/></label><label>Database owner<input value={form.databaseOwner} onChange={(event) => setForm({ ...form, databaseOwner: event.target.value })}/></label><label>Source ownership<input value={form.sourceOwner} onChange={(event) => setForm({ ...form, sourceOwner: event.target.value })}/></label></div>
        <label className="stack small">Internal notes<textarea rows={5} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/></label>
        {selected && <div className="support-code-box"><div><strong>Customer support code</strong><code>{selected.supportToken}</code><p className="muted small">Give this code only to the client. It permits sending a request, not logging in or reading project data.</p></div><div className="row"><button onClick={() => navigator.clipboard.writeText(selected.supportToken)}>copy</button><button onClick={rotate}>replace</button></div></div>}
        {selected && <p className="muted small">Last check: {date(selected.lastCheckedAt)} · HTTP {selected.lastHttpStatus ?? "—"} · {selected.lastResponseMs ?? "—"} ms · record updated {date(selected.updatedAt)}</p>}
        <p className="form-status">{status}</p>
      </section>
    </div>
    {selected && <div className="ops-two-column"><section className="panel stack"><div className="spread"><h2>Customer requests</h2><span className="badge">{requests.length}</span></div>{requests.map((request) => <article className={`client-request ${request.priority}`} key={request.id}><div className="spread"><div><strong>{request.subject}</strong><p className="muted small">{request.customerName} · {request.customerEmail} · {date(request.createdAt)}</p></div><span className="badge">{request.priority}</span></div><p>{request.body}</p><div className="row"><select value={request.status} onChange={(event) => void requestStatus(request.id, event.target.value)}>{["new","planned","in_progress","waiting_client","done","declined"].map((value) => <option key={value}>{value}</option>)}</select><span className="muted small">{request.requestType}</span></div></article>)}{!requests.length && <p className="muted">No client requests.</p>}</section>
      <section className="panel stack"><h2>Project log</h2><div className="row"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add an internal note, call outcome or maintenance action"/><button onClick={addNote}>add</button></div>{events.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-dot"/><div><strong>{event.summary}</strong><p className="muted small">{event.kind} · {date(event.createdAt)}</p></div></div>)}{!events.length && <p className="muted">No project events yet.</p>}</section></div>}
  </div>;
}
