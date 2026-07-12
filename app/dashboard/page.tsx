import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";

export const metadata = {
  title: "Operations Dashboard",
  description: "Private operations dashboard for website sales, email, chat and development.",
};

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "user") redirect("/chat");

  const showDev = devWorkspaceEnabled();
  const modules = [
    { key: "business" as const, href: "/business", badge: "BUSINESS", title: "Website sales command", text: "Find leads, scan contacts, audit websites, read replies, send SMS, manage proposals, inquiries and revenue." },
    { key: "email" as const, href: "/email", badge: "INBOX", title: "Email and outreach", text: "Read Gmail conversations, reply, send outreach and connect communication to CRM companies." },
    { key: "youtube" as const, href: "/youtube", badge: "YOUTUBE", title: "Text-first research", text: "Search videos without thumbnails and open the player only when needed." },
    { key: "chat" as const, href: "/chat", badge: "CHAT", title: "Private chat", text: "Two accounts, online status, incremental updates and private Vercel Blob attachments." },
    { key: "dev" as const, href: "/dev", badge: "DEV", title: "Local development workspace", text: "Local-only project files, build tools, logs and ZIP export. Disabled on Vercel production." },
  ];

  return (
    <div className="stack">
      <section className="panel stack hero-grid">
        <div className="stack">
          <p className="badge">PRIVATE OPERATIONS</p>
          <h1>Website service command center</h1>
          <p className="muted">Signed in as {session.username}. Public visitors see the service landing page; this private area manages leads, communication, delivery and revenue.</p>
          <div className="row">
            <Link className="buttonlike" href="/business">open business command</Link>
            <Link className="buttonlike" href="/">view public website</Link>
            <Link className="buttonlike" href="/chat">open chat</Link>
          </div>
        </div>
        <div className="mini-radar" aria-hidden="true">
          <div className="radar-globe" />
          <p className="small muted">PUBLIC LEADS → CRM → PROPOSAL → BUILD → CARE</p>
        </div>
      </section>
      <section className="grid">
        {modules.filter((item) => canAccess(session, item.key) && (item.key !== "dev" || showDev)).map((item) => (
          <Link className="card stack" href={item.href} key={item.href}>
            <span className="badge">{item.badge}</span>
            <h2>{item.title}</h2>
            <p className="muted">{item.text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
