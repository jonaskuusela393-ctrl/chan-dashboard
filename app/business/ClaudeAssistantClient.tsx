"use client";

import { useEffect, useState } from "react";

type Lead = { id: string; name: string; category: string; website: string; notes: string; siteNotes: string; email: string; phone: string };

export default function ClaudeAssistantClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState("");
  const [task, setTask] = useState("lead-summary");
  const [language, setLanguage] = useState("fi");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);
  useEffect(() => { fetch("/api/business/leads", { cache: "no-store" }).then((response) => response.json()).then((data) => setLeads(Array.isArray(data.leads) ? data.leads : [])).catch(() => {}); }, []);
  const selected = leads.find((lead) => lead.id === leadId);
  useEffect(() => { if (selected) setContext([`Category: ${selected.category}`, `Website: ${selected.website}`, `Email: ${selected.email}`, `Phone: ${selected.phone}`, selected.siteNotes, selected.notes].filter(Boolean).join("\n")); }, [selected]);
  async function generate() {
    setRunning(true); setStatus("Generating...");
    try {
      const response = await fetch("/api/business/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, language, company: selected?.name || "", context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setResult(data.text || "");
      setStatus(data.usedAi ? "Claude improved the built-in result." : data.warning || "Built-in result used.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Generation failed"); }
    finally { setRunning(false); }
  }
  return <div className="ops-two-column">
    <section className="panel stack"><p className="badge">OPTIONAL ASSISTANT</p><h2>Claude-backed drafting</h2><p className="muted">Core business tools do not depend on Claude. When the API is missing, slow or unavailable, this tool returns a built-in draft instead of crashing.</p>
      <label className="stack small">Company<select value={leadId} onChange={(event) => setLeadId(event.target.value)}><option value="">No company selected</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</select></label>
      <label className="stack small">Task<select value={task} onChange={(event) => setTask(event.target.value)}><option value="lead-summary">lead summary</option><option value="outreach">personalised outreach</option><option value="proposal">proposal draft</option><option value="client-reply">client reply</option><option value="website-copy">website copy</option></select></label>
      <label className="stack small">Language<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="fi">Finnish</option><option value="en">English</option></select></label>
      <label className="stack small">Verified context<textarea rows={12} value={context} onChange={(event) => setContext(event.target.value)} /></label>
      <button onClick={generate} disabled={running}>{running ? "working..." : "create safe draft"}</button><p className="muted small">{status}</p>
    </section>
    <section className="panel stack"><div className="spread"><h2>Editable result</h2><button onClick={() => navigator.clipboard.writeText(result)} disabled={!result}>copy</button></div><textarea className="ai-result" rows={30} value={result} onChange={(event) => setResult(event.target.value)} placeholder="The result will appear here."/><p className="muted small">Always verify names, prices, legal statements and audit findings before sending.</p></section>
  </div>;
}
