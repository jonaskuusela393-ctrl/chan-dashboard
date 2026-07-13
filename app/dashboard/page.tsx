import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";

export const metadata = {
  title: "Operations overview",
  description: "Private operations dashboard for leads, clients, communication and website delivery.",
  robots: { index: false, follow: false },
};

const modules = [
  { key: "business" as const, href: "/business", icon: "◎", eyebrow: "SALES + DELIVERY", title: "Business operations", text: "Find leads, audit websites, manage the pipeline, send proposals, track client sites and record revenue.", action: "Open business operations" },
  { key: "email" as const, href: "/email", icon: "✉", eyebrow: "COMMUNICATION", title: "Email inbox", text: "Read Gmail threads, reply, open attachments and connect conversations to the correct company record.", action: "Open inbox" },
  { key: "chat" as const, href: "/chat", icon: "▣", eyebrow: "PRIVATE", title: "Team chat", text: "Private two-account messaging with presence, incremental updates and protected file attachments.", action: "Open chat" },
  { key: "youtube" as const, href: "/personal", icon: "◉", eyebrow: "ADMIN ONLY", title: "Personal tools", text: "Private YouTube and 4chan viewers kept separate from customer work and business operations.", action: "Open personal tools" },
  { key: "dev" as const, href: "/dev", icon: "⌘", eyebrow: "LOCAL ONLY", title: "Development workspace", text: "Project files, builds, logs and ZIP exports. Automatically unavailable on Vercel production.", action: "Open workspace" },
];

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "user") redirect("/chat");
  const showDev = devWorkspaceEnabled();
  const visible = modules.filter((item) => canAccess(session, item.key) && (item.key !== "dev" || showDev));

  return <div className="dashboard-page stack">
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy"><p className="eyebrow">PRIVATE OPERATIONS</p><h1>Everything needed to find, build and manage client websites.</h1><p>Public visitors see a professional service website. This private area keeps leads, messages, projects, ownership, support requests and money connected.</p><div className="public-actions"><Link className="public-primary" href="/business">Open business operations</Link><Link className="public-secondary" href="/">View public website</Link></div></div>
      <div className="operations-flow" aria-label="Business workflow"><div><span>01</span><strong>Find</strong><small>business leads</small></div><i>→</i><div><span>02</span><strong>Win</strong><small>proposal and reply</small></div><i>→</i><div><span>03</span><strong>Build</strong><small>website delivery</small></div><i>→</i><div><span>04</span><strong>Care</strong><small>support and revenue</small></div></div>
    </section>

    <section className="dashboard-summary" aria-label="Session information"><div><span className="status-dot online"/><p><small>SESSION</small><strong>{session.username}</strong></p></div><div><span className="status-dot online"/><p><small>ACCESS</small><strong>Administrator</strong></p></div><div><span className="status-dot neutral"/><p><small>PUBLIC SITE</small><strong>Separate from operations</strong></p></div></section>

    <section className="module-grid">{visible.map((item) => <Link className="module-card" href={item.href} key={item.href}><div className="module-card-top"><span className="module-icon">{item.icon}</span><span className="eyebrow">{item.eyebrow}</span></div><h2>{item.title}</h2><p>{item.text}</p><span className="module-action">{item.action}<b>→</b></span></Link>)}</section>
  </div>;
}
