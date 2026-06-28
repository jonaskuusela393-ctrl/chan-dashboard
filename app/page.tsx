import Link from "next/link";
import BackButton from "@/components/BackButton";

const modules = [
  {
    href: "/4chan",
    title: "4chan viewer",
    description: "Boards, threads, hidden posts, personal viewport.",
    icon: "→",
  },
  {
    href: "/strim",
    title: "Stream / Kick module",
    description: "Streaming dashboard module.",
    icon: "🎮",
  },
  {
    href: "/chatgpt",
    title: "ChatGPT Terminal",
    description: "Private custom AI terminal inside the dashboard.",
    icon: "▣",
  },
];

export default function Home() {
  return (
    <div className="container">
      <BackButton />

      <h1>My Dashboard 🎉</h1>

      <p className="muted">Select a module to continue</p>

      <div className="module-grid">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className="module-card">
            <div className="module-title">
              <span>{module.icon}</span>
              <span>{module.title}</span>
            </div>

            <p className="module-description">{module.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}