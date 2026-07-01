import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Dashboard",
  description: "Custom read-only dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">private viewport</Link>
          <nav>
            <Link href="/chan">4chan</Link>
            <Link href="/dreamviews">DreamViews</Link>
            <Link href="/movies">Movies</Link>
            <Link href="/youtube">YouTube</Link>
            <Link href="/llm">LLM</Link>
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
