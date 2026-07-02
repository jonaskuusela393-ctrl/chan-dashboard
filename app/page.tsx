import Link from "next/link";

const modules = [
  {
    href: "/chan",
    title: "4chan viewport",
    status: "Read-only",
    desc: "Catalog and thread viewer. Permanent Neon deletes. Images only open when you click the file button.",
    tags: ["catalog", "threads", "permanent delete"],
  },
  {
    href: "/dreamviews",
    title: "DreamViews viewport",
    status: "Read-only",
    desc: "Forum and thread browser. Text-focused layout with permanent Neon deletes.",
    tags: ["forums", "threads", "text only"],
  },
  {
    href: "/movies",
    title: "Local movie player",
    status: "PC required",
    desc: "Plays files from your local movie folder when the PC movie server is running.",
    tags: ["local files", "subtitles", "fullscreen"],
  },
  {
    href: "/youtube",
    title: "YouTube text browser",
    status: "API key required",
    desc: "Search and browse YouTube as text only. No thumbnails, no image feed.",
    tags: ["search", "text only", "no thumbnails"],
  },
  {
    href: "/llm",
    title: "Local LLM",
    status: "PC tunnel required",
    desc: "Uses your PC model through a secure tunnel. Works anywhere while your PC bridge is on.",
    tags: ["Ollama", "local model", "free"],
  },
];

export default function Home() {
  return (
    <div className="stack">
      <section className="panel">
        <p className="badge">PRIVATE VIEWPORT</p>

        <h1>Private dashboard</h1>

        <p className="muted">
          Clean read-only control panel. No posting, no accounts, no login system
          inside the modules. Permanent hides/deletes are stored in Neon.
        </p>

        <div className="row" style={{ marginTop: 12 }}>
          <Link href="/chan" className="buttonlike">
            open 4chan
          </Link>
          <Link href="/dreamviews" className="buttonlike">
            open DreamViews
          </Link>
          <Link href="/movies" className="buttonlike">
            open Movies
          </Link>
        </div>
      </section>

      <section className="grid">
        {modules.map((module) => (
          <Link href={module.href} className="card stack" key={module.href}>
            <div className="spread">
              <h2>{module.title}</h2>
              <span className="badge">{module.status}</span>
            </div>

            <p className="muted">{module.desc}</p>

            <div className="row">
              {module.tags.map((tag) => (
                <span className="badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      <section className="panel stack">
        <h2>System notes</h2>

        <div className="grid">
          <div>
            <h3>Neon deletes</h3>
            <p className="muted">
              4chan and DreamViews deleted items are hidden through the database,
              not browser localStorage.
            </p>
          </div>

          <div>
            <h3>Movies</h3>
            <p className="muted">
              The Vercel page can open anywhere, but local movie files only work
              from a browser that can reach your PC movie server.
            </p>
          </div>

          <div>
            <h3>Local LLM</h3>
            <p className="muted">
              The LLM is free/local when Ollama, the bridge, and the tunnel are
              running on your PC.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}