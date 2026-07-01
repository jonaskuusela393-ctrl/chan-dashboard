import Link from "next/link";

const modules = [
  { href: "/chan", title: "4chan viewport", desc: "Read-only catalog/thread viewer with hide buttons and clickable image links." },
  { href: "/dreamviews", title: "DreamViews viewport", desc: "Read-only forum/thread browser with permanent Neon deletes." },
  { href: "/movies", title: "Local movie player", desc: "Works only when the local movie server is running on this PC." },
  { href: "/youtube", title: "YouTube text browser", desc: "Search and browse YouTube results as text only, with no thumbnails." },
  { href: "/llm", title: "LLM", desc: "Vercel API route using your Gemini API key." }
];

export default function Home() {
  return (
    <div className="stack">
      <h1>Private dashboard</h1>
      <p className="muted">Clean rebuild. No login, no posting, no accounts. Neon-backed permanent deletes.</p>
      <div className="grid">
        {modules.map((m) => (
          <Link href={m.href} className="card" key={m.href}>
            <h2>{m.title}</h2>
            <p className="muted">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
