"use client";

import Link from "next/link";
import BusinessOperationsClient from "@/app/business/BusinessOperationsClient";

export default function EmailClient({ username }: { username: string }) {
  return <div className="stack"><section className="panel spread"><div><p className="badge">ADMIN EMAIL</p><h1 className="terminal-title">Inbox and outreach</h1><p className="muted">Read received Gmail, open full threads and attachments, reply, archive, and connect conversations to CRM companies.</p></div><Link className="buttonlike" href="/business?section=inbox">open inside business suite</Link></section><BusinessOperationsClient section="inbox" username={username} /></div>;
}
