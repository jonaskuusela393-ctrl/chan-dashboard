"use client";

import { useEffect, useMemo, useState } from "react";
import LeadFinderClient from "./LeadFinderClient";
import BusinessOperationsClient, { type BusinessSection } from "./BusinessOperationsClient";
import ClientManagementClient from "./ClientManagementClient";
import ClaudeAssistantClient from "./ClaudeAssistantClient";

type Section = "finder" | "clients" | "assistant" | BusinessSection;
type Group = "Find and sell" | "Communicate" | "Deliver" | "Control";
type Item = { key: Section; label: string; short: string; description: string; group: Group; icon: string };

const sections: Item[] = [
  { key: "finder", label: "Lead finder", short: "Find", description: "Search companies, use the green map, scan contact paths and prepare a first approach.", group: "Find and sell", icon: "◎" },
  { key: "pipeline", label: "Sales pipeline", short: "Pipeline", description: "Move companies from new lead to contacted, proposal, won or lost and keep follow-up tasks visible.", group: "Find and sell", icon: "⇢" },
  { key: "contacts", label: "Contact records", short: "Contacts", description: "Store every email, phone number, form, booking link and social profile with its source and confidence.", group: "Find and sell", icon: "@" },
  { key: "inbox", label: "Email inbox", short: "Inbox", description: "Read Gmail conversations, open attachments, reply and connect each thread to the correct company.", group: "Communicate", icon: "✉" },
  { key: "sms", label: "Text messages", short: "SMS", description: "Send permitted SMS messages, receive replies and track delivery in the company timeline.", group: "Communicate", icon: "▤" },
  { key: "clients", label: "Client websites", short: "Clients", description: "Track live status, ownership, maintenance, customer requests and the complete history of each website.", group: "Deliver", icon: "▣" },
  { key: "audits", label: "Website audits", short: "Audits", description: "Review speed, accessibility, search basics, broken links and visible business problems.", group: "Deliver", icon: "✓" },
  { key: "proposals", label: "Proposals and invoices", short: "Proposals", description: "Create project-specific line items, deposits, revisions, delivery terms and invoices.", group: "Deliver", icon: "€" },
  { key: "inquiries", label: "Website inquiries", short: "Inquiries", description: "Read contact and quote requests delivered from client websites and connect them to the right customer.", group: "Deliver", icon: "↳" },
  { key: "money", label: "Finance overview", short: "Finance", description: "Track quoted work, paid income, expenses, recurring revenue and overdue invoices.", group: "Control", icon: "◫" },
  { key: "assistant", label: "Writing assistant", short: "Assistant", description: "Create optional Claude-improved drafts with a reliable built-in fallback when AI is unavailable.", group: "Control", icon: "✦" },
  { key: "setup", label: "Connections and setup", short: "Setup", description: "Check Gmail, SMS, search, audit and webhook configuration and review saved search runs.", group: "Control", icon: "⚙" },
];

function initialSection(): Section {
  if (typeof window === "undefined") return "finder";
  const value = new URLSearchParams(window.location.search).get("section") as Section | null;
  return sections.some((item) => item.key === value) ? value! : "finder";
}

export default function BusinessClient({ username }: { username: string }) {
  const [section, setSection] = useState<Section>("finder");
  useEffect(() => setSection(initialSection()), []);
  const grouped = useMemo(() => (["Find and sell", "Communicate", "Deliver", "Control"] as Group[]).map((group) => ({ group, items: sections.filter((item) => item.group === group) })), []);
  const active = sections.find((item) => item.key === section) || sections[0];

  function change(next: Section) {
    setSection(next);
    const url = new URL(window.location.href);
    if (next === "finder") url.searchParams.delete("section"); else url.searchParams.set("section", next);
    window.history.replaceState({}, "", url);
  }

  return <div className="business-page stack">
    <section className="business-command-header">
      <div className="business-header-copy"><p className="eyebrow">BUSINESS OPERATIONS</p><h1>One workspace for finding clients and running every website project.</h1><p>Signed in as {username}. Leads, communication, delivery, support and money remain connected to the same company record.</p></div>
      <div className="business-system-status"><span className="status-dot online"/><div><small>SYSTEM STATUS</small><strong>Core tools available</strong><p>AI features are optional and never control essential functions.</p></div></div>
    </section>

    <section className="business-navigation" aria-label="Business tools">
      {grouped.map(({ group, items }) => <div className="business-nav-group" key={group}><span>{group}</span><div>{items.map((item) => <button key={item.key} type="button" className={section === item.key ? "active" : ""} onClick={() => change(item.key)} title={item.description}><b>{item.icon}</b><em>{item.short}</em></button>)}</div></div>)}
    </section>

    <section className="active-tool-banner"><div><span className="active-tool-icon">{active.icon}</span><div><small>{active.group.toUpperCase()}</small><h2>{active.label}</h2><p>{active.description}</p></div></div></section>

    <div className="business-tool-content">
      {section === "finder" ? <LeadFinderClient username={username}/> : section === "clients" ? <ClientManagementClient/> : section === "assistant" ? <ClaudeAssistantClient/> : <BusinessOperationsClient section={section} username={username}/>} 
    </div>
  </div>;
}
