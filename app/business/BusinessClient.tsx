"use client";

import { useEffect, useState } from "react";
import LeadFinderClient from "./LeadFinderClient";
import BusinessOperationsClient, { type BusinessSection } from "./BusinessOperationsClient";

type Section = "finder" | BusinessSection;
const sections: Array<{ key: Section; label: string; description: string }> = [
  { key: "finder", label: "lead finder", description: "search, terminal map, scanning, old offers, demos and content tools" },
  { key: "pipeline", label: "pipeline", description: "kanban CRM, notes, tasks and follow-ups" },
  { key: "contacts", label: "contacts", description: "multiple emails, phones, forms and social profiles per company" },
  { key: "inbox", label: "email inbox", description: "read Gmail threads, attachments, reply, archive and connect replies to companies" },
  { key: "sms", label: "text messages", description: "send SMS, receive replies and track delivery" },
  { key: "audits", label: "full audits", description: "PageSpeed, SEO, accessibility, broken links and downloadable reports" },
  { key: "proposals", label: "proposals", description: "line items, deposits, revisions, delivery terms and invoices" },
  { key: "inquiries", label: "site inquiries", description: "store contact-form submissions from customer websites" },
  { key: "money", label: "money", description: "payments, invoices, expenses, recurring revenue and conversion rates" },
  { key: "setup", label: "setup", description: "connections, webhooks and search history" },
];

function initialSection(): Section {
  if (typeof window === "undefined") return "finder";
  const value = new URLSearchParams(window.location.search).get("section") as Section | null;
  return sections.some((item) => item.key === value) ? value! : "finder";
}

export default function BusinessClient({ username }: { username: string }) {
  const [section, setSection] = useState<Section>("finder");
  useEffect(() => { setSection(initialSection()); }, []);
  function change(next: Section) {
    setSection(next);
    const url = new URL(window.location.href);
    if (next === "finder") url.searchParams.delete("section"); else url.searchParams.set("section", next);
    window.history.replaceState({}, "", url);
  }
  const active = sections.find((item) => item.key === section) || sections[0];
  return <div className="stack">
    <section className="panel stack business-command-header">
      <div className="spread"><div><p className="badge">BUSINESS COMMAND</p><h1 className="terminal-title">Client acquisition and website operations</h1><p className="muted">Find companies, discover every available contact path, read replies, follow up, build proposals, receive website inquiries, and track actual money.</p></div><div className="ops-status-orb" aria-hidden="true"><span /></div></div>
      <div className="module-tabs business-suite-tabs">{sections.map((item) => <button key={item.key} className={section === item.key ? "active-btn" : ""} onClick={() => change(item.key)}>{item.label}</button>)}</div>
      <p className="muted small"><strong>{active.label}:</strong> {active.description}</p>
    </section>
    {section === "finder" ? <LeadFinderClient username={username} /> : <BusinessOperationsClient section={section} username={username} />}
  </div>;
}
