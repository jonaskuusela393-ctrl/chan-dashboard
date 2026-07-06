import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="stack">
      <section className="panel stack">
        <p className="badge">ONLINE</p>
        <h1>Black terminal viewport</h1>
        <p className="muted">Signed in as {session.username}. 4chan, Reddit, YouTube, and the private two-person chat are included.</p>
        <div className="row">
          <Link className="buttonlike" href="/chan">open 4chan</Link>
          <Link className="buttonlike" href="/reddit">open Reddit</Link>
          <Link className="buttonlike" href="/youtube">open YouTube</Link>
          <Link className="buttonlike" href="/chat">open chat</Link>
        </div>
      </section>
      <section className="grid">
        <Link className="card stack" href="/chan"><span className="badge">4CHAN</span><h2>Read-only viewport</h2><p className="muted">Per-user deleted threads/replies and board disable timers: 1 day, 7 days, 30 days, permanent.</p></Link>
        <Link className="card stack" href="/reddit"><span className="badge">REDDIT</span><h2>Read-only forum viewport</h2><p className="muted">Browse subreddits, open comments, hide posts/comments forever, and disable subreddits by timer.</p></Link>
        <Link className="card stack" href="/youtube"><span className="badge">YOUTUBE</span><h2>Text browser</h2><p className="muted">No thumbnails. Search, details, optional player only after button press.</p></Link>
        <Link className="card stack" href="/chat"><span className="badge">CHAT</span><h2>Private chat</h2><p className="muted">Two accounts, online lamps, terminal-style notifs, small image/gif/video uploads stored in Neon.</p></Link>
      </section>
    </div>
  );
}
