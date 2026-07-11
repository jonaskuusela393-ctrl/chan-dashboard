import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "user") redirect("/chat");

  const showDev = devWorkspaceEnabled();

  const modules = [
    { key: "chan" as const, href: "/chan", badge: "4CHAN", title: "Read-only viewport", text: "Browse boards, open threads, hide threads/replies, and disable boards by timer." },
    { key: "reddit" as const, href: "/reddit", badge: "REDDIT", title: "Forum viewport", text: "Browse subreddits, comments, permanent hides, and timed subreddit disables." },
    { key: "youtube" as const, href: "/youtube", badge: "YOUTUBE", title: "Text browser", text: "No thumbnails. Search, details, optional player only after button press." },
    { key: "business" as const, href: "/business", badge: "MONEY", title: "Local business money dashboard", text: "Lead finder, audits, offer builder, pitch generator, demo pages, CRM, templates, content, and money tracking." },
    { key: "game" as const, href: "/game", badge: "GAME", title: "Halo: Earth Command", text: "Earth-first grand strategy simulation with strategic, street, orbital, resource, research, production, diplomacy, unit and canon-event systems." },
    { key: "email" as const, href: "/email", badge: "EMAIL", title: "Outreach console", text: "Create personalized website-offer emails, open mailto, or send through optional Resend API." },
    { key: "dev" as const, href: "/dev", badge: "DEV", title: "Mobile coding workspace", text: "Local-only file explorer, editor, terminal command buttons, build log helper, and project ZIP export." },
    { key: "chat" as const, href: "/chat", badge: "CHAT", title: "Private chat", text: "Two accounts, online lamps, incremental updates, and private Vercel Blob media storage." },
  ];

  return (
    <div className="stack">
      <section className="panel stack hero-grid">
        <div className="stack">
          <p className="badge">ADMIN ONLINE</p>
          <h1>Black terminal command center</h1>
          <p className="muted">
            Signed in as {session.username}. User 2 can only see chat; admin gets browsing,
            local business money modules, email outreach, and the phone coding workspace.
          </p>
          <div className="row">
            <Link className="buttonlike" href="/business">open money dashboard</Link>
            <Link className="buttonlike" href="/game">open Earth Command</Link>
            {showDev && <Link className="buttonlike" href="/dev">open dev workspace</Link>}
            <Link className="buttonlike" href="/chat">open chat</Link>
          </div>
        </div>
        <div className="mini-radar" aria-hidden="true">
          <div className="radar-globe" />
          <p className="small muted">LOCAL CLIENT RADAR // ADMIN MODULES ACTIVE</p>
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
